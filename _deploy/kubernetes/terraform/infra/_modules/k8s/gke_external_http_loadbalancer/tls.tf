// Create a certmanager issuer for letsencrypt
resource kubernetes_manifest letsencrypt_issuer {
    count = var.use_letsencrypt ? 1 : 0

    manifest = {
        apiVersion = "cert-manager.io/v1"
        kind = "ClusterIssuer"
        metadata = {
            name = "letsencrypt-prod"
        }
        spec = {
            acme = {
                email = "${var.acme_email}"
                server = "https://acme-v02.api.letsencrypt.org/directory"
                privateKeySecretRef = {
                    name = "letsencrypt-prod"
                }
                solvers = [
                    {
                        dns01 = {
                            cloudDNS = {
                                project = var.dns_project_id
                                serviceAccountSecretRef = {
                                    name = "dns01"
                                    key = "service-account.json"
                                }
                            }
                        }
                    }
                ]
            }
        }
    }
}

// Create a certificate for the ingress
resource kubernetes_manifest "certificate" {
    count = var.use_letsencrypt ? 1 : 0
    manifest = {
        apiVersion = "cert-manager.io/v1"
        kind = "Certificate"
        metadata = {
            name = "${var.name}-cert"
            namespace = "${var.namespace}"
        }
        spec = {
            secretName = "${var.name}-tls-secret"
            dnsNames = [
                "${var.external_hostname}"
            ]
            issuerRef = {
                name = "letsencrypt-prod"
                kind = "ClusterIssuer"
            }
        }
    }
    depends_on = [ google_dns_record_set.lb ]
}
