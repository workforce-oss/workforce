variable namespace {
  type = string
}

variable name {
  type = string
}

variable project_id {
  type = string
}

variable dns_project_id {
  type = string
}

variable dns_zone_name {
  type = string
}

variable external_hostname {
  type = string
}

variable use_letsencrypt {
  type = bool
}

variable backend_service_name {
  type = string
}

variable backend_service_port {
  type = number
}

variable "acme_email" {
  type = string

  default = "jeffjoneson@robot.dev"
}