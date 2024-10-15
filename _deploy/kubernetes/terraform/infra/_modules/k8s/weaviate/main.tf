locals {
  repository              = "https://weaviate.github.io/weaviate-helm"
  chart                   = "weaviate"
  chart_version           = "17.1.0"
  weaviate_admin_username = "admin@example.com"
}

resource "kubernetes_namespace" "weaviate" {
  metadata {
    name = "weaviate"
  }
}

resource "random_password" "weaviate_admin_api_key" {
  length           = 16
  special          = false
}

resource "kubernetes_secret" "weaviate_admin_api_key" {
  metadata {
    name      = "weaviate-admin-api-key"
    namespace = kubernetes_namespace.weaviate.metadata[0].name
  }

  data = {
    AUTHENTICATION_APIKEY_ALLOWED_KEYS = random_password.weaviate_admin_api_key.result
    api_key                            = random_password.weaviate_admin_api_key.result
  }
}



resource "helm_release" "weaviate" {
  name             = "weaviate"
  repository       = local.repository
  chart            = local.chart
  version          = local.chart_version
  namespace        = kubernetes_namespace.weaviate.metadata[0].name

  create_namespace = false

  values = [yamlencode({
    annotations = {
      "v" = "3"
    }
    service = {
      type = "ClusterIP"
    }
    grpcService = {
      enabled = true
      type    = "ClusterIP"
    }

    storage = {
        size = "${var.storage_size}"
    }
   
    env = {
        AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED = "false"
        AUTHENTICATION_APIKEY_ENABLED = "true"
        AUTHENTICATION_APIKEY_USERS = "${local.weaviate_admin_username}"

    }
    envSecrets = {
      AUTHENTICATION_APIKEY_ALLOWED_KEYS = "${kubernetes_secret.weaviate_admin_api_key.metadata[0].name}"
    }
  })]

  depends_on = [
    kubernetes_secret.weaviate_admin_api_key
  ]

  timeout = 60
}

resource "kubernetes_manifest" "virtual_service" {
  manifest = {
    apiVersion = "networking.istio.io/v1alpha3"
    kind       = "VirtualService"
    metadata = {
      name      = "weaviate-http"
      namespace = "${kubernetes_namespace.weaviate.metadata[0].name}"
      labels = {
        app = "weaviate"
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
              exact = "/weaviate"
            }
          }]
          redirect = {
            uri = "/weaviate/"
          }
          }, {
          match = [{
            uri = {
              prefix = "/weaviate/"
            }
          }]
          rewrite = {
            uri = "/"
          }
          route = [
            {
              destination = {
                host = "weaviate.weaviate.svc.cluster.local"
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

resource "kubernetes_manifest" "destination_rule" {
  manifest = {
    apiVersion = "networking.istio.io/v1beta1"
    kind       = "DestinationRule"
    metadata = {
      name      = "weaviate"
      namespace = "${kubernetes_namespace.weaviate.metadata[0].name}"
      labels = {
        app = "weaviate"
      }
    }
    spec = {
      host = "weaviate.weaviate.svc.cluster.local"
      trafficPolicy = {
        tls = {
          mode = "DISABLE"
        }
      }
    }
  }
}
