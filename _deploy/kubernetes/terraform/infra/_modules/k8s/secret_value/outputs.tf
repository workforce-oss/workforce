output value {
    value = data.kubernetes_secret.secret_source.data[var.key]
}