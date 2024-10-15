data kubernetes_secret secret_source {
  metadata {
    namespace = var.namespace
    name = var.name
  }
}