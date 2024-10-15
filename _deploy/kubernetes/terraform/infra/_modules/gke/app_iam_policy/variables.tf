variable google_project_id {
  description = "The Google Cloud project ID"
  type        = string
}

variable app_name {
  description = "The name of the application"
  type        = string
}

variable app_namespace {
  description = "The namespace of the application"
  type        = string
}



variable roles {
  description = "The roles to assign to the service account"
  type        = list(string)
}