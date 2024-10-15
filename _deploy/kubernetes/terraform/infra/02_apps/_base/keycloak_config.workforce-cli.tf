resource "keycloak_openid_client" "workforce-cli" {
  realm_id  = keycloak_realm.realm.id
  client_id = "workforce-cli"

  name    = "workforce-cli"
  enabled = true

  valid_redirect_uris = [
    "http://localhost:6363"
  ]

  access_type                = "PUBLIC"
  pkce_code_challenge_method = "S256"

  standard_flow_enabled = true
}

resource "keycloak_openid_user_attribute_protocol_mapper" "workforce_cli_user_property_mapper" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.workforce-cli.id
  name      = "workforce-cli-orgId-mapper"

  user_attribute = "orgId"
  claim_name     = "orgId"
}

resource "keycloak_openid_audience_protocol_mapper" "workforce-cli-audience-mapper" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.workforce-cli.id
  name      = "workforce-cli-audience-mapper"

  included_custom_audience = "workforce-api"
}