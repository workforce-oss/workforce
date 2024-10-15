FROM hashicorp/terraform:1.5.7

# Create "$HOME/.terraform.d/plugin-cache"
RUN mkdir -p /root/.terraform.d/plugin-cache

# set env var TF_PLUGIN_CACHE_DIR
ENV TF_PLUGIN_CACHE_DIR=/root/.terraform.d/plugin-cache

# Create working directory
RUN mkdir -p /terraform_infra
WORKDIR /terraform_infra

# Copy tf_providers.tf
COPY tf_providers.tf .

# Run "terraform init"
RUN terraform init

