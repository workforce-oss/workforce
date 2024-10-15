istio_ingress_namespace = "istio-ingress"
redis_users = [
    "workforce-engine",
    "workforce-api"
]
enable_coturn = false
enable_coturn_vm = false
enable_stunner = false
stunner_backend_namespace = "apps"
ingress_protocol = "https"
ingress_port = 443

enable_gke_external_http_loadbalancer = true
enable_gke_external_l4_loadbalancer = false
use_letsencrypt = true

enable_minio = false
enable_weaviate = true
weaviate_storage_size = "1Gi"
enable_nlm_ingestor = true
enable_prometheus_stack = true