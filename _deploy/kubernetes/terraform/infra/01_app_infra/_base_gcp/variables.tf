variable "project_id" {
  type        = string
  description = "The project ID."
}

variable "region" {
  type        = string
  description = "The region to deploy to."
}

variable "network_name" {
  type        = string
  description = "The network name."
}

variable "subnetwork_name" {
  type        = string
  description = "The subnetwork name."
}

variable "istio_ingress_namespace" {
  type        = string
  description = "The namespace for the istio ingress gateway."
  default     = "istio-ingress"
}

variable "istio_service_port" {
  type        = number
  description = "The port for the istio ingress gateway."
  default     = 8090
}

variable "enable_coturn_vm" {
  type       = bool
  description = "Whether to enable the coturn VM."

  default = false
}

variable "enable_gke_external_http_loadbalancer" {
  type        = bool
  description = "Whether to enable the GKE external HTTP loadbalancer."
}

variable "enable_gke_external_l4_loadbalancer" {
  type        = bool
  description = "Whether to enable the GKE external L4 loadbalancer."
}

variable "coturn_tcp_ports" {
    type = list(number)
    description = "list of tcp ports to use for coturn"
    default = []
}

variable "coturn_min_udp_port" {
  type = number
  description = "The minimum UDP port to use for coturn"
  default = 49152
}

variable "coturn_max_udp_port" {
  type = number
  description = "The maximum UDP port to use for coturn"
  default = 65535
}

variable "use_letsencrypt" {
  type        = bool
  description = "Whether to use Let's Encrypt for the GKE external HTTP loadbalancer."
  default     = true
}

variable "acme_email" {
  type        = string
  description = "The email address to use for Let's Encrypt."
}

variable "turn_domain" {
  type = string
  description = "The domain to use for turn"
}

variable "ingress_domain" {
  type = string
  description = "The domain to use for ingress"
}

variable "dns_zone_name" {
  type = string
  description = "The DNS zone name"
}

variable "dns_project_id" {
  type = string
  description = "The project ID for the DNS zone"
}