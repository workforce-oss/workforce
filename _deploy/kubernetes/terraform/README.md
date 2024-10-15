# Kubernetes Terraform Deployment
The Kubernetes based deployment is intended to be exposed to the internet and allows use of advanced features like automated webhook management and WebRTC proxying.

The current deployment is managed by Terraform, with a Helm chart and Operator to be added in the future.

Components:
- Base Infrastructure `00_base`
    - Istio
    - Ngrok Operator (optional, intended for local development only)
- Application Infrastructure `01_app_infra`
    - Postgres (Database)
    - Redis (Cache and PubSub)
    - Istio Ingress Gateway (Entry point for L7 traffic)
    - Keycloak (Identity and Access Management)
    - Weaviate (Vector Database)
    - NLM Ingestor (Document Parser)
    - Prometheus Stack (Monitoring)
    - Ngrok Ingress (optional, intended for local development only)
- Applications `02_apps`
    - Keycloak Configuration
    - Encryption Key Management
    - Database Initialization
    - Weaviate Configuration
    - Service Mesh Configuration
    - Individual Application Deployments
        - Secret Service (Row-Level Encrypted Secret Management)
        - Workforce API (REST, Webhooks, and WebSockets)
        - Workfroce Engine (Core Runtime)
        - Workforce UI (Web Interface)
        - Storage API (Raw File Storage for Documents)

A simple deployment with externally managed internet-ingress is documented below.

Templates for GCP are included in this repository, but are not currently documented. The GCP can manage L7 Load Balancers and DNS records on your behalf, but requires additional setup.

# Instructions

## Prerequisites
- Docker
- Kubernetes Cluster

## Generic Deployment

### Prerequisites
- External Proxy with https Endpoint

### Setup

#### 1. Configure the ingress domain

Create 2 files at `_deploy/kubernetes/terraform/01_app_infra/terraform.local.tfvars` and `_deploy/kubernetes/terraform/02_apps/terraform.local.tfvars` with the following content:
```hcl
ingress_domain = "<my external domain>"
```

#### 1.a Optional: Use `ngrok` to expose the local Kubernetes cluster to the internet

In order to use `ngrok`, you must add the following:

`_deploy/kubernetes/terraform/00_base/local/terraform.local.tfvars`
```hcl
ingress_domain = "<my external domain>"
enable_ngrok = true
ngrok_api_key = "<your ngrok api key>"
ngrok_auth_token = "<your ngrok auth token>"
```

`_deploy/kubernetes/terraform/01_app_infra/local/terraform.local.tfvars`
```hcl
ingress_domain = "<my external domain>"
enable_ngrok = true
```

#### 2. Update the kubernetes contexts

Update the kubernetes contexts in the following files:
- `_deploy/kubernetes/terraform/00_base/local/providers.tf`
- `_deploy/kubernetes/terraform/01_app_infra/local/providers.tf`
- `_deploy/kubernetes/terraform/02_apps/local/providers.tf`

The default context is `docker-desktop`. If you are using a different context, update the `config_context` field in the `kubernetes` and `helm` providers.

Alternatively, you can remove the `config_context` and the provider will use the current context.

#### 3. Build the Terraform runner Docker Image

```bash
_deploy/kubernetes/terraform/scripts/build_tf.sh
```

#### 4. Deploy to the cluster

Run the following commands to deploy the application to Kubernetes:
```bash
_deploy/kubernetes/terraform/scripts/apply.sh 00_base local
_deploy/kubernetes/terraform/scripts/apply.sh 01_app_infra local
_deploy/kubernetes/terraform/scripts/apply.sh 02_apps local
```

#### 5. Optional: Configure the external proxy

If not using `ngrok`, you will need to manually point your external traffic manager to the istio-ingress NodePort service in the istio-ingress namespace. The https port is 9443, and the http port is 8090.

One way to easily ensure you can route to these ports would be to use the Kubernetes proxy to forward ports on your local machine.

```bash
kubectl port-forward -n istio-ingress istio-ingress 9443:9443 8090:8090
```

Then you can forward to localhost:9443 and localhost:8090 respectively, or whatever your local machine's IP address is.

#### 6. Access the application
You should be able to access the ui at `https://<my external domain>/workforce-ui`. Keycloak will ask you to login, and the default credentials unless changed in your configuration are `admin/admin`.



