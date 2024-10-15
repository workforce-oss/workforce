locals {
  port_string = var.ingress_port != 80 && var.ingress_port != 443 ? ":${var.ingress_port}" : ""
  base_url    = "${var.ingress_protocol}://${var.ingress_domain}${local.port_string}"
}

module "base" {
  source = "../_base"

  cluster_name            = var.cluster_name
  gke_project_id          = var.gke_project_id
  istio_ingress_namespace = var.istio_ingress_namespace
  postgres_secret_data    = var.postgres_secret_data
  redis_secret_data       = var.redis_secret_data
  apps                    = var.apps
  ingress_domain          = var.ingress_domain
  ingress_protocol        = var.ingress_protocol
  ingress_port            = var.ingress_port
  turn_server             = var.turn_server
  weaviate_enabled        = var.weaviate_enabled

  keycloak_admin_secret_data = {
    KEYCLOAK_BASE_URL        = "${local.base_url}/auth"
    KEYCLOAK_REALM_NAME      = "workforce"
    KEYCLOAK_ADMIN_CLIENT_ID = "admin-cli"
    KEYCLOAK_ADMIN_USERNAME  = data.kubernetes_secret.keycloak_credentials.data["user"]
    KEYCLOAK_ADMIN_PASSWORD  = data.kubernetes_secret.keycloak_credentials.data["password"]
  }

  workforce_admin_secret_data = var.workforce_admin_secret_data
}
