resource "keycloak_openid_client" "collab-ui" {
  realm_id  = keycloak_realm.realm.id
  client_id = "collab-ui"

  name    = "collab-ui"
  enabled = true

  access_type = "PUBLIC"
  valid_redirect_uris = [
    "${local.base_url}/collab-ui/"
  ]

  login_theme           = "keycloak"
  standard_flow_enabled = true

}

resource "keycloak_openid_user_attribute_protocol_mapper" "collab_ui_user_property_mapper" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.collab-ui.id
  name      = "orgId-mapper"

  user_attribute = "orgId"
  claim_name     = "orgId"
}

resource "keycloak_openid_audience_protocol_mapper" "collab_ui-audience-mapper" {
  realm_id  = keycloak_realm.realm.id
  client_id = keycloak_openid_client.collab-ui.id
  name      = "collab-ui-audience-mapper"

  included_custom_audience = "workforce-api"
}