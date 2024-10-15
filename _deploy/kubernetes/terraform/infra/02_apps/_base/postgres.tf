module "postgres_connection_string" {
  source = "../../_modules/k8s/secret_value"

  namespace = var.postgres_secret_data.namespace
  name      = var.postgres_secret_data.secret_name
  key       = var.postgres_secret_data.secret_key
}

resource "kubernetes_secret" "postgres_connection_string" {
  metadata {
    name      = "postgres-connection-string"
    namespace = "apps"
  }

  data = {
    "DB_CONNECTION_STRING" = module.postgres_connection_string.value
  }
}


