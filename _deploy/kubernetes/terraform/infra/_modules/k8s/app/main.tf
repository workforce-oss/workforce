resource "kubernetes_deployment" "deployment" {
  metadata {
    name      = var.app_name
    namespace = var.namespace
    labels = {
      app = var.app_name
    }
  }
  spec {
    replicas = var.min_replicas
    strategy {
      rolling_update {
        max_surge       = "1"
        max_unavailable = "0"
      }
    }
    selector {
      match_labels = {
        app = var.app_name
      }
    }
    template {
      metadata {
        labels = merge({
          app                       = var.app_name
          "sidecar.istio.io/inject" = var.http_ingress_enabled ? "true" : "false"
        }, var.additional_labels)
      }
      spec {
        service_account_name = kubernetes_service_account.service_account.metadata[0].name
        dynamic "volume" {
          for_each = var.secret_files
          content {
            name = volume.key
            secret {
              secret_name = volume.key
              items {
                key  = volume.value.secret_key
                path = volume.value.secret_key
              }
            }
          }
        }
        dynamic "host_aliases" {
          for_each = var.host_aliases
          content {
            ip        = host_aliases.value
            hostnames = [host_aliases.key]
          }

        }
        container {
          name              = "app"
          image             = var.app_image
          image_pull_policy = var.image_pull_policy
          resources {
            limits = {
              # cpu    = var.cpu_limit
              # memory = var.memory_limit
              "nvidia.com/gpu" = var.gpu_limit
            }
            requests = {
              cpu    = var.cpu_request != "" ? var.cpu_request : null
              memory = var.memory_request != "" ? var.memory_request : null
            }
          }
          dynamic "port" {
            for_each = var.http_port != 0 ? [1] : []
            content {
              container_port = var.http_port
              name           = var.http_supports_websockets ? "tcp" : "http"
              protocol       = "TCP"
            }
          }
          dynamic "port" {
            for_each = var.tcp_ports
            content {
              container_port = port.value
              name           = "tcp-${port.value}"
              protocol       = "TCP"
            }
          }
          dynamic "port" {
            for_each = var.udp_ports
            content {
              container_port = port.value
              name           = "udp-${port.value}"
              protocol       = "UDP"
            }
          }
          env {
            name = "INSTANCE_ID"
            value_from {
              field_ref {
                field_path = "metadata.name"
              }
            }
          }

          dynamic "env_from" {
            for_each = var.mount_secrets
            content {
              secret_ref {
                name = env_from.value
              }
            }
          }
          dynamic "env_from" {
            for_each = var.mount_configmaps
            content {
              config_map_ref {
                name = env_from.value
              }
            }
          }
          dynamic "env" {
            for_each = var.env
            content {
              name  = env.key
              value = env.value
            }
          }

          dynamic "env" {
            for_each = lookup(var.env, "BASE_URL", null) == null ? [] : [1]
            content {
              name  = "BASE_URL"
              value = "https://${var.ingress_domain}"
            }
          }

          dynamic "volume_mount" {
            for_each = var.secret_files
            content {
              name       = volume_mount.key
              mount_path = volume_mount.value.mount_path
              sub_path   = volume_mount.value.secret_key
              read_only  = true
            }
          }
        }
      }
    }
  }

  # Set timeout to 3m
  timeouts {
    create = "3m"
    update = "3m"
  }
}

resource "kubernetes_service" "service" {
  metadata {
    name      = var.app_name
    namespace = var.namespace
    labels = {
      app = var.app_name
    }
  }
  spec {
    selector = {
      app = var.app_name
    }
    dynamic "port" {
      for_each = var.http_port != 0 ? [1] : []
      content {
        port        = 80
        target_port = var.http_port
        name        = var.http_supports_websockets ? "tcp" : "http"
        protocol    = "TCP"
      }

    }
    dynamic "port" {
      for_each = var.tcp_ports
      content {
        port        = port.value
        target_port = port.value
        name        = "tcp-${port.value}"
        protocol    = "TCP"
      }
    }
    dynamic "port" {
      for_each = var.udp_ports
      content {
        port        = port.value
        target_port = port.value
        name        = "udp-${port.value}"
        protocol    = "UDP"
      }
    }
  }
  lifecycle {
    ignore_changes = [metadata[0].annotations, metadata[0].labels]
  }
}

