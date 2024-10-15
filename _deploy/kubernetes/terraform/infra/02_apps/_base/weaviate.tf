module "weaviate_api_key" {
    count = var.weaviate_enabled ? 1 : 0

    source = "../../_modules/k8s/secret_value"

    namespace = var.weaviate_secret_data.namespace
    name      = var.weaviate_secret_data.secret_name
    key       = var.weaviate_secret_data.secret_key
}

resource kubernetes_secret weaviate_secret {
    count = var.weaviate_enabled ? 1 : 0

    metadata {
        name = "weaviate-admin-api-key"
        namespace = "apps"
    }

    data = {
        "VECTOR_DB_API_KEY" = module.weaviate_api_key[0].value
    }
}