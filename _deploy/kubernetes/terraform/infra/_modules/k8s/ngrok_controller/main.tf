locals {
  repository = "https://charts.ngrok.com"
}

resource "kubernetes_namespace" "ngrok" {
  metadata {
    name = "ngrok-ingress-controller"
  }
}

resource "helm_release" "ngrok" {
  name             = "ngrok"
  repository       = local.repository
  force_update     = true
  chart            = "kubernetes-ingress-controller"
  namespace        = kubernetes_namespace.ngrok.metadata[0].name
  create_namespace = false


  set {
    name  = "credentials.apiKey"
    value = var.ngrok_api_key
  }

  set {
    name  = "credentials.authtoken"
    value = var.ngrok_auth_token
  }
}
