resource "keycloak_openid_client" "workforce-ui" {
  realm_id  = keycloak_realm.realm.id
  client_id = "workforce-ui"

  name    = "workforce-ui"
  enabled = true

  valid_redirect_uris = [
    "${local.base_url}/workforce-ui",
    "${local.base_url}/workforce-ui/",
    "${local.base_url}/workforce-ui/*",
    "http://localhost:3000/*",
    "http://localhost:3000",
    "http://localhost:3000/workforce-ui/*",
    "http://localhost:3000/workforce-ui",
    "http://localhost:3001/*",
    "http://localhost:3001",
    "http://localhost:3001/workforce-ui/",
    "http://localhost:3001/workforce-ui/callback",
    "http://localhost:3001/workforce-ui/*",
    "http://localhost:8083/"
  ]
  web_origins = [
    "+"
  ]

  access_type                = "PUBLIC"
  pkce_code_challenge_method = "S256"

  standard_flow_enabled = true
}

resource "keycloak_openid_user_attribute_protocol_mapper" "workforce_ui_user_property_mapper" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.workforce-ui.id
  name      = "workforce-ui-orgId-mapper"

  user_attribute = "orgId"
  claim_name     = "orgId"
}

resource "keycloak_openid_audience_protocol_mapper" "workforce-ui-audience-mapper" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.workforce-ui.id
  name      = "workforce-ui-audience-mapper"

  included_custom_audience = "workforce-api"
}

// add a group mapper for workforce-ui
resource "keycloak_openid_group_membership_protocol_mapper" "workforce-ui-group-mapper" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.workforce-ui.id
  name      = "workforce-ui-group-mapper"

  claim_name = "features"
  full_path = false
}