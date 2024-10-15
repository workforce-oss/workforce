data google_project project {
  project_id = var.google_project_id
}

locals {
  member = "principal://iam.googleapis.com/projects/${data.google_project.project.number}/locations/global/workloadIdentityPools/${var.google_project_id}.svc.id.goog/subject/ns/${var.app_namespace}/sa/${var.app_name}"
}

resource google_project_iam_binding app {
    for_each = toset(var.roles)
    project = var.google_project_id
    role    = each.value
    members = [
        local.member
    ]  
}