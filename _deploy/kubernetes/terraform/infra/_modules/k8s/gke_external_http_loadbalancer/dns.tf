resource "google_compute_global_address" "static_ip" {
  name    = "${var.name}-static-ip"
  project = var.project_id
}

resource "google_dns_record_set" "lb" {
    name = "${var.external_hostname}." # trailing dot is required
    type = "A"
    ttl  = 300
    managed_zone = var.dns_zone_name
    project = var.dns_project_id
    rrdatas = [google_compute_global_address.static_ip.address]
}

