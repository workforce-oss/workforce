variable "install_gateway" {
  type        = bool
  description = "Whether to install the Istio gateway."
  default     = true
}

variable "create_lb_health_check" {
  type        = bool
  description = "Whether to create a load balancer health check."
  default     = true
}

variable "istio_version" {
  type        = string
  description = "The version of Istio to install."
}

variable "gateway_service_type" {
  type        = string
  description = "The type of service to create for the gateway."
  default     = "LoadBalancer"
}

variable "enable_gke_security_policy" {
  type        = bool
  description = "Whether to enable the GKE security policy."
  default     = false
}

variable enable_ip_source_restriction {
  type = bool

  default = false
}

variable "allowed_ips" {
  type = list(string)

  default = []
}