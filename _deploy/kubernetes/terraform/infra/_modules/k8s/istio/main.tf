locals {
  repository = "https://istio-release.storage.googleapis.com/charts"
  health_check_name = "istio-ingress-health-check"
}

resource "helm_release" "base" {
  name             = "base"
  repository       = local.repository
  chart            = "base"
  version          = var.istio_version
  namespace        = "istio-system"
  create_namespace = true
}

resource "helm_release" "istiod" {
  name       = "istiod"
  repository = local.repository
  chart      = "istiod"
  version    = var.istio_version
  namespace  = "istio-system"

  depends_on = [helm_release.base]
}

resource "helm_release" "ingress" {
  count = var.install_gateway ? 1 : 0

  name             = "istio-ingress"
  repository       = local.repository
  chart            = "gateway"
  version          = var.istio_version
  namespace        = "istio-ingress"
  create_namespace = true

  values = [yamlencode({
    service = {
      type = "${var.gateway_service_type}"
      annotations = {
        "cloud.google.com/backend-config" = "{\"default\": \"${local.health_check_name}\"}"
      }
      ports = [
        {
          name = "status-port"
          port = 15021
          protocol = "TCP"
          targetPort = 15021
        },
        {
          name = "http2"
          port = 8090
          protocol = "TCP"
          targetPort = 8090
        },
        {
          name = "https"
          port = 9443
          protocol = "TCP"
          targetPort = 443
        }
      ]
    }
  })]

  depends_on = [helm_release.base, helm_release.istiod]
}

// create health check
resource "kubernetes_manifest" "health_check" {
  count = var.install_gateway && var.create_lb_health_check ? 1 : 0
  manifest = {
    apiVersion = "cloud.google.com/v1"
    kind       = "BackendConfig"
    metadata = {
      name      = "${local.health_check_name}"
      namespace = "istio-ingress"
    }
    spec = {
      timeoutSec = 3600
      healthCheck = {
        checkIntervalSec = 5
        timeoutSec       = 5
        healthyThreshold = 2
        unhealthyThreshold = 2
        port = 8090
        type = "HTTP"
        requestPath = "/healthz/ready"
      }
      securityPolicy = var.enable_gke_security_policy ? {
        name = "gke-security-policy"
      } : null
    }
  }

  depends_on = [helm_release.ingress[0]]
}
