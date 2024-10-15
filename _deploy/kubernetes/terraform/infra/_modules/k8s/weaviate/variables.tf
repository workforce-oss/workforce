variable storage_size {
    type = string
    description = "The size of the storage (e.g. 10Gi)"
}

variable "ingress_domain" {
  type = string
}

variable "ingress_protocol" {
  type = string
}

variable "ingress_port" {
  type = number
}

variable "istio_gateway_ref" {
  type = string

  default = "istio-ingress/default-gateway"
}