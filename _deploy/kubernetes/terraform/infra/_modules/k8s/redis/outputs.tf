output hostname {
    value = "${helm_release.redis.metadata[0].name}-master.redis"
}

output port {
    value = 6379
}

output password {
    value = random_password.redis_password.result
}