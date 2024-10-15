variable namespace {
  type = string
}

variable name {
  type = string
}

variable project_id {
  type = string
}

variable dns_zone_name {
  type = string
}

variable external_hostname {
  type = string
}

variable app_selector {
  type = string
}

variable backend_service_port {
  type = number
}

variable tcp_ports {
  type = list(number)
}

variable min_udp_port {
  type = number
}

variable max_udp_port {
  type = number
}