variable "project_id" {
  type        = string
  description = "The project ID."
}

variable "region" {
  type        = string
  description = "The region to deploy to."
}

variable network_name {
    type        = string
    description = "The network name."
}

variable "subnetwork_name" {
  type        = string
  description = "The subnetwork name."
}

variable "dns_zone_name" {
    type        = string
    description = "The DNS zone name."
}

variable "external_hostname" {
    type        = string
    description = "The hostname to use for the loadbalancer."
}

variable image {
    type        = string
    description = "The image of the application."

    default = "coturn/coturn:4.6.2-alpine"
}

variable realm {
    type        = string
    description = "The realm to use for coturn."

    default = "turn"
}

variable ports {
    type = object({
      min = number
      max = number
      plaintext = number
      tls = number
    })

    description = "The ports to expose."

    default = {
      min = 49152
      max = 65535
      plaintext = 3478
      tls = 5349
    }
}

variable disable_local_peers {
    type        = bool
    description = "Whether to disable local peers."

    default = false
}
