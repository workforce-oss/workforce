/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controller

import (
	"context"
	"k8s.io/apimachinery/pkg/api/resource"
	"os"
	"time"

	"istio.io/api/networking/v1alpha3"
	istio "istio.io/client-go/pkg/apis/networking/v1alpha3"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/intstr"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	toolsv1alpha1 "github.com/workforce-oss/workforce-vscode/api/v1alpha1"
)

// VsCodeReconciler reconciles a VsCode object
type VsCodeReconciler struct {
	client.Client

	Scheme *runtime.Scheme
}

//+kubebuilder:rbac:groups=tools.robot.dev,resources=vscodes,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=tools.robot.dev,resources=vscodes/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=tools.robot.dev,resources=vscodes/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the VsCode object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *VsCodeReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	log := log.FromContext(ctx)

	vscode := &toolsv1alpha1.VsCode{}

	// Get the custom resource
	err := r.Get(ctx, req.NamespacedName, vscode)
	if err != nil {
		if apierrors.IsNotFound(err) {
			// If the custom resource is not found then, it usually means that it was deleted or not created
			// In this way, we will stop the reconciliation
			log.Info("vscode resource not found. Ignoring since object must be deleted")
			return ctrl.Result{}, nil
		}
		// Error reading the object - requeue the request.
		log.Error(err, "Failed to get vscode")
		return ctrl.Result{}, err
	}

	// Get env var "ISTIO_INGRESS_GATEWAY"
	istioIngressGatewayReference, istioEnabled := os.LookupEnv("ISTIO_INGRESS_GATEWAY")
	log.Info("Istio Ingress Gateway Reference", "Reference", istioIngressGatewayReference)
	// Get the image from the environment variables
	image, imageFound := os.LookupEnv("VS_CODE_IMAGE")

	if !imageFound {
		log.Error(err, "Failed to get the image from the environment variables")
		return ctrl.Result{}, err
	}

	rootDomain, rootDomainFound := os.LookupEnv("ROOT_DOMAIN")

	if !rootDomainFound {
		log.Error(err, "Failed to get the root domain from the environment variables")
		return ctrl.Result{}, err
	}

	// Set config vars

	podName := "pod"
	secretName := "secret"

	foundSecret := &corev1.Secret{}
	err = r.Get(ctx, client.ObjectKey{Namespace: vscode.Namespace, Name: secretName}, foundSecret)
	if err != nil && apierrors.IsNotFound(err) {
		// error, secret needs to already exist
		log.Error(err, "Failed to get secret '"+secretName+"'")
		return ctrl.Result{}, err
	}

	log.Info("Secret found", "Secret.Namespace", foundSecret.Namespace, "Secret.Name", foundSecret.Name)

	uiServiceName := "ui"
	uiServicePort := 80
	uiServiceTargetPort := 3000
	uiServicePortName := "http-ui"

	apiServiceName := "api"
	apiServicePort := 80
	apiServiceTargetPort := 3190
	apiServicePortName := "http-api"

	istioVirtualServiceName := "vscode"
	istioVirtualServicePath := "/tools/" + vscode.Spec.OrgId + "/" + vscode.Spec.TaskExecutionId + "/code"

	serverBasePath := istioVirtualServicePath

	istioDestinationRuleName := "vscode"

	// Check if the pod already exists
	foundPod := &corev1.Pod{}
	err = r.Get(ctx, client.ObjectKey{Namespace: vscode.Namespace, Name: podName}, foundPod)
	if err != nil && apierrors.IsNotFound(err) {
		// Define a new pod
		pod := &corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{
				Name:      podName,
				Namespace: vscode.Namespace,
				Labels:    map[string]string{"app": podName},
			},
			Spec: corev1.PodSpec{
				Containers: []corev1.Container{
					{
						Resources: corev1.ResourceRequirements{
							Limits: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("1"),
								corev1.ResourceMemory: resource.MustParse("2Gi"),
							},
							Requests: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("0.5"),
								corev1.ResourceMemory: resource.MustParse("1Gi"),
							},
						},
						Name:  "vscode",
						Image: image,
						Command: []string{
							"/startup.sh",
						},
						Args: []string{
							"--server-base-path",
							serverBasePath,
						},
						EnvFrom: []corev1.EnvFromSource{
							{
								SecretRef: &corev1.SecretEnvSource{
									LocalObjectReference: corev1.LocalObjectReference{
										Name: secretName,
									},
								},
							},
						},
						ReadinessProbe: &corev1.Probe{
							ProbeHandler: corev1.ProbeHandler{
								HTTPGet: &corev1.HTTPGetAction{
									Path: "/api/healthz",
									Port: intstr.FromInt(apiServiceTargetPort),
								},
							},
							InitialDelaySeconds: 30,
							TimeoutSeconds:      5,
							PeriodSeconds:       5,
							SuccessThreshold:    1,
							FailureThreshold:    120,
						},
						LivenessProbe: &corev1.Probe{
							ProbeHandler: corev1.ProbeHandler{
								HTTPGet: &corev1.HTTPGetAction{
									Path: "/api/healthz",
									Port: intstr.FromInt32(int32(apiServiceTargetPort)),
								},
							},
							InitialDelaySeconds: 30,
							TimeoutSeconds:      5,
							PeriodSeconds:       5,
							SuccessThreshold:    1,
							FailureThreshold:    120,
						},
						Ports: []corev1.ContainerPort{
							{
								Name:          uiServicePortName,
								ContainerPort: int32(uiServiceTargetPort),
							},
							{
								Name:          apiServicePortName,
								ContainerPort: int32(apiServiceTargetPort),
							},
						},
					},
				},
			},
		}
		//if istioEnabled {
		//	pod.ObjectMeta.Labels["sidecar.istio.io/inject"] = "true"
		//}
		// Set the owner and controller
		if err := ctrl.SetControllerReference(vscode, pod, r.Scheme); err != nil {
			log.Error(err, "Failed to set owner reference on Pod")
			return ctrl.Result{}, err
		}
		log.Info("Creating a new Pod", "Pod.Namespace", pod.Namespace, "Pod.Name", pod.Name)
		err = r.Create(ctx, pod)
		if err != nil {
			log.Error(err, "Failed to create new Pod", "Pod.Namespace", pod.Namespace, "Pod.Name", pod.Name)
			return ctrl.Result{}, err
		}
		// Pod created successfully - return and requeue
		return ctrl.Result{RequeueAfter: time.Second * 30}, nil
	} else if err != nil {
		log.Error(err, "Failed to get Pod")
		return ctrl.Result{}, err
	}

	// Check if UI service already exists
	foundUIService := &corev1.Service{}
	err = r.Get(ctx, client.ObjectKey{Namespace: vscode.Namespace, Name: uiServiceName}, foundUIService)
	if err != nil && apierrors.IsNotFound(err) {
		// Define a new UI service
		uiService := &corev1.Service{
			ObjectMeta: metav1.ObjectMeta{
				Name:      uiServiceName,
				Namespace: vscode.Namespace,
				Labels:    map[string]string{"app": uiServiceName},
			},
			Spec: corev1.ServiceSpec{
				Ports: []corev1.ServicePort{
					{
						Name:       "http",
						Port:       int32(uiServicePort),
						TargetPort: intstr.FromInt(uiServiceTargetPort),
					},
				},
				Selector: map[string]string{"app": podName},
			},
		}
		// Set the owner and controller
		if err := ctrl.SetControllerReference(vscode, uiService, r.Scheme); err != nil {
			log.Error(err, "Failed to set owner reference on UI Service")
			return ctrl.Result{}, err
		}

		log.Info("Creating a new UI Service", "Service.Namespace", uiService.Namespace, "Service.Name", uiService.Name)
		err = r.Create(ctx, uiService)
		if err != nil {
			log.Error(err, "Failed to create new UI Service", "Service.Namespace", uiService.Namespace, "Service.Name", uiService.Name)
			return ctrl.Result{}, err
		}
		// Service created successfully - return and requeue
		return ctrl.Result{Requeue: true}, nil
	} else if err != nil {
		log.Error(err, "Failed to get UI Service")
		return ctrl.Result{}, err
	}

	// Check if API service already exists
	foundAPIService := &corev1.Service{}
	err = r.Get(ctx, client.ObjectKey{Namespace: vscode.Namespace, Name: apiServiceName}, foundAPIService)
	if err != nil && apierrors.IsNotFound(err) {
		// Define a new API service
		apiService := &corev1.Service{
			ObjectMeta: metav1.ObjectMeta{
				Name:      apiServiceName,
				Namespace: vscode.Namespace,
				Labels:    map[string]string{"app": apiServiceName},
			},
			Spec: corev1.ServiceSpec{
				Ports: []corev1.ServicePort{
					{
						Name:       "http",
						Port:       int32(apiServicePort),
						TargetPort: intstr.FromInt(apiServiceTargetPort),
					},
				},
				Selector: map[string]string{"app": podName},
			},
		}
		// Set the owner and controller
		if err := ctrl.SetControllerReference(vscode, apiService, r.Scheme); err != nil {
			log.Error(err, "Failed to set owner reference on API Service")
			return ctrl.Result{}, err
		}
		log.Info("Creating a new API Service", "Service.Namespace", apiService.Namespace, "Service.Name", apiService.Name)
		err = r.Create(ctx, apiService)
		if err != nil {
			log.Error(err, "Failed to create new API Service", "Service.Namespace", apiService.Namespace, "Service.Name", apiService.Name)
			return ctrl.Result{}, err
		}
		// Service created successfully - return and requeue
		return ctrl.Result{Requeue: true}, nil
	} else if err != nil {
		log.Error(err, "Failed to get API Service")
		return ctrl.Result{}, err
	}

	if istioEnabled {
		log.Info("Istio is enabled")
		// Check if Istio Virtual Service already exists
		foundIstioVirtualService := &istio.VirtualService{}
		err = r.Get(ctx, client.ObjectKey{Namespace: vscode.Namespace, Name: istioVirtualServiceName}, foundIstioVirtualService)
		if err != nil && apierrors.IsNotFound(err) {
			log.Info("Istio Virtual Service not found", "VirtualService.Namespace", vscode.Namespace, "VirtualService.Name", istioVirtualServiceName)
			// Define a new Istio Virtual Service
			istioVirtualService := &istio.VirtualService{
				ObjectMeta: metav1.ObjectMeta{
					Name:      istioVirtualServiceName,
					Namespace: vscode.Namespace,
				},
				Spec: v1alpha3.VirtualService{
					Hosts: []string{rootDomain},
					Gateways: []string{
						istioIngressGatewayReference,
					},
					Http: []*v1alpha3.HTTPRoute{
						{
							Match: []*v1alpha3.HTTPMatchRequest{
								{
									Uri: &v1alpha3.StringMatch{
										MatchType: &v1alpha3.StringMatch_Prefix{
											Prefix: istioVirtualServicePath,
										},
									},
								},
							},
							Route: []*v1alpha3.HTTPRouteDestination{
								{
									Destination: &v1alpha3.Destination{
										Host: uiServiceName + "." + vscode.Namespace + ".svc.cluster.local",
										Port: &v1alpha3.PortSelector{
											Number: uint32(uiServicePort),
										},
									},
								},
							},
						},
					},
				},
			}
			// Set the owner and controller
			if err := ctrl.SetControllerReference(vscode, istioVirtualService, r.Scheme); err != nil {
				log.Error(err, "Failed to set owner reference on Istio Virtual Service")
				return ctrl.Result{}, err
			}
			log.Info("Creating a new Istio Virtual Service", "VirtualService.Namespace", istioVirtualService.Namespace, "VirtualService.Name", istioVirtualService.Name)
			err = r.Create(ctx, istioVirtualService)
			if err != nil {
				log.Error(err, "Failed to create new Istio Virtual Service", "VirtualService.Namespace", istioVirtualService.Namespace, "VirtualService.Name", istioVirtualService.Name)
				return ctrl.Result{}, err
			}
			// Virtual Service created successfully - return and requeue
			return ctrl.Result{Requeue: true}, nil
		}

		// Check if Istio Destination Rule already exists
		foundIstioDestinationRule := &istio.DestinationRule{}
		err = r.Get(ctx, client.ObjectKey{Namespace: vscode.Namespace, Name: istioDestinationRuleName}, foundIstioDestinationRule)
		if err != nil && apierrors.IsNotFound(err) {
			// Define a new Istio Destination Rule
			istioDestinationRule := &istio.DestinationRule{
				ObjectMeta: metav1.ObjectMeta{
					Name:      istioDestinationRuleName,
					Namespace: vscode.Namespace,
				},
				Spec: v1alpha3.DestinationRule{
					Host: uiServiceName + "." + vscode.Namespace + ".svc.cluster.local",
					TrafficPolicy: &v1alpha3.TrafficPolicy{
						Tls: &v1alpha3.ClientTLSSettings{
							Mode: *v1alpha3.ClientTLSSettings_DISABLE.Enum(),
						},
					},
				},
			}
			// Set the owner and controller
			if err := ctrl.SetControllerReference(vscode, istioDestinationRule, r.Scheme); err != nil {
				log.Error(err, "Failed to set owner reference on Istio Destination Rule")
				return ctrl.Result{}, err
			}
			log.Info("Creating a new Istio Destination Rule", "DestinationRule.Namespace", istioDestinationRule.Namespace, "DestinationRule.Name", istioDestinationRule.Name)
			err = r.Create(ctx, istioDestinationRule)
			if err != nil {
				log.Error(err, "Failed to create new Istio Destination Rule", "DestinationRule.Namespace", istioDestinationRule.Namespace, "DestinationRule.Name", istioDestinationRule.Name)
				return ctrl.Result{}, err
			}
			// Destination Rule created successfully - return and requeue
			return ctrl.Result{Requeue: true}, nil
		}

	} else {
		log.Info("Istio is not enabled")
	}

	return ctrl.Result{RequeueAfter: 30 * time.Second}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *VsCodeReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&toolsv1alpha1.VsCode{}).
		Complete(r)
}
