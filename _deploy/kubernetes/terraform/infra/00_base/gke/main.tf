module "base" {
  source = "../_base"

  istio_enabled                = var.istio_enabled
  install_istio_gateway        = var.install_istio_gateway
  istio_version                = var.istio_version
  istio_gateway_service_type   = var.istio_gateway_service_type
  create_istio_lb_health_check = var.create_istio_lb_health_check
  install_nvidia_driver        = var.install_nvidia_driver
  install_nvidia_toolkit       = var.install_nvidia_toolkit
  install_nvidia_operator      = var.install_nvidia_operator
  enable_nvidia_timeslicing    = var.enable_nvidia_timeslicing

  enable_gke_security_policy   = var.enable_gke_security_policy
  enable_ip_source_restriction = var.enable_ip_source_restriction
  allowed_ips                  = var.allowed_ips
  scale_istio_to_zero          = var.scale_istio_to_zero
}
