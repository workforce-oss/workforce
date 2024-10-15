resource "kubernetes_namespace" "nlm_ingestor" {
  metadata {
    name = var.namespace
  }
}

resource "kubernetes_deployment" "nlm_ingesor" {
  metadata {
    name      = "nlm-ingestor"
    namespace = kubernetes_namespace.nlm_ingestor.metadata[0].name
  }
  spec {
    replicas = var.replicas
    strategy {
      rolling_update {
        max_surge       = "25%"
        max_unavailable = "25%"
      }
    }
    selector {
      match_labels = {
        app = "nlm-ingestor"
      }
    }
    template {
      metadata {
        labels = {
          app                       = "nlm-ingestor"
          "sidecar.istio.io/inject" = "true"
        }
      }
      spec {
        container {
          name  = "nlm-ingestor"
          image = "${var.image}:${var.image_tag}"
          port {
            container_port = 5001
            protocol       = "TCP"
            name           = "http"
          }
          liveness_probe {
            tcp_socket {
                port = "http"
            }
            initial_delay_seconds = 5
            period_seconds        = 10
            failure_threshold     = 3
            success_threshold     = 1
          }
          readiness_probe {
            tcp_socket {
                port = "http"
            }
            initial_delay_seconds = 5
            period_seconds        = 10
            failure_threshold     = 3
            success_threshold     = 1
          }
        }

      }
    }
  }

  timeouts {
    create = "2m"
    update = "2m"
  }
}

resource "kubernetes_service" "nlm_ingestor" {
  metadata {
    name      = "nlm-ingestor"
    namespace = kubernetes_namespace.nlm_ingestor.metadata[0].name
  }
  spec {
    selector = {
      app = "nlm-ingestor"
    }
    port {
      port        = var.service_port
      target_port = "http"
    }
  }
}

resource "kubernetes_manifest" "nlm_ingestor_destination_rule" {
  manifest = {
    apiVersion = "networking.istio.io/v1beta1"
    kind       = "DestinationRule"
    metadata = {
      name      = "nlm-ingestor"
      namespace = kubernetes_namespace.nlm_ingestor.metadata[0].name
    }
    spec = {
      host = "${kubernetes_service.nlm_ingestor.metadata[0].name}.${kubernetes_namespace.nlm_ingestor.metadata[0].name}.svc.cluster.local"
      trafficPolicy = {
        tls = {
          mode = "DISABLE"
        }
      }
    }
  }
}
