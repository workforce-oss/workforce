module "postgres" {
  source = "../../_modules/k8s/postgres"
}

module "redis" {
  source           = "../../_modules/k8s/redis"
  additional_users = var.redis_users
}

module "istio_gateway" {
  source = "../../_modules/k8s/istio_gateway"

  name      = "default-gateway"
  namespace = var.istio_ingress_namespace
}

module "stunner" {
  count = var.enable_stunner ? 1 : 0
  source = "../../_modules/k8s/stunner"

  backend_namespace = var.stunner_backend_namespace
  backend_service_name = var.stunner_backend_service_name
}

module "coturn" {
  count  = var.enable_coturn ? 1 : 0
  source = "../../_modules/k8s/coturn"
}

module "keycloak" {
  source = "../../_modules/k8s/keycloak"

  ingress_domain   = var.ingress_domain
  ingress_port     = var.ingress_port
  ingress_protocol = var.ingress_protocol
}

module "minio" {
  count = var.enable_minio ? 1 : 0
  source = "../../_modules/k8s/minio"

  ingress_domain   = var.ingress_domain
  ingress_port     = var.ingress_port
  ingress_protocol = var.ingress_protocol
}

module "weaviate" {
  count = var.enable_weaviate ? 1 : 0
  source = "../../_modules/k8s/weaviate"

  storage_size = var.weaviate_storage_size
  ingress_domain = var.ingress_domain
  ingress_port = var.ingress_port
  ingress_protocol = var.ingress_protocol
}

module "nlm_ingestor" {
  count = var.enable_nlm_ingestor ? 1 : 0
  source = "../../_modules/k8s/nlm_ingestor"
  
}

module "prometheus" {
  count = var.enable_prometheus_stack ? 1 : 0
  
  source = "../../_modules/k8s/prometheus"

  ingress_domain   = var.ingress_domain
  ingress_port     = var.ingress_port
  ingress_protocol = var.ingress_protocol
}

module "ngrok_ingress" {
  count            = var.enable_ngrok ? 1 : 0
  source           = "../../_modules/k8s/ngrok_ingress"

  ingress_domain   = var.ingress_domain
  namespace = var.istio_ingress_namespace
  service_name = "istio-ingress"
  service_port = 8090
  
}

