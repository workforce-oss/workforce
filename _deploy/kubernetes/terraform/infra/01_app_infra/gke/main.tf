module "base" {
  source = "../_base"

  cluster_name            = var.cluster_name
  enable_coturn           = var.enable_coturn
  istio_ingress_namespace = var.istio_ingress_namespace
  redis_users             = var.redis_users
  ingress_domain          = var.ingress_domain
  ingress_protocol        = var.ingress_protocol
  ingress_port            = var.ingress_port
  enable_minio            = var.enable_minio
  enable_weaviate         = var.enable_weaviate
  weaviate_storage_size   = var.weaviate_storage_size
  enable_nlm_ingestor     = var.enable_nlm_ingestor
  enable_prometheus_stack = var.enable_prometheus_stack
}

module "base_gcp" {
  source = "../_base_gcp"

  acme_email                            = var.acme_email
  network_name                          = var.network_name
  subnetwork_name                       = var.subnetwork_name
  dns_zone_name                         = var.dns_zone_name
  enable_gke_external_http_loadbalancer = var.enable_gke_external_http_loadbalancer
  enable_gke_external_l4_loadbalancer   = var.enable_gke_external_l4_loadbalancer
  ingress_domain                        = var.ingress_domain
  istio_ingress_namespace               = var.istio_ingress_namespace
  istio_service_port                    = var.istio_service_port
  project_id                            = var.project_id
  region                                = var.region
  turn_domain                           = var.turn_domain
  use_letsencrypt                       = var.use_letsencrypt
  coturn_max_udp_port                   = var.coturn_max_udp_port
  coturn_min_udp_port                   = var.coturn_min_udp_port
  coturn_tcp_ports                      = var.coturn_tcp_ports
  enable_coturn_vm                      = var.enable_coturn_vm
  dns_project_id                        = var.dns_project_id
}
