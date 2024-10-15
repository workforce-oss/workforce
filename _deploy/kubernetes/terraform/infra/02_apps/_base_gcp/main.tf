module app_iam_policy {
    for_each = var.gke_app_roles
  source = "../../_modules/gke/app_iam_policy"

  google_project_id = var.gke_project_id
  app_name         = each.value.name
  app_namespace    = each.value.namespace
  roles            = each.value.roles
}