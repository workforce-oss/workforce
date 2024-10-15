variable "cluster_name" {
  type        = string
  description = "The name of the cluster."
  default     = "primary"
}

variable "gke_project_id" {
  type        = string
  description = "The GCP project id."
  default    = ""
}

variable "project_id" {
  type        = string
  description = "The GCP project id."

  default = ""
}

variable "region" {
  type        = string
  description = "The GCP region."

  default = "us-central1"
}

variable "istio_ingress_namespace" {
  type        = string
  description = "The namespace for the istio ingress gateway."
  default     = "istio-ingress"
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

variable "turn_server" {
  type        = string
  description = "The turn server to use for coturn"
  default     = ""
}

variable "weaviate_enabled" {
  type        = bool
  description = "Whether to enable weaviate"  
}

variable "postgres_secret_data" {
  type = object({
    namespace   = string
    secret_name = string
    secret_key  = string
  })

  description = "Data to retrieve the postgres connection string."

  default = {
    namespace   = "postgres"
    secret_name = "app-connection-string"
    secret_key  = "connection_string"
  }
}

variable "redis_secret_data" {
  type = object({
    namespace   = string
    secret_name = string
    secret_key  = string
  })

  description = "Data to retrieve the redis password."

  default = {
    namespace   = "redis"
    secret_name = "redis"
    secret_key  = "redis-password"
  }
}

variable "workforce_admin_secret_data" {
  type = object({
    ADMIN_USERNAME = string
    ADMIN_PASSWORD = string
    ADMIN_EMAIL    = string
  })
}

variable "apps" {
  type = map(object({
    name                     = string
    namespace                = string
    image                    = string
    http_port                = number
    http_supports_websockets = optional(bool, false)
    http_ingress_enabled     = optional(bool, false)
    additional_labels        = optional(map(string), {})
    tcp_ports                = optional(set(number), [])
    udp_ports                = optional(set(number), [])
    replicas                 = number
    istio_gateway_ref        = optional(string, "")
    mount_secrets            = optional(set(string), [])
    mount_configmaps         = optional(set(string), [])
    env                      = optional(map(string), {})
    secret_files = optional(map(object({
      mount_path = string
      secret_key = string
    })), {})
    cpu_limit      = optional(string, "")
    cpu_request    = optional(string, "")
    memory_limit   = string
    memory_request = string
    gpu_limit      = optional(number, 0)
    host_aliases   = optional(map(string), {})
    prometheus_enabled = optional(bool, false)
    kubernetes_cluster_service_account_rules = optional(list(object({
        api_groups = list(string)
        resources  = list(string)
        verbs      = list(string)
    })), [])
  }))

  description = "The applications to deploy."
  default     = {}
}
