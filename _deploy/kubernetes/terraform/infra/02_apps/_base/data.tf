data "kubernetes_secret" "coturn_auth_secret" {
  metadata {
    name      = "auth-secret"
    namespace = "coturn"
  }
}