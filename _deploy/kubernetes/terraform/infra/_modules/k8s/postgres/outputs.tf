output postgres_password {
    value = random_password.postgres_admin.result
}

output postgres_user {
    value = "app"
}

output postgres_user_password {
    value = random_password.postgres_user.result
}

output connection_string {
    value = "postgresql://${helm_release.postgres.metadata[0].name}-postgresql:${random_password.postgres_admin.result}@${helm_release.postgres.metadata[0].name}.postgres:5432/app"
}

output hostname {
    value = "${helm_release.postgres.metadata[0].name}-postgresql.postgres"
}

output port {
    value = 5432
}

output database {
    value = "app"
}

