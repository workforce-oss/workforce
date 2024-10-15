resource "keycloak_openid_client" "storage-api" {
  realm_id  = keycloak_realm.realm.id
  client_id = "storage-api"

  name    = "storage-api"
  enabled = true


  access_type = "CONFIDENTIAL"

  service_accounts_enabled = true
}

resource "keycloak_openid_audience_protocol_mapper" "storage-api-audience-mapper" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.storage-api.id

  name = "storage-api-audience-mapper"

  included_custom_audience = "secret-service"
}

resource "kubernetes_secret" "storage-api-oauth2" {
  metadata {
    name      = "storage-api-oauth2"
    namespace = lookup(var.apps, "storage-api", null) == null ? local.default_namespace : var.apps["storage-api"].namespace
  }

  data = {
    "OAUTH2_CLIENT_ID"     = "${keycloak_openid_client.storage-api.client_id}"
    "OAUTH2_CLIENT_SECRET" = "${keycloak_openid_client.storage-api.client_secret}"
    "OAUTH2_ISSUER_URI"    = "${local.base_url}/auth/realms/${local.realm}"
    "OAUTH2_AUDIENCE"      = "workforce-api"
  }
}