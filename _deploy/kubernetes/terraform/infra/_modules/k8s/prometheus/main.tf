locals {
  repository    = "https://prometheus-community.github.io/helm-charts"
  chart         = "kube-prometheus-stack"
  chart_version = "56.21.3"
}

resource "kubernetes_namespace" "prometheus" {
  metadata {
    name = "prometheus"
  }
}

resource "helm_release" "prometheus" {
  name             = "prometheus"
  repository       = local.repository
  chart            = local.chart
  version          = local.chart_version
  namespace        = kubernetes_namespace.prometheus.metadata[0].name
  create_namespace = false

  values = [yamlencode({
    prometheus = {
      enabled = true
      ingress = {
        path = "/prometheus"
      }
      prometheusSpec = {
        serviceMonitorSelectorNilUsesHelmValues = false
      }
    }
    alertmanager = {
      enabled = false
    }
    kubeStateMetrics = {
      enabled = true
    }
    nodeExporter = {
      enabled = true
    }
    grafana = {
      enabled = true
      ingress = {
        path = "/grafana"
      }
      env = {
        GF_SERVER_DOMAIN = "${var.ingress_domain}"
        GF_SERVER_ROOT_URL = "https://${var.ingress_domain}/grafana"
        GF_SERVER_SERVE_FROM_SUB_PATH = "true"
      }
    }
  })]
}

resource "kubernetes_manifest" "virtual_service" {
  manifest = {
    apiVersion = "networking.istio.io/v1alpha3"
    kind       = "VirtualService"
    metadata = {
      name      = "grafana"
      namespace = "${kubernetes_namespace.prometheus.metadata[0].name}"
      labels = {
        app = "grafana"
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
              exact = "/grafana"
            }
          }]
          redirect = {
            uri = "/grafana/"
          }
          }, {
          match = [{
            uri = {
              prefix = "/grafana/"
            }
          }]
          route = [
            {
              destination = {
                host = "prometheus-grafana.prometheus.svc.cluster.local"
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

resource "kubernetes_manifest" "virtual_service_prometheus" {
  manifest = {
    apiVersion = "networking.istio.io/v1alpha3"
    kind       = "VirtualService"
    metadata = {
      name      = "prometheus"
      namespace = "${kubernetes_namespace.prometheus.metadata[0].name}"
      labels = {
        app = "prometheus"
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
              exact = "/prometheus"
            }
          }]
          redirect = {
            uri = "/prometheus/"
          }
          }, {
          match = [{
            uri = {
              prefix = "/prometheus/"
            }
          }]
          rewrite = {
            uri = "/"
          }
          route = [
            {
              destination = {
                host = "prometheus.prometheus.svc.cluster.local"
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
      name      = "grafana"
      namespace = "${kubernetes_namespace.prometheus.metadata[0].name}"
      labels = {
        app = "grafana"
      }
    }
    spec = {
      host = "prometheus-grafana.prometheus.svc.cluster.local"
      trafficPolicy = {
        tls = {
          mode = "DISABLE"
        }
      }
    }
  }
}

resource "kubernetes_manifest" "destination_rule_prometheus" {
  manifest = {
    apiVersion = "networking.istio.io/v1beta1"
    kind       = "DestinationRule"
    metadata = {
      name      = "prometheus"
      namespace = "${kubernetes_namespace.prometheus.metadata[0].name}"
      labels = {
        app = "prometheus"
      }
    }
    spec = {
      host = "prometheus.prometheus.svc.cluster.local"
      trafficPolicy = {
        tls = {
          mode = "DISABLE"
        }
      }
    }
  }
}
