module "secret_service_keypair" {
  source = "../../_modules/crypto/rsa_keypair"
}

module "workforce_engine_keypair" {
  source = "../../_modules/crypto/rsa_keypair"
}

module "workforce_api_keypair" {
  source = "../../_modules/crypto/rsa_keypair"
}

module "storage_api_keypair" {
  source = "../../_modules/crypto/rsa_keypair"
}

resource "kubernetes_secret" "secret_service_private_key" {
  metadata {
    name      = "secret-service-private-key"
    namespace = "apps"
  }

  data = {
    "secret-service-private-key.pem" = module.secret_service_keypair.private_key_pem
  }
}

resource "kubernetes_secret" "secret_service_public_key" {
  metadata {
    name      = "secret-service-public-key"
    namespace = "apps"
  }

  data = {
    "secret-service-public-key.pem" = module.secret_service_keypair.public_key_pem
  }
}

resource "kubernetes_secret" "workforce_engine_private_key" {
  metadata {
    name      = "workforce-engine-private-key"
    namespace = "apps"
  }

  data = {
    "workforce-engine-private-key.pem" = module.workforce_engine_keypair.private_key_pem
  }
}

resource "kubernetes_secret" "workforce_engine_public_key" {
  metadata {
    name      = "workforce-engine-public-key"
    namespace = "apps"
  }

  data = {
    "workforce-engine-public-key.pem" = module.workforce_engine_keypair.public_key_pem
  }
}

resource "kubernetes_secret" "workforce_api_private_key" {
  metadata {
    name      = "workforce-api-private-key"
    namespace = "apps"
  }

  data = {
    "workforce-api-private-key.pem" = module.workforce_api_keypair.private_key_pem
  }
}

resource "kubernetes_secret" "workforce_api_public_key" {
  metadata {
    name      = "workforce-api-public-key"
    namespace = "apps"
  }

  data = {
    "workforce-api-public-key.pem" = module.workforce_api_keypair.public_key_pem
  }
}

resource "kubernetes_secret" "storage_api_private_key" {
  metadata {
    name      = "storage-api-private-key"
    namespace = "apps"
  }

  data = {
    "storage-api-private-key.pem" = module.storage_api_keypair.private_key_pem
  }
}

resource "kubernetes_secret" "storage_api_public_key" {
  metadata {
    name      = "storage-api-public-key"
    namespace = "apps"
  }

  data = {
    "storage-api-public-key.pem" = module.storage_api_keypair.public_key_pem
  }
}
