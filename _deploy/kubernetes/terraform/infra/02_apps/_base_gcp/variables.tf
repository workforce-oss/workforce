variable "gke_project_id" {
  type        = string
  description = "The GCP project id."
}

variable "gke_app_roles" {
  type = map(object({
    namespace = string
    name      = string
    roles     = list(string)
  }))

  description = "The gcp roles to assign to workloads"
}