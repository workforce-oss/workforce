variable cpu_request {
    type        = string
    description = "The cpu request for the application."
    default     = "100m"
}

variable cpu_limit {
    type        = string
    description = "The cpu limit for the application."
    default     = "1000m"
}

variable memory_request {
    type        = string
    description = "The memory request for the application."
    default     = "128Mi"
}

variable memory_limit {
    type        = string
    description = "The memory limit for the application."
    default     = "512Mi"
}

variable gpu_limit {
    type = number
    description = "The number of gpus to request."

    default = 0
}

variable app_name {
    type        = string
    description = "The name of the application."
}

variable app_image {
    type        = string
    description = "The image of the application."
}

variable additional_labels {
    type        = map(string)
    description = "Additional labels to add to the deployment."

    default = {}
}

variable http_port {
    type        = number
    description = "The ports the application listens on."

    default = 0
}

variable http_supports_websockets {
    type        = bool
    description = "Whether the application supports websockets."

    default = false
}

variable http_ingress_enabled{
    type        = bool
    description = "Whether to enable http ingress for the application."
}

variable tcp_ports {
    type        = set(number)
    description = "The ports the application listens on."

    default = []
}

variable tcp_ingress_ports {
    type        = set(number)
    description = "TCP Ports to expose via ingress."

    default = []
}

variable udp_ports {
    type        = set(number)
    description = "The ports the application listens on."

    default = []
}

variable min_replicas {
    type        = number
    description = "The number of replicas to deploy."
    default     = 1
}

variable namespace {
    type        = string
    description = "The namespace to deploy the application to."
}

variable ingress_domain {
    type        = string
    description = "The domain to use for ingress."

    default = ""
}

variable istio_gateway_ref {
    type        = string
    description = "The name of the istio gateway to use."

    default = ""
}

variable mount_secrets {
    type = set(string)
    description = "The secrets to mount."

    default = []
}

variable mount_configmaps {
    type = set(string)
    description = "The configmaps to mount."

    default = []
}

variable env {
    type = map(string)
    description = "The environment variables to set."

    default = {}
}

variable secret_files {
    type = map(object({
        mount_path = string
        secret_key = string
    }))
    description = "The secret files to mount (secret name to file name)."

    default = {}
}

variable host_aliases {
    type = map(string)
    description = "The host aliases to set (host to ip)."

    default = {}
}

variable wildcard_virtual_service {
    type = bool
    description = "Whether to create a wildcard virtual service for the application."

    default = false
}

variable metrics_path {
    type = string
    description = "The path to use for metrics."

    default = "/metrics"
}

variable prometheus_enabled {
    type = bool
    description = "Whether to enable prometheus for the application."

    default = false
}

variable kubernetes_cluster_service_account_rules {
    type = list(object({
        api_groups = list(string)
        resources  = list(string)
        verbs      = list(string)
    }))
    description = "The rules to apply to the service account."

    default = []
}