# ServiceAccount
resource "kubernetes_service_account" "service_account" {
  metadata {
    name      = var.app_name
    namespace = var.namespace
  }
}

# Role
resource "kubernetes_role" "role" {
  metadata {
    name      = var.app_name
    namespace = var.namespace
  }
  rule {
    api_groups = [""]
    resources  = ["pods"]
    verbs      = ["get", "list", "watch"]
  }
}

# RoleBinding
resource "kubernetes_role_binding" "role_binding" {
  metadata {
    name      = var.app_name
    namespace = var.namespace
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.role.metadata[0].name
  }
  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.service_account.metadata[0].name
    namespace = var.namespace
  }
}

# ClusterRole
resource "kubernetes_cluster_role" "cluster_role" {
  // only create  var.kubernetes_service_account_rules if it is not empty
  count = length(var.kubernetes_cluster_service_account_rules) > 0 ? 1 : 0
  metadata {
    name = var.app_name
  }
  rule {
    api_groups = [""]
    resources  = ["pods"]
    verbs      = ["get", "list", "watch"]
  }

  dynamic "rule" {
    for_each = var.kubernetes_cluster_service_account_rules
    content {
      api_groups = rule.value.api_groups
      resources  = rule.value.resources
      verbs      = rule.value.verbs
    }
  }
}

# ClusterRoleBinding
resource "kubernetes_cluster_role_binding" "cluster_role_binding" {
  // only create  var.kubernetes_service_account_rules if it is not empty
  count = length(var.kubernetes_cluster_service_account_rules) > 0 ? 1 : 0 
  metadata {
    name = var.app_name
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.cluster_role[0].metadata[0].name
  }
  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.service_account.metadata[0].name
    namespace = var.namespace
  }
}

# Istio VirtualService
resource "kubernetes_manifest" "virtual_service" {
  count = var.http_ingress_enabled ? 1 : 0

  manifest = {
    apiVersion = "networking.istio.io/v1alpha3"
    kind       = "VirtualService"
    metadata = {
      name      = "${var.app_name}"
      namespace = "${var.namespace}"
      labels = {
        app = "${var.app_name}"
      }
    }
    spec = {
      hosts    = var.wildcard_virtual_service ? ["${var.app_name}.${var.ingress_domain}"] : ["${var.ingress_domain}"]
      gateways = ["${var.istio_gateway_ref}"]
      http = [
        {
          name = "add-slash"
          match = [{
            uri = {
              exact = "/${var.app_name}"
            }
          }]
          redirect = {
            uri = "/${var.app_name}/"
          }
          }, {
          match = [{
            uri = {
              prefix = "/${var.app_name}/"
            }
          }]
          rewrite = {
            uri = "/"
          }
          route = [
            {
              destination = {
                host = "${var.app_name}.${var.namespace}.svc.cluster.local"
                port = {
                  number = 80
                  name   = "${var.http_supports_websockets ? "tcp" : "http"}"
                }
              }
            }
          ]
        }
      ]
    }
  }
  field_manager {
    force_conflicts = true
  }
}

# Istio DestinationRule to disable TLS
resource "kubernetes_manifest" "destination_rule" {
  count = var.http_ingress_enabled ? 1 : 0

  manifest = {
    apiVersion = "networking.istio.io/v1beta1"
    kind       = "DestinationRule"
    metadata = {
      name      = "${var.app_name}"
      namespace = "${var.namespace}"
      labels = {
        app = "${var.app_name}"
      }
    }
    spec = {
      host = "${var.app_name}.${var.namespace}.svc.cluster.local"
      trafficPolicy = {
        tls = {
          mode = "DISABLE"
        }
      }
    }
  }
}

resource "kubernetes_manifest" "service_monitor" {
  count = var.prometheus_enabled ? 1 : 0

  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "ServiceMonitor"
    metadata = {
      name      = "${var.app_name}"
      namespace = "${var.namespace}"
      labels = {
        app = "${var.app_name}"
      }
    }
    spec = {
      selector = {
        matchLabels = {
          app = "${var.app_name}"
        }
      }
      endpoints = [
        {
          port = "http"
          path = "${var.metrics_path}"
        }
      ]
    }
  }
}
