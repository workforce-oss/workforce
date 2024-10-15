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
  }
}
