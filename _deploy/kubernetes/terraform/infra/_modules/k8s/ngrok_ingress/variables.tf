variable "ingress_domain" {
  description = "The domain to use for ingress"
  type        = string
}

variable "namespace" {
  description = "The namespace to deploy the ingress"
  type        = string
}

variable "service_name" {
  description = "The name of the service to expose"
  type        = string
}

variable "service_port" {
  description = "The port of the service to expose"
  type        = number
}
