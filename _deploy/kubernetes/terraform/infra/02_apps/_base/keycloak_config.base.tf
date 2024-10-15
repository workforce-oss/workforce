resource "keycloak_realm" "realm" {
  realm   = "workforce"
  enabled = true

  access_token_lifespan = "24h"
}

resource "keycloak_openid_client" "workforce_admin" {
  realm_id  = keycloak_realm.realm.id
  client_id = "workforce-admin"

  name    = "workforce-admin"
  enabled = true

  access_type = "CONFIDENTIAL"
  service_accounts_enabled = true

  direct_access_grants_enabled = true

}
