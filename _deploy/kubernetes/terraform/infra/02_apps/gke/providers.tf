terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "2.10.1"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "2.23.0"
    }
    keycloak = {
      source  = "mrparkers/keycloak"
      version = "4.3.1"
    }
    google = {
      source  = "hashicorp/google"
      version = "4.83.0"
    }

    random = {
      source  = "hashicorp/random"
      version = "3.6.0"
    }
  }
}

provider "google" {
  project = var.project_id
}

data "google_client_config" "current" {}

data "google_container_cluster" "primary" {
  name     = var.cluster_name
  project  = var.project_id
  location = var.region
}


provider "helm" {
  kubernetes {
    host                   = "https://${data.google_container_cluster.primary.endpoint}"
    cluster_ca_certificate = base64decode(data.google_container_cluster.primary.master_auth.0.cluster_ca_certificate)
    token                  = data.google_client_config.current.access_token
  }
}

provider "kubernetes" {
  host                   = "https://${data.google_container_cluster.primary.endpoint}"
  cluster_ca_certificate = base64decode(data.google_container_cluster.primary.master_auth.0.cluster_ca_certificate)
  token                  = data.google_client_config.current.access_token
}

data "kubernetes_secret" "keycloak_credentials" {
  metadata {
    name      = "keycloak-admin-password"
    namespace = "keycloak"
  }
}

provider "keycloak" {
  url       = local.base_url
  base_path = "/auth"
  client_id = "admin-cli"
  password  = data.kubernetes_secret.keycloak_credentials.data["password"]
  username  = data.kubernetes_secret.keycloak_credentials.data["user"]
}
