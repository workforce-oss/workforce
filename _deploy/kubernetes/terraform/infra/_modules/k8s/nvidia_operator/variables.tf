variable "cluster_name" {
    type        = string
    description = "The name of the cluster."
    default     = "primary"
}

variable "namespace" {
    type        = string
    description = "The namespace to deploy the application to."

    default = "gpu-operator"
}

variable "install_driver" {
    type        = bool
    description = "Whether to install the GPU driver."
    default     = false
}

variable "install_toolkit" {
    type        = bool
    description = "Whether to install the GPU toolkit."
    default     = false
}

variable "enable_timeslicing" {
    type        = bool
    description = "Whether to enable timeslicing."
    default     = false
}