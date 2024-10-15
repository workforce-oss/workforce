data kubernetes_service actual_service {
  metadata {
    name      = var.name
    namespace = var.namespace
  }
  depends_on = [ kubernetes_service.service ]
}

resource "google_dns_record_set" "lb" {
    name = "${var.external_hostname}." # trailing dot is required
    type = "A"
    ttl  = 300
    managed_zone = var.dns_zone_name
    project = var.project_id
    rrdatas = [data.kubernetes_service.actual_service.status.0.load_balancer.0.ingress.0.ip]
}

