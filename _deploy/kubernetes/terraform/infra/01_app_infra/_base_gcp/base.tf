module "gke_external_http_loadbalancer" {
  count  = var.enable_gke_external_http_loadbalancer ? 1 : 0
  source = "../../_modules/k8s/gke_external_http_loadbalancer"

  name                 = "gke-external-http-loadbalancer"
  namespace            = var.istio_ingress_namespace
  project_id           = var.project_id
  dns_project_id       = var.dns_project_id
  dns_zone_name        = var.dns_zone_name
  external_hostname    = var.ingress_domain
  use_letsencrypt      = var.use_letsencrypt
  backend_service_name = "istio-ingress"
  backend_service_port = var.istio_service_port
  acme_email           = var.acme_email
}

module "coturn_vm" {
  count  = var.enable_coturn_vm ? 1 : 0
  source = "../../_modules/gke/coturn_server"

  dns_zone_name     = var.dns_zone_name
  network_name      = var.network_name
  subnetwork_name   = var.subnetwork_name
  project_id        = var.project_id
  region            = var.region
  external_hostname = var.turn_domain
  ports = {
    plaintext = 3478
    tls       = 5349
    min       = var.coturn_min_udp_port
    max       = var.coturn_max_udp_port
  }
}

module "coturn_lb" {
  count = var.enable_gke_external_l4_loadbalancer ? 1 : 0

  source = "../../_modules/k8s/gke_external_l4_loadbalancer"

  name                 = "coturn-lb"
  namespace            = "coturn"
  project_id           = var.project_id
  dns_zone_name        = var.dns_zone_name
  external_hostname    = var.turn_domain
  backend_service_port = 3478
  app_selector         = "coturn"
  tcp_ports            = var.coturn_tcp_ports
  min_udp_port         = var.coturn_min_udp_port
  max_udp_port         = var.coturn_max_udp_port
}
