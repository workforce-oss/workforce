module "redis_password" {
  source = "../../_modules/k8s/secret_value"

  namespace = var.redis_secret_data.namespace
  name      = var.redis_secret_data.secret_name
  key       = var.redis_secret_data.secret_key
}

resource "kubernetes_secret" "redis_password" {
  metadata {
    name      = "redis-password"
    namespace = "apps"
  }

  data = {
    "BROKER_PASSWORD" = module.redis_password.value
    "CACHE_PASSWORD"  = module.redis_password.value
  }
}
