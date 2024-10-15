cluster_name = "primary"
istio_ingress_namespace = "istio-ingress"
redis_users = [
    "workforce-engine",
    "workforce-api"
]
enable_coturn = false
deploy_local_coturn_lb = false
ingress_protocol = "https"
ingress_port = 443
enable_minio = false
enable_weaviate = true
weaviate_storage_size = "1Gi"
enable_nlm_ingestor = true
enable_prometheus_stack = true