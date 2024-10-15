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
