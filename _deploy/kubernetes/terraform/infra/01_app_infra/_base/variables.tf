variable "cluster_name" {
  type        = string
  description = "The name of the cluster."
  default     = "primary"
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

variable "redis_users" {
  type        = list(string)
  description = "list of users to create in redis"
  default     = []
}

variable "enable_stunner" {
  type        = bool
  description = "Whether to enable stunner"
  default     = false
}

variable "stunner_backend_service_name" {
  type        = string
  description = "The name of the backend service."

  default = ""
}

variable "stunner_backend_namespace" {
  type        = string
  description = "The namespace of the backend service."

  default = ""
}

variable "enable_coturn" {
  type        = bool
  description = "Whether to enable coturn"
  default     = false
}

variable "ingress_domain" {
  type        = string
  description = "The domain to use for ingress"
}

variable "ingress_protocol" {
  type        = string
  description = "The protocol to use for ingress"
}

variable "ingress_port" {
  type        = number
  description = "The port to use for ingress"
}

variable "enable_minio" {
  type        = bool
  description = "Whether to enable minio"
  default     = false
}

variable "enable_weaviate" {
  type        = bool
  description = "Whether or not to enable weaviate"
}

variable "weaviate_storage_size" {
  type        = string
  description = "The size of the storage for weaviate"
  default     = "10Gi"
}

variable "enable_nlm_ingestor" {
  type        = bool
  description = "Whether to enable nlm ingestor"
  default     = true
}

variable "enable_prometheus_stack" {
  type        = bool
  description = "Whether to enable the prometheus stack"
  default     = false
}

variable "enable_ngrok" {
  type        = bool
  description = "Whether to enable ngrok"
  default     = false
}


