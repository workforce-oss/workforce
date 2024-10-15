locals {
  repository = "https://charts.bitnami.com/bitnami"
}

resource "random_password" "redis_password" {
  length           = 16
  special          = false
  override_special = "_%@"
}

resource kubernetes_namespace redis {
  metadata {
    name = "redis"
  }
}

resource "kubernetes_secret" "redis_acl" {
  metadata {
    name      = "redis-acl"
    namespace = kubernetes_namespace.redis.metadata[0].name
  }

  data = {
    ## Create additional users with the same password from var.additional_users
    "users.acl" = <<-EOT
      user default on ~* &* +@all >${random_password.redis_password.result}
      ${join("\n", [for user in var.additional_users : "user ${user} allkeys allchannels +@all on >${random_password.redis_password.result}"])}
      EOT
  }
}

locals {
  helm_config = {
    "image" = {
      "repository" = "redis/redis-stack-server"
      "tag" = "7.2.0-v8"
    }
    "auth" = {
      "password" = random_password.redis_password.result
    }
    "master" = {
      "extraVolumes" = [
        {
          name = "redis-acl"
          secret = {
            secretName = "${kubernetes_secret.redis_acl.metadata[0].name}"
          }
        }
      ]
      "extraVolumeMounts" = [
        {
          name      = "redis-acl"
          mountPath = "/etc/redis/users.acl"
          subPath   = "users.acl"
          readOnly  = true
        }
      ]
    }
    "replica" = {
      "replicaCount" = 0
      "extraVolumes" = [
        {
          name = "redis-acl"
          secret = {
            secretName = "${kubernetes_secret.redis_acl.metadata[0].name}"
          }
        }
      ]
      "extraVolumeMounts" = [
        {
          name      = "redis-acl"
          mountPath = "/etc/redis/users.acl"
          subPath   = "users.acl"
          readOnly  = true
        }
      ]
    }
    "commonConfiguration" = <<-EOT
        aclfile /etc/redis/users.acl
        EOT
  }
}

resource "helm_release" "redis" {
  name             = "redis"
  repository       = local.repository
  chart            = "redis"
  version          = "18.16.1"
  namespace        = "redis"
  create_namespace = false
  values = [
    yamlencode(local.helm_config)
  ]
  depends_on = [kubernetes_secret.redis_acl]
}
