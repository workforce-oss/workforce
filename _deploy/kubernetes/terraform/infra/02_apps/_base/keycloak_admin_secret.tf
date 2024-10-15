resource "kubernetes_secret" "keycloak_admin_secret" {
  metadata {
    name      = "keycloak-admin-secret"
    namespace = "apps"
  }

  data = {
    IDENTITY_MANAGER_TYPE    = "keycloak"
    KEYCLOAK_BASE_URL        = var.keycloak_admin_secret_data.KEYCLOAK_BASE_URL
    KEYCLOAK_REALM_NAME      = var.keycloak_admin_secret_data.KEYCLOAK_REALM_NAME
    KEYCLOAK_ADMIN_CLIENT_ID = var.keycloak_admin_secret_data.KEYCLOAK_ADMIN_CLIENT_ID
    KEYCLOAK_ADMIN_USERNAME  = var.keycloak_admin_secret_data.KEYCLOAK_ADMIN_USERNAME
    KEYCLOAK_ADMIN_PASSWORD  = var.keycloak_admin_secret_data.KEYCLOAK_ADMIN_PASSWORD
  }
}
