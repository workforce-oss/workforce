locals {
  repository = "https://charts.bitnami.com/bitnami"
}

resource random_password postgres_admin {
  length           = 16
  special          = false
  override_special = "_%@"
}

resource random_password postgres_user {
  length           = 16
  special          = false
  override_special = "_%@"
}

resource "helm_release" "postgres" {
  name             = "postgres"
  repository       = local.repository
  chart            = "postgresql"
  version          = "12.9.0"
  namespace        = "postgres"
  create_namespace = true

  set {
    name  = "auth.postgresPassword"
    value = random_password.postgres_admin.result
  }

  set {
    name  = "auth.database"
    value = "app"
  }

  set {
    name  = "auth.username"
    value = "app"
  }

  set {
    name  = "auth.password"
    value = random_password.postgres_user.result
  }
}

resource kubernetes_secret app_connection_string {
  metadata {
    name      = "app-connection-string"
    namespace = "postgres"
  }

  data = {
    connection_string = "postgresql://app:${random_password.postgres_user.result}@postgres-postgresql.postgres.svc.cluster.local:5432/app"
  }

  depends_on = [
    helm_release.postgres,
  ]
}