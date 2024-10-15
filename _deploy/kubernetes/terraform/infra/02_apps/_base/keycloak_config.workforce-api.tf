resource "keycloak_openid_client" "workforce-api" {
  realm_id  = keycloak_realm.realm.id
  client_id = "workforce-api"

  name    = "workforce-api"
  enabled = true


  access_type = "CONFIDENTIAL"

  service_accounts_enabled = true
}

resource "keycloak_openid_audience_protocol_mapper" "workforce-api-audience-mapper" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.workforce-api.id

  name = "workforce-api-audience-mapper"

  included_custom_audience = "secret-service"
}

resource "kubernetes_secret" "workforce-api-oauth2" {
  metadata {
    name      = "workforce-api-oauth2"
    namespace = lookup(var.apps, "workforce-api", null) == null ? local.default_namespace : var.apps["workforce-api"].namespace
  }

  data = {
    "OAUTH2_CLIENT_ID"     = "${keycloak_openid_client.workforce-api.client_id}"
    "OAUTH2_CLIENT_SECRET" = "${keycloak_openid_client.workforce-api.client_secret}"
    "OAUTH2_ISSUER_URI"    = "${local.base_url}/auth/realms/${local.realm}"
    "OAUTH2_AUDIENCE"      = "workforce-api"
  }
}