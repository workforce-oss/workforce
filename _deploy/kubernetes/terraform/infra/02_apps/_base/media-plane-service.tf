resource kubernetes_service media_plane {
    metadata {
        name = "media-plane"
        namespace = "apps"
    }
    spec  {
        selector = {
            rtc = "media-plane"
        }
        type = "ClusterIP"
        port {
            port = 3478
            target_port = 3478
            name = "media-plane"
            protocol = "UDP"
        }
    }
}