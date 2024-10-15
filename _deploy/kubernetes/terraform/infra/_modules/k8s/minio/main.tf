locals {
  repository              = "https://operator.min.io"
  port_string             = var.ingress_port != 443 && var.ingress_port != 80 ? ":${var.ingress_port}" : ""
  admin_username          = "admin"
  base_url                = "${var.ingress_protocol}://${var.ingress_domain}${local.port_string}"
  subpath                 = "storage"
  console_host            = "console"
  operator_host           = "operator"
  minio_console_http_port = 9090
}

resource "random_password" "minio_admin" {
  length           = 16
  special          = false
  override_special = "_%@"
}

resource "kubernetes_namespace" "minio" {
  metadata {
    name = "minio"
    labels = {
      istio-injection = "enabled"
    }
  }
}

resource "kubernetes_secret" "minio_admin_password" {
  metadata {
    name      = "minio-admin-password"
    namespace = kubernetes_namespace.minio.metadata[0].name
  }

  data = {
    user     = local.admin_username
    password = random_password.minio_admin.result
  }
}

resource "helm_release" "minio" {
  name             = "minio"
  repository       = local.repository
  chart            = "minio-operator"
  namespace        = kubernetes_namespace.minio.metadata[0].name
  create_namespace = false

  values = [yamlencode({
    console = {
      env = [
        {
          name  = "MINIO_BROWSER_REDIRECT_URL"
          value = "${local.base_url}/${local.subpath}/"
        },
        {
          name  = "MINIO_SERVER_URL"
          value = "${local.base_url}/${local.subpath}/"
        },
        {
          name  = "PUBLIC_URL"
          value = "${local.base_url}/${local.subpath}"
        }
      ]
    }
  })]
}

resource "kubernetes_manifest" "console_virtual_service" {
  manifest = {
    apiVersion = "networking.istio.io/v1alpha3"
    kind       = "VirtualService"
    metadata = {
      name      = "minio-console"
      namespace = "${kubernetes_namespace.minio.metadata[0].name}"
      labels = {
        app = "minio-console"
      }
    }
    spec = {
      hosts    = var.ingress_domain != "" ? ["${var.ingress_domain}"] : ["*"]
      gateways = ["${var.istio_gateway_ref}"]
      http = [
        {
          name = "add-slash"
          match = [{
            uri = {
              exact = "/${local.subpath}"
            }
          }]
          redirect = {
            uri = "/${local.subpath}/"
          }
          }, {
          match = [{
            uri = {
              prefix = "/${local.subpath}/"
            }
          }]
          rewrite = {
            uri = "/${local.subpath}/"
          }
          route = [
            {
              destination = {
                host = "${local.console_host}.${kubernetes_namespace.minio.metadata[0].name}.svc.cluster.local"
                port = {
                  number = "${local.minio_console_http_port}"
                  name   = "http"
                }
              }
            }
          ]
          }, {
          match = [{
            uri = {
              prefix = "/${local.subpath}/console"
            }
          }],
          rewrite = {
            uri = "/storage/console"
          }
          route = [
            {
              destination = {
                host = "${local.console_host}.${kubernetes_namespace.minio.metadata[0].name}.svc.cluster.local"
                port = {
                  number = "${local.minio_console_http_port}"
                  name   = "http"
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
resource "kubernetes_manifest" "console_destination_rule" {
  manifest = {
    apiVersion = "networking.istio.io/v1beta1"
    kind       = "DestinationRule"
    metadata = {
      name      = "minio-console"
      namespace = "${kubernetes_namespace.minio.metadata[0].name}"
      labels = {
        app = "minio-console"
      }
    }
    spec = {
      host = "${local.console_host}.${kubernetes_namespace.minio.metadata[0].name}.svc.cluster.local"
      trafficPolicy = {
        tls = {
          mode = "DISABLE"
        }
      }
    }
  }
}

resource "kubernetes_manifest" "operator_destination_rule" {
  manifest = {
    apiVersion = "networking.istio.io/v1beta1"
    kind       = "DestinationRule"
    metadata = {
      name      = "minio-operator"
      namespace = "${kubernetes_namespace.minio.metadata[0].name}"
      labels = {
        app = "minio-operator"
      }
    }
    spec = {
      host = "${local.operator_host}.${kubernetes_namespace.minio.metadata[0].name}.svc.cluster.local"
      trafficPolicy = {
        tls = {
          mode = "DISABLE"
        }
      }
    }
  }
}

