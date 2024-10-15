variable image {
    type = string
    description = "The nlm-ingestor image to use"
    default = "ghcr.io/nlmatics/nlm-ingestor"
}

variable image_tag {
    type = string
    description = "The nlm-ingestor image tag to use"
    default = "latest"
}

variable service_port {
    type = number
    description = "The port to use for the service"
    default = 80
}

variable request_cpu {
    type = string
    description = "The CPU request for the nlm-ingestor"
    default = "100m"
}

variable request_memory {
    type = string
    description = "The memory request for the nlm-ingestor"
    default = "128Mi"
}

variable limit_cpu {
    type = string
    description = "The CPU limit for the nlm-ingestor"
    default = "200m"
}

variable limit_memory {
    type = string
    description = "The memory limit for the nlm-ingestor"
    default = "256Mi"
}

variable namespace {
    type = string
    description = "The namespace to deploy the nlm-ingestor"
    default = "nlm-ingestor"
}

variable replicas {
    type = number
    description = "The number of replicas to deploy"
    default = 1
}

variable istio_enabled {
    type = bool
    description = "Whether to enable istio for the nlm-ingestor"
    default = true
}