resource "kubernetes_namespace" "namespace" {
  metadata {
    name = var.namespace
  }
}

resource random_password auth_secret {
  length           = 32
  special          = false
  override_special = "_%@"
}

resource kubernetes_secret auth_secret {
  metadata {
    name      = "auth-secret"
    namespace = kubernetes_namespace.namespace.metadata[0].name
  }

  data = {
    "auth_secret" = random_password.auth_secret.result
  }
}