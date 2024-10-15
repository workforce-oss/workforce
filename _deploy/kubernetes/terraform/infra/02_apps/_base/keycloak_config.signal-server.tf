# resource "keycloak_openid_client" "signal-server" {
#   realm_id  = keycloak_realm.realm.id
#   client_id = "signal-server"

#   name    = "signal-server"
#   enabled = true

#   access_type = "PUBLIC"
#   valid_redirect_uris = [
#     "${local.base_url}/signal-server/"
#   ]

#   login_theme           = "keycloak"
#   standard_flow_enabled = true
# }

# resource "keycloak_openid_user_attribute_protocol_mapper" "user_property_mapper" {
#   realm_id  = keycloak_realm.realm.id
#   client_id = keycloak_openid_client.signal-server.id
#   name      = "orgId-mapper"

#   user_attribute = "orgId"
#   claim_name     = "orgId"
# }