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