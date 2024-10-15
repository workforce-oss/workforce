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

  enable_ngrok = var.enable_ngrok

}
