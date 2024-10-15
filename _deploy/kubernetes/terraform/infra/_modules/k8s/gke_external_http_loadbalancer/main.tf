resource "kubernetes_manifest" "https_redirect" {
  manifest = {
    apiVersion = "networking.gke.io/v1beta1"
    kind       = "FrontendConfig"
    metadata = {
      name      = "${var.name}-redirect"
      namespace = "${var.namespace}"
    }
    spec = {
      redirectToHttps = {
        enabled = true
      }
    }
  }
}


resource "kubernetes_ingress_v1" "ingress" {
  metadata {
    name      = var.name
    namespace = var.namespace
    annotations = {
      "networking.gke.io/v1beta1.FrontendConfig"    = "${kubernetes_manifest.https_redirect.manifest.metadata.name}"
      "kubernetes.io/ingress.global-static-ip-name" = "${google_compute_global_address.static_ip.name}"
    }
  }

  spec {
    dynamic "tls" {
      for_each = var.use_letsencrypt ? [1] : []
      content {
        secret_name = kubernetes_manifest.certificate[0].manifest.spec.secretName
      }

    }
    dynamic "rule" {
      for_each = var.use_letsencrypt ? [1] : []
      content {
        host = var.external_hostname
        http {
          path {
            path      = "/*"
            path_type = "ImplementationSpecific"
            backend {
              service {
                name = var.backend_service_name
                port {
                  number = var.backend_service_port
                }
              }
            }
          }
        }
      }
    }
  }
}
