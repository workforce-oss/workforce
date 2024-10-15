resource "google_service_account" "coturn_service_account" {
  project      = var.project_id
  account_id   = "coturn"
  display_name = "coturn service account"
}

resource "google_compute_address" "static_ip" {
  project      = var.project_id
  region       = var.region
  name         = "coturn-ip"
  address_type = "EXTERNAL"
}

resource "google_dns_record_set" "lb" {
  name         = "${var.external_hostname}." # trailing dot is required
  type         = "A"
  ttl          = 300
  managed_zone = var.dns_zone_name
  project      = var.project_id
  rrdatas      = [google_compute_address.static_ip.address]
}

resource "random_password" "auth_secret" {
  length  = 32
  special = false
}

resource "kubernetes_namespace" "namespace" {
  metadata {
    name = "coturn"
  }
}

resource "kubernetes_secret" "auth_secret" {
  metadata {
    name      = "auth-secret"
    namespace = kubernetes_namespace.namespace.metadata[0].name
  }

  data = {
    auth_secret = random_password.auth_secret.result
  }
}
resource "google_compute_instance" "instance" {
  name         = "coturn"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  tags = ["coturn"]

  boot_disk {
    initialize_params {
      image = "projects/ubuntu-os-cloud/global/images/family/ubuntu-2004-lts"
    }
  }

  network_interface {
    subnetwork = var.subnetwork_name

    access_config {
      nat_ip = google_compute_address.static_ip.address
    }
  }

  metadata_startup_script = <<-EOF
        #!/bin/bash
        sudo apt-get update
        sudo apt-get install -y ca-certificates curl gnupg
        sudo install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        sudo chmod a+r /etc/apt/keyrings/docker.gpg
        echo \
        "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt-get update
        sudo apt-get -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        int_ip=$(hostname -i)
        echo "" > turnserver.conf
        echo "realm=${var.realm}" >> turnserver.conf
        echo "external-ip=${google_compute_address.static_ip.address}/$${int_ip}" >> turnserver.conf
        echo "relay-ip=$${int_ip}" >> turnserver.conf
        echo "listening-ip=$${int_ip}" >> turnserver.conf
        echo "listening-port=${var.ports.plaintext}" >> turnserver.conf
        echo "tls-listening-port=${var.ports.tls}" >> turnserver.conf
        echo "min-port=${var.ports.min}" >> turnserver.conf
        echo "max-port=${var.ports.max}" >> turnserver.conf
        echo "log-file=stdout" >> turnserver.conf
        echo "verbose" >> turnserver.conf
        echo "pidfile=/var/run/turnserver.pid" >> turnserver.conf
        echo "use-auth-secret" >> turnserver.conf
        echo "static-auth-secret=${random_password.auth_secret.result}" >> turnserver.conf
        
        docker run -d --name coturn --restart=always --network=host \
            -v $(pwd)/turnserver.conf:/etc/coturn/turnserver.conf \
            -p 3478:3478 \
            -p 3478:3478/udp \
            -p 5349:5349 \
            -p 5349:5349/udp \
            -p 49152-65535:49152-65535/udp \
            -p 49152-65535:49152-65535 \
            coturn/coturn
        
        EOF

  service_account {
    email  = google_service_account.coturn_service_account.email
    scopes = ["cloud-platform"]
  }


  metadata = {
    disable-legacy-endpoints = "true"
  }
}

resource google_compute_firewall "allow-ssh" {
    name    = "allow-ssh"
    project = var.project_id 
    network = var.network_name
    
    allow {
        protocol = "tcp"
        ports    = ["22"]
    }
    
    source_ranges = ["35.235.240.0/20"]
    target_tags = ["coturn"]
}

resource google_compute_firewall "internet_ingress" {
    name = "coturn-ingress"
    project = var.project_id
    network = var.network_name

    allow {
        protocol = "tcp"
        ports = ["${var.ports.plaintext}"]
    }

    allow {
        protocol = "udp"
        ports = ["${var.ports.plaintext}"]
    }

    allow {
        protocol = "tcp"
        ports = ["${var.ports.tls}"]
    }

    allow {
        protocol = "udp"
        ports = ["${var.ports.tls}"]
    }

    allow {
        protocol = "tcp"
        ports = ["${var.ports.min}-${var.ports.max}"]
    }

    allow {
        protocol = "udp"
        ports = ["${var.ports.min}-${var.ports.max}"]
    }

    source_ranges = ["0.0.0.0/0"]
    target_tags = ["coturn"]

}

