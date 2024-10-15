variable namespace {
  type = string
  description = "Namespace where the secret is stored."
}

variable "name" {
    type = string
    description = "Name of the secret."
}

variable "key" {
    type = string
    description = "Key of the secret."
}