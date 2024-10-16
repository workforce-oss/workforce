cluster_name            = "primary"
istio_ingress_namespace = "istio-ingress"
ingress_protocol        = "https"
ingress_port            = 443
weaviate_enabled        = true

workforce_admin_secret_data = {
  ADMIN_EMAIL = "admin@example.com"
  ADMIN_PASSWORD = "admin"
  ADMIN_USERNAME = "admin"
}

apps = {
  "secret-service" = {
    name                     = "secret-service"
    namespace                = "apps"
    image                    = "ghcr.io/workforce-oss/workforce-server:latest"
    http_port                = 3000
    replicas                 = 1
    memory_request           = "256Mi"
    memory_limit             = "512Mi"
    mount_secrets = [
      "postgres-connection-string",
      "secret-service-oauth2"
    ]
    secret_files = {
      "secret-service-private-key" = {
        mount_path = "/secrets/secret-service-private-key.pem"
        secret_key = "secret-service-private-key.pem"
      }
      "secret-service-public-key" = {
        mount_path = "/secrets/secret-service-public-key.pem"
        secret_key = "secret-service-public-key.pem"
      }
      "workforce-engine-public-key" = {
        mount_path = "/secrets/workforce-engine-public-key.pem"
        secret_key = "workforce-engine-public-key.pem"
      }
      "storage-api-public-key" = {
        mount_path = "/secrets/storage-api-public-key.pem"
        secret_key = "storage-api-public-key.pem"
      }
      "workforce-api-public-key" = {
        mount_path = "/secrets/workforce-api-public-key.pem"
        secret_key = "workforce-api-public-key.pem"
      }
    }
    env = {
      ENV_NAME = "local.k8s"
      PORT     = "3000"
      COMPONENT_NAME = "workforce-secrets-api"

      ENCRYPTION_PRIVATE_KEY  = "/secrets/secret-service-private-key.pem"
      ENCRYPTION_PUBLIC_KEY   = "/secrets/secret-service-public-key.pem"
      WORKFORCE_ENGINE_PUBLIC_KEY = "/secrets/workforce-engine-public-key.pem"
      WORKFORCE_API_PUBLIC_KEY    = "/secrets/workforce-api-public-key.pem"
      STORAGE_API_PUBLIC_KEY = "/secrets/storage-api-public-key.pem"
    }
  }

  "workforce-api" = {
    name                     = "workforce-api"
    namespace                = "apps"
    image                    = "ghcr.io/workforce-oss/workforce-server:latest"
    http_port                = 3000
    http_supports_websockets = false
    additional_labels        = {}

    replicas             = 1
    memory_limit         = "512Mi"
    memory_request       = "256Mi"
    http_ingress_enabled = true
    istio_gateway_ref    = "istio-ingress/default-gateway"
    prometheus_enabled   = true
    mount_secrets = [
      "postgres-connection-string",
      "redis-password",
      "workforce-api-oauth2",
      "keycloak-admin-secret",
    ]
    secret_files = {
      "workforce-api-private-key" = {
        mount_path = "/secrets/workforce-api-private-key.pem"
        secret_key = "workforce-api-private-key.pem"
      }
      "workforce-api-public-key" = {
        mount_path = "/secrets/workforce-api-public-key.pem"
        secret_key = "workforce-api-public-key.pem"
      }
      "secret-service-public-key" = {
        mount_path = "/secrets/secret-service-public-key.pem"
        secret_key = "secret-service-public-key.pem"
      }
    }
    env = {
      ENV_NAME       = "local.k8s"
      COMPONENT_NAME = "workforce-rest-api,workforce-async-api"
      PORT           = "3000"
      LOG_LEVEL      = "debug"

      SECRET_SERVICE_URI = "http://secret-service"

      ENCRYPTION_PRIVATE_KEY = "/secrets/workforce-api-private-key.pem"
      ENCRYPTION_PUBLIC_KEY  = "/secrets/workforce-api-public-key.pem"
      SECRET_SERVICE_PUBLIC_KEY = "/secrets/secret-service-public-key.pem"

      BROKER_MODE     = "redis"
      BROKER_URI      = "redis://redis-master.redis:6379"
      BROKER_USERNAME = "workforce-api"

      CACHE_MODE = "redis"
      CACHE_URI  = "redis://redis-master.redis:6379"
      CACHE_USERNAME = "workforce-api"
    }

  }

  "workforce-engine" = {
    name                     = "workforce-engine"
    namespace                = "apps"
    image                    = "ghcr.io/workforce-oss/workforce-server:latest"
    http_port                = 3000
    replicas                 = 1
    memory_limit             = "512Mi"
    memory_request           = "256Mi"
    prometheus_enabled       = true
    mount_secrets = [
      "postgres-connection-string",
      "redis-password",
      "weaviate-admin-api-key",
      "workforce-engine-oauth2",
      "keycloak-admin-secret",
      "workforce-admin-secret",
    ]
    secret_files = {
      "workforce-engine-private-key" = {
        mount_path = "/secrets/workforce-engine-private-key.pem"
        secret_key = "workforce-engine-private-key.pem"
      }
      "workforce-engine-public-key" = {
        mount_path = "/secrets/workforce-engine-public-key.pem"
        secret_key = "workforce-engine-public-key.pem"
      }
      "secret-service-public-key" = {
        mount_path = "/secrets/secret-service-public-key.pem"
        secret_key = "secret-service-public-key.pem"
      }
    }
    env = {
      ENV_NAME       = "local.k8s"
      COMPONENT_NAME = "workforce-engine"
      LOG_LEVEL      = "debug"
      PORT           = "3000"

      SECRET_SERVICE_URI = "http://secret-service"

      ENCRYPTION_PRIVATE_KEY = "/secrets/workforce-engine-private-key.pem"
      ENCRYPTION_PUBLIC_KEY  = "/secrets/workforce-engine-public-key.pem"
      SECRET_SERVICE_PUBLIC_KEY    = "/secrets/secret-service-public-key.pem"

      BROKER_MODE     = "redis"
      BROKER_URI      = "redis://redis-master.redis:6379"
      BROKER_USERNAME = "workforce-engine"

      CACHE_MODE = "redis"
      CACHE_URI  = "redis://redis-master.redis:6379"
      CACHE_USERNAME = "workforce-engine"


      VECTOR_DB_SCHEME = "http"
      VECTOR_DB_HOST   = "weaviate.weaviate.svc.cluster.local"
      VECTOR_DB_PORT   = "80"

      NLM_INGESTOR_HOST = "nlm-ingestor.nlm-ingestor.svc.cluster.local"
      
      STORAGE_API_URI = "http://storage-api"
    }
  }
  "workforce-ui" = {
    name                     = "workforce-ui"
    namespace                = "apps"
    image                    = "ghcr.io/workforce-oss/workforce-ui:latest"
    http_port                = 8085
    replicas                 = 1
    memory_limit             = "512Mi"
    memory_request           = "128Mi"
    http_ingress_enabled     = true
    istio_gateway_ref        = "istio-ingress/default-gateway"
  }

  "storage-api" = {
    name                     = "storage-api"
    namespace                = "apps"
    image                    = "ghcr.io/workforce-oss/workforce-storage-api:latest"
    http_port                = 3000
    http_supports_websockets = true
    replicas                 = 1
    memory_limit             = "512Mi"
    memory_request           = "256Mi"
    http_ingress_enabled     = true
    istio_gateway_ref        = "istio-ingress/default-gateway"
    prometheus_enabled       = true
    mount_secrets = [
      "storage-api-oauth2",
      "weaviate-admin-api-key",
      "postgres-connection-string",
      "redis-password",
    ]
    secret_files = {
      "storage-api-private-key" = {
        mount_path = "/secrets/storage-api-private-key.pem"
        secret_key = "storage-api-private-key.pem"
      }
      "storage-api-public-key" = {
        mount_path = "/secrets/storage-api-public-key.pem"
        secret_key = "storage-api-public-key.pem"
      }
      "secret-service-public-key" = {
        mount_path = "/secrets/secret-service-public-key.pem"
        secret_key = "secret-service-public-key.pem"
      }
    }
    env = {
      ENV_NAME       = "local.k8s"
      COMPONENT_NAME = "storage-api"
      LOG_LEVEL      = "debug"
      PORT           = "3000"

      SECRET_SERVICE_URI = "http://secret-service"

      ENCRYPTION_PRIVATE_KEY = "/secrets/storage-api-private-key.pem"
      ENCRYPTION_PUBLIC_KEY  = "/secrets/storage-api-public-key.pem"
      SECRET_SERVICE_PUBLIC_KEY    = "/secrets/secret-service-public-key.pem"

      BROKER_MODE     = "redis"
      BROKER_URI      = "redis://redis-master.redis:6379"
      BROKER_USERNAME = "workforce-engine"

      VECTOR_DB_SCHEME = "http"
      VECTOR_DB_HOST   = "weaviate.weaviate.svc.cluster.local"
      VECTOR_DB_PORT   = "80"

      NLM_INGESTOR_HOST = "nlm-ingestor.nlm-ingestor.svc.cluster.local"
    }
  }
}
