output private_key_pem {
    value = tls_private_key.private_key.private_key_pem_pkcs8
}

output public_key_pem {
    value = tls_private_key.private_key.public_key_pem
}