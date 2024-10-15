module "base_cluster_config" {
  source = "../../_modules/k8s/base_cluster_config"

  istio_enabled                = var.istio_enabled
  install_istio_gateway        = var.install_istio_gateway
  istio_version                = var.istio_version
  istio_gateway_service_type   = var.enable_ngrok ? "ClusterIP" : var.istio_gateway_service_type
  install_nvidia_operator      = var.install_nvidia_operator
  install_nvidia_driver        = var.install_nvidia_driver
  install_nvidia_toolkit       = var.install_nvidia_toolkit
  enable_nvidia_timeslicing    = var.enable_nvidia_timeslicing
  create_istio_lb_health_check = var.create_istio_lb_health_check

  enable_gke_security_policy   = var.enable_gke_security_policy
  enable_ip_source_restriction = var.enable_ip_source_restriction
  allowed_ips                  = var.allowed_ips
  
}

module "ngrok" {
  count = var.enable_ngrok ? 1 : 0
  source = "../../_modules/k8s/ngrok_controller"

  ngrok_api_key = var.ngrok_api_key
  ngrok_auth_token = var.ngrok_auth_token
}
