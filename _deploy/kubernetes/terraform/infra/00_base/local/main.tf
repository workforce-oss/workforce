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
  scale_istio_to_zero          = var.scale_istio_to_zero

  enable_ngrok     = var.enable_ngrok
  ngrok_api_key    = var.ngrok_api_key
  ngrok_auth_token = var.ngrok_auth_token
}
