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
      source = "mrparkers/keycloak"
      version = "4.3.1"
    }
    google = {
      source  = "hashicorp/google"
      version = "4.83.0"
    }
  }
}

provider "google" {
  project = var.gke_project_id
}

provider "kubernetes" {
  config_path = "~/.kube/config"
  config_context = "docker-desktop"
}

provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
    config_context = "docker-desktop"
  }
}

data kubernetes_secret keycloak_credentials {
  metadata {
    name      = "keycloak-admin-password"
    namespace = "keycloak"
  }
}

provider "keycloak" {
  url = "${local.base_url}"
  base_path = "/auth"
  client_id = "admin-cli"
  password = data.kubernetes_secret.keycloak_credentials.data["password"]
  username = data.kubernetes_secret.keycloak_credentials.data["user"]
}