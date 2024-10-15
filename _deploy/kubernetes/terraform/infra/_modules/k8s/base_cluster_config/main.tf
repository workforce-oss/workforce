module "istio" {
  count  = var.istio_enabled ? 1 : 0
  source = "../istio"

  install_gateway              = var.install_istio_gateway
  istio_version                = var.istio_version
  gateway_service_type         = var.istio_gateway_service_type
  create_lb_health_check       = var.create_istio_lb_health_check
  enable_gke_security_policy   = var.enable_gke_security_policy
  enable_ip_source_restriction = var.enable_ip_source_restriction
  allowed_ips                  = var.allowed_ips
}

module "nvidia_operator" {
  count              = var.install_nvidia_operator ? 1 : 0
  install_driver     = var.install_nvidia_driver
  install_toolkit    = var.install_nvidia_toolkit
  enable_timeslicing = var.enable_nvidia_timeslicing
  source             = "../nvidia_operator"
}
