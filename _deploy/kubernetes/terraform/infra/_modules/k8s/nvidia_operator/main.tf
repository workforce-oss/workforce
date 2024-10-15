locals {
  repository = "https://nvidia.github.io/gpu-operator"
  values = templatefile("${path.module}/values.yaml", {
    install_driver = "${var.install_driver}"
    install_toolkit = "${var.install_toolkit}"
  })
}

resource "helm_release" "operator" {
  name             = "gpu-operator"
  repository       = local.repository
  chart            = "gpu-operator"
  namespace        = "kube-system"
  create_namespace = false
  values = [
    local.values
  ]
}
