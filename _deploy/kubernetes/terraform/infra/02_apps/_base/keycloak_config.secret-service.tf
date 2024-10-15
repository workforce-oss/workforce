resource "keycloak_openid_client" "secret-service" {
  realm_id  = keycloak_realm.realm.id
  client_id = "secret-service"

  name    = "secret-service"
  enabled = true

  access_type = "CONFIDENTIAL"

  service_accounts_enabled = true
}

resource "kubernetes_secret" "secret-service-oauth2" {
  metadata {
    name      = "secret-service-oauth2"
    namespace = lookup(var.apps, "secret-service", null) == null ? local.default_namespace : var.apps["secret-service"].namespace
    
  }

  data = {
    "OAUTH2_CLIENT_ID"     = "${keycloak_openid_client.secret-service.client_id}"
    "OAUTH2_CLIENT_SECRET" = "${keycloak_openid_client.secret-service.client_secret}"
    "OAUTH2_ISSUER_URI"    = "${local.base_url}/auth/realms/${local.realm}"
    "OAUTH2_AUDIENCE"      = "secret-service"
  }
}