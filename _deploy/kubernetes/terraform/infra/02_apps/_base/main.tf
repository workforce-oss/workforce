locals {
  app_namespaces = toset([for app in var.apps : app.namespace])
  // make the default namespace the first one in the list
  default_namespace = [for app in var.apps : app.namespace][0]

  port_string = var.ingress_port != 80 && var.ingress_port != 443 ? ":${var.ingress_port}" : ""
  base_url    = "${var.ingress_protocol}://${var.ingress_domain}${local.port_string}"
  realm       = keycloak_realm.realm.realm
}


resource "kubernetes_namespace" "app_namespaces" {
  for_each = local.app_namespaces
  metadata {
    name = each.key
  }
}

module "apps" {
  source = "../../_modules/k8s/app"
  # do a foreach of var.apps which is a map
  for_each = var.apps

  app_name                                 = each.key
  additional_labels                        = each.value.additional_labels
  app_image                                = each.value.image
  image_pull_policy                        = each.value.image_pull_policy
  http_port                                = each.value.http_port
  http_supports_websockets                 = each.value.http_supports_websockets
  namespace                                = each.value.namespace
  http_ingress_enabled                     = each.value.http_ingress_enabled
  istio_gateway_ref                        = each.value.istio_gateway_ref
  mount_secrets                            = each.value.mount_secrets
  mount_configmaps                         = each.value.mount_configmaps
  env                                      = each.value.env
  secret_files                             = each.value.secret_files
  tcp_ports                                = each.value.tcp_ports
  udp_ports                                = each.value.udp_ports
  cpu_limit                                = each.value.cpu_limit
  cpu_request                              = each.value.cpu_request
  memory_limit                             = each.value.memory_limit
  memory_request                           = each.value.memory_request
  min_replicas                             = each.value.replicas
  gpu_limit                                = each.value.gpu_limit
  host_aliases                             = each.value.host_aliases
  ingress_domain                           = var.ingress_domain
  prometheus_enabled                       = each.value.prometheus_enabled
  kubernetes_cluster_service_account_rules = each.value.kubernetes_cluster_service_account_rules

  depends_on = [
    kubernetes_namespace.app_namespaces,
    kubernetes_secret.admin_secret,
    kubernetes_secret.keycloak_admin_secret,
    kubernetes_secret.postgres_connection_string,
    kubernetes_secret.redis_password,
    kubernetes_secret.secret_service_private_key,
    kubernetes_secret.secret_service_public_key,
    kubernetes_secret.workforce_api_private_key,
    kubernetes_secret.workforce_api_public_key,
    kubernetes_secret.workforce_engine_private_key,
    kubernetes_secret.workforce_engine_public_key,
    kubernetes_secret.storage_api_private_key,
    kubernetes_secret.storage_api_public_key,
    kubernetes_secret.workforce-api-oauth2,
    kubernetes_secret.workforce-engine-oauth2,
    kubernetes_secret.secret-service-oauth2,
    kubernetes_secret.storage-api-oauth2,
  ]
}
