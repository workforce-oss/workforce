resource "kubernetes_secret" "admin_secret" {
  metadata {
    name      = "workforce-admin-secret"
    namespace = "apps"
  }

  data = {
    ADMIN_USERNAME = var.workforce_admin_secret_data.ADMIN_USERNAME
    ADMIN_PASSWORD = var.workforce_admin_secret_data.ADMIN_PASSWORD
    ADMIN_EMAIL    = var.workforce_admin_secret_data.ADMIN_EMAIL
  }
}
