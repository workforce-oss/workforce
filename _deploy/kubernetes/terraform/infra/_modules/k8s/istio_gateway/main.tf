# Istio Gateway
resource "kubernetes_manifest" "gateway" {
  manifest = {
    apiVersion = "networking.istio.io/v1alpha3"
    kind       = "Gateway"
    metadata = {
      name      = "${var.name}"
      namespace = "${var.namespace}"
    }
    spec = {
      selector = {
        istio = "ingress"
      }
      servers = [
        {
          port = {
            number   = 8090
            name     = "http"
            protocol = "HTTP"
          }
          hosts = [
            "*"
          ]
        }
      ]
    }
  }
}

# Istio VirtualService for Health Check
# Route /healthz to the health check port
resource "kubernetes_manifest" "gateway_health_check" {
  manifest = {
    apiVersion = "networking.istio.io/v1alpha3"
    kind       = "VirtualService"
    metadata = {
      name      = "${var.name}-health-check"
      namespace = "${var.namespace}"
    }
    spec = {
      hosts    = ["*"]
      gateways = ["${kubernetes_manifest.gateway.manifest.metadata.name}"]
      http = [
        {
          match = [{
            uri = {
              prefix = "/healthz"
            }
          }]
          route = [
            {
              destination = {
                host = "istio-ingress.${var.namespace}.svc.cluster.local"
                port = {
                  number = 15021
                  name   = "http"
                }
              }
            }
          ]
        }
      ]
    }
    
  }
}

# Istio Telemetry
resource "kubernetes_manifest" "telemetry" {
  manifest = {
    apiVersion = "telemetry.istio.io/v1alpha1"
    kind = "Telemetry"
    metadata = {
      name = "mesh-default"
      namespace = "istio-system"
    }
    spec = {
      accessLogging = [
        {
          providers = [
            {
              name = "envoy"
            }
          ]
        }
      ]
    }
  }
}