variable "cluster_name" {
  type        = string
  description = "The name of the cluster."
  default     = "primary"
}

variable "istio_enabled" {
  type        = bool
  description = "Whether to enable Istio."
  default     = false
}

variable "istio_version" {
  type        = string
  description = "The Istio version to install."
  default     = "1.4.3"
}

variable "istio_gateway_service_type" {
  type        = string
  description = "The type of loadbalancer to use for Istio."
  default     = "LoadBalancer"
}

variable "install_istio_gateway" {
    type        = bool
    description = "Whether to install the Istio gateway."
    default     = false
}

variable "create_istio_lb_health_check" {
    type        = bool
    description = "Whether to create a load balancer health check."
    default     = true
}

variable "install_nvidia_operator" {
    type        = bool
    description = "Whether to install the Nvidia operator."
    default     = false
}

variable "install_nvidia_driver" {
    type        = bool
    description = "Whether to install the Nvidia driver."
    default     = false
}

variable "install_nvidia_toolkit" {
    type        = bool
    description = "Whether to install the Nvidia toolkit."
    default     = false
}

variable "enable_nvidia_timeslicing" {
    type        = bool
    description = "Whether to enable Nvidia timeslicing."
    default     = false
}

variable "enable_gke_security_policy" {
    type        = bool
    description = "Whether to enable the GKE security policy."
    default     = false
}

variable "enable_ip_source_restriction" {
  type        = bool
  description = "Whether to enable IP source restriction."
  default     = false
}

variable "allowed_ips" {
  type        = list(string)
  description = "The allowed IPs."
  default     = []
}

variable "enable_ngrok" {
  type        = bool
  description = "Whether to enable ngrok"
  default     = false
}

variable "ngrok_api_key" {
  type        = string
  description = "The ngrok api key"
  default = ""
}

variable "ngrok_auth_token" {
  type        = string
  description = "The ngrok auth token"
  default = ""
}



