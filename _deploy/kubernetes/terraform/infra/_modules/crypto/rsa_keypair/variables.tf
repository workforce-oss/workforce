variable algorithm {
    type        = string
    description = "The algorithm to use for the keypair."
    default     = "RSA"
}

variable rsa_bits {
    type        = number
    description = "The number of bits to use for the keypair."
    default     = 4096
}

variable "passphrase" {
    type        = string
    description = "The passphrase to use for the keypair."
    default     = ""
}