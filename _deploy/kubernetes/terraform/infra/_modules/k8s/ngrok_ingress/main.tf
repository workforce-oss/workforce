resource "kubernetes_ingress_v1" "ngrok" {
  metadata {
    name      = "ngrok"
    namespace = var.namespace
  }
  spec {
    ingress_class_name = "ngrok"
    rule {
      host = var.ingress_domain
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = var.service_name
              port {
                number = var.service_port
              }
            }
          }
        }
      }
    }
  }
}
