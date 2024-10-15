locals {
  repository = "https://l7mp.io/stunner"
}

resource "kubernetes_namespace" "stunner" {
  metadata {
    name = "stunner"
  }
}

resource "helm_release" "gateway-operator" {
  name             = "stunner-gateway-operator"
  repository       = local.repository
  chart            = "stunner-gateway-operator"
  namespace        = kubernetes_namespace.stunner.metadata[0].name
  create_namespace = false
#   values = [
#     file("${path.module}/values.yaml")
#   ]
}

resource "helm_release" "stunner" {
    name             = "stunner"
    repository       = local.repository
    chart            = "stunner"
    namespace        = kubernetes_namespace.stunner.metadata[0].name
    create_namespace = false

    depends_on = [helm_release.gateway-operator]
}

resource "kubernetes_manifest" "gateway_class" {
    manifest = {
        apiVersion = "gateway.networking.k8s.io/v1beta1"
        kind       = "GatewayClass"
        metadata = {
            name = "stunner-gatewayclass"
        }
        spec = {
            controllerName = "stunner.l7mp.io/gateway-operator"
            parametersRef = {
                group = "stunner.l7mp.io"
                kind = "GatewayConfig"
                name = "stunner-gatewayconfig"
                namespace = "${kubernetes_namespace.stunner.metadata[0].name}"
            }
            description = "STUNner is a WebRTC media gateway for Kubernetes"
        }
    }
}

resource random_password auth_secret {
    length = 32
    special = false
}

resource kubernetes_secret "stunner_auth_secret" {
    metadata {
        name = "stunner-auth-secret"
        namespace = "${kubernetes_namespace.stunner.metadata[0].name}"
    }
    data = {
        type = "ephemeral"
        secret = "${random_password.auth_secret.result}"
    }
}

resource kubernetes_manifest "gateway_config" {
    manifest = {
        apiVersion = "stunner.l7mp.io/v1alpha1"
        kind       = "GatewayConfig"
        metadata = {
            name = "stunner-gatewayconfig"
            namespace = "${kubernetes_namespace.stunner.metadata[0].name}"
        }
        spec = {
            realm = "stunner.l7mp.io"
            authRef = {
                name = "${kubernetes_secret.stunner_auth_secret.metadata[0].name}"
                namespace = "${kubernetes_namespace.stunner.metadata[0].name}"
            }
        }
    }
}

resource kubernetes_manifest gateway {
    manifest = {
        apiVersion = "gateway.networking.k8s.io/v1beta1"
        kind       = "Gateway"
        metadata = {
            name = "udp-gateway"
            namespace = "${kubernetes_namespace.stunner.metadata[0].name}"
        }
        spec = {
            gatewayClassName = "stunner-gatewayclass"
            listeners = [
                {
                    name = "udp-listener"
                    port = 3478
                    protocol = "TURN-UDP"
                }
            ]
        }
    }
}

# resource kubernetes_manifest udp_route {
#     manifest = {
#         apiVersion = "gateway.networking.k8s.io/valpha2"
#         kind       = "UDPRoute"
#         metadata = {
#             name = "media-plane"
#             namespace = "${kubernetes_namespace.stunner.metadata[0].name}"
#         }
#         spec = {
#             parentRefs = [{
#                 name = "${kubernetes_manifest.gateway.manifest.metadata.name}"
#             }]
#             rules = [{
#                 backendRefs = [
#                     {
#                         name = "${var.backend_service_name}"
#                         namespace = "${var.backend_namespace}"
#                     }
#                 ]
#             }]
#         }

#     }
# }