locals {
  repository              = "oci://registry-1.docker.io/bitnamicharts"
  keycloak_admin_username = "admin"
  port_string = var.ingress_port != 443 && var.ingress_port != 80 ? ":${var.ingress_port}" : ""
  base_url = "${var.ingress_protocol}://${var.ingress_domain}${local.port_string}"
}

resource "random_password" "keycloak_admin" {
  length           = 16
  special          = false
  override_special = "_%@"
}

resource "kubernetes_namespace" "keycloak" {
  metadata {
    name = "keycloak"
  }
}

resource "kubernetes_secret" "keycloak_admin_password" {
  metadata {
    name      = "keycloak-admin-password"
    namespace = kubernetes_namespace.keycloak.metadata[0].name
  }

  data = {
    user     = local.keycloak_admin_username
    password = random_password.keycloak_admin.result
  }
}

resource "helm_release" "keycloak" {
  name             = "keycloak"
  repository       = local.repository
  chart            = "keycloak"
  version          = "16.1.5"
  namespace        = kubernetes_namespace.keycloak.metadata[0].name
  create_namespace = false

  values = [yamlencode({
    auth = {
      adminUser         = "${local.keycloak_admin_username}"
      existingSecret    = "${kubernetes_secret.keycloak_admin_password.metadata[0].name}"
      passwordSecretKey = "password"
    }
    podLabels = {
      "sidecar.istio.io/inject" = "true"
    }
    extraEnvVars = [
      {
        name  = "KC_HOSTNAME_URL"
        value = "${local.base_url}/auth"
      },
      {
        name  = "KC_HOSTNAME_ADMIN_URL"
        value = "${local.base_url}/auth"
      }
    ]
  })]
}

resource "kubernetes_manifest" "virtual_service" {
  manifest = {
    apiVersion = "networking.istio.io/v1alpha3"
    kind       = "VirtualService"
    metadata = {
      name      = "keycloak"
      namespace = "${kubernetes_namespace.keycloak.metadata[0].name}"
      labels = {
        app = "keycloak"
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
              exact = "/auth"
            }
          }]
          redirect = {
            uri = "/auth/"
          }
          }, {
          match = [{
            uri = {
              prefix = "/auth/"
            }
          }]
          rewrite = {
            uri = "/"
          }
          route = [
            {
              destination = {
                host = "keycloak.keycloak.svc.cluster.local"
                port = {
                  number = 80
                  name   = "http"
                }
              }
            }
          ]
          }, {
          match = [{
            uri = {
              prefix = "/auth/admin"
            }
          }],
          route = [
            {
              destination = {
                host = "keycloak.keycloak.svc.cluster.local"
                port = {
                  number = 80
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
resource "kubernetes_manifest" "destination_rule" {
  manifest = {
    apiVersion = "networking.istio.io/v1beta1"
    kind       = "DestinationRule"
    metadata = {
      name      = "keycloak"
      namespace = "${kubernetes_namespace.keycloak.metadata[0].name}"
      labels = {
        app = "keycloak"
      }
    }
    spec = {
      host = "keycloak.keycloak.svc.cluster.local"
      trafficPolicy = {
        tls = {
          mode = "DISABLE"
        }
      }
    }
  }
}

