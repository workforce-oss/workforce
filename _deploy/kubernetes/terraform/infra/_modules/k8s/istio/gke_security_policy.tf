locals {
    
}

resource "google_compute_security_policy" "security_policy" {
    count = var.enable_gke_security_policy ? 1 : 0

    name = "gke-security-policy"

    rule {
        action = "allow"
        priority = 1000
        match {
          expr {
            expression = "request.path.matches(\"/prospect-api.*\")"
          }
        }
    }

    rule {
        action = "allow"
        priority = 1001
        match {
          expr {
            expression = "request.path.matches(\"/workforce-api/state-images.*\")"
          }
        }
    }

    rule {
        action = "allow"
        priority = 2147483646
        match {
            versioned_expr = "SRC_IPS_V1"
            config {
                src_ip_ranges = var.enable_ip_source_restriction ? var.allowed_ips : ["*"]
            }
        }
    }

    # Default deny all
    rule {
        action = "deny(403)"
        priority = 2147483647
        match {
            versioned_expr = "SRC_IPS_V1"
            config {
                src_ip_ranges = ["*"]
            }
        }
    }
}