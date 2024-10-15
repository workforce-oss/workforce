resource "keycloak_openid_client" "workforce-engine" {
  realm_id  = keycloak_realm.realm.id
  client_id = "workforce-engine"

  name    = "workforce-engine"
  enabled = true

  access_type = "CONFIDENTIAL"

  service_accounts_enabled = true
}


resource "keycloak_openid_audience_protocol_mapper" "workforce-engine-audience-mapper" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.workforce-engine.id

  name = "workforce-engine-audience-mapper"

  included_custom_audience = "secret-service"
}

resource "keycloak_openid_audience_protocol_mapper" "workforce-engine-audience-api-mapper" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.workforce-engine.id

  name = "workforce-engine-audience-api-mapper"

  included_custom_audience = "workforce-api"
}

resource "kubernetes_secret" "workforce-engine-oauth2" {
  metadata {
    name      = "workforce-engine-oauth2"
    namespace = lookup(var.apps, "workforce-engine", null) == null ? local.default_namespace : var.apps["workforce-engine"].namespace
  }

  data = {
    "OAUTH2_CLIENT_ID"     = "${keycloak_openid_client.workforce-engine.client_id}"
    "OAUTH2_CLIENT_SECRET" = "${keycloak_openid_client.workforce-engine.client_secret}"
    "OAUTH2_ISSUER_URI"    = "${local.base_url}/auth/realms/${local.realm}"
    "OAUTH2_AUDIENCE"      = "workforce-engine"
  }
}