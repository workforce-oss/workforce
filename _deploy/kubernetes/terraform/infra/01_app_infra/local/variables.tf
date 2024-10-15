variable "cluster_name" {
  type        = string
  description = "The name of the cluster."
  default     = "primary"
}

variable "mode" {
  type        = string
  description = "The mode of the cluster. Valid values are 'local' and 'cloud'."
  default     = "local"

  validation {
    condition     = contains(["local", "cloud"], var.mode)
    error_message = "Invalid mode. Valid values are 'local' and 'cloud'."
  }
}

variable "istio_ingress_namespace" {
  type        = string
  description = "The namespace for the istio ingress gateway."
  default     = "istio-ingress"
}

variable "redis_users" {
  type = list(string)
  description = "list of users to create in redis"
  default = []
}

variable "enable_coturn" {
  type = bool
  description = "Whether to enable coturn"
  default = false
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

variable deploy_local_coturn_lb {
  type = bool
  description = "Whether to deploy a local coturn loadbalancer"
  default = false
}

variable "ingress_domain" {
  type = string
  description = "The domain to use for ingress"
}

variable "ingress_protocol" {
  type = string
  description = "The protocol to use for ingress"
}

variable "ingress_port" {
  type = number
  description = "The port to use for ingress"
}

variable "enable_minio" {
  type = bool
  description = "Whether to enable minio"
  default = false
}

variable "enable_weaviate" {
  type = bool
  description = "Whether to enable weaviate"
  default = false
}

variable "weaviate_storage_size" {
  type = string
  description = "The size of the weaviate storage"
  default = "1Gi"
}

variable "enable_nlm_ingestor" {
  type = bool
  description = "Whether to enable nlm-ingestor"
  default = true
}

variable "enable_prometheus_stack" {
  type = bool
  description = "Whether to enable the prometheus stack"
  default = false
}

variable "enable_ngrok" {
  type        = bool
  description = "Whether to enable ngrok"
  default     = false
}
