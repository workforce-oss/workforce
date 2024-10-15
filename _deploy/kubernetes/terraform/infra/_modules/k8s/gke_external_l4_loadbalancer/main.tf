# create a kubernetes service of type LoadBalancer
# it should expose all ports in GKE by creating a service with more than 6 ports

locals {
  all_udp_ports = range(var.min_udp_port, var.max_udp_port + 1)
}

resource "kubernetes_service" "service" {
  metadata {
    name      = var.name
    namespace = var.namespace
    annotations = {
      "cloud.google.com/l4-rbs" = "enabled"
    }
  }

  spec {
    selector = {
      app = var.app_selector
    }

    dynamic "port" {
      for_each = var.tcp_ports
      content {
        name        = "tcp-${port.value}"
        port        = port.value
        target_port = port.value
      }
    }

    dynamic "port" {
      for_each = local.all_udp_ports
      content {
        name        = "udp-${port.value}"
        port        = port.value
        target_port = port.value
        protocol = "UDP"
      }
    }

    dynamic "port" {
      for_each = local.all_udp_ports
      content {
        name        = "tcp-${port.value}"
        port        = port.value
        target_port = port.value
        protocol = "TCP"
      }
    }

    port {
      name        = "udp-3478"
      port        = 3478
      target_port = 3478
      protocol = "UDP"
    }

    type = "LoadBalancer"
  }
}
