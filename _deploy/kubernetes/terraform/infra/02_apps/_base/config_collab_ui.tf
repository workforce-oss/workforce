locals {
  collab_ui_client_id = keycloak_openid_client.collab-ui.client_id
  caption_socket_server = "wss://${var.ingress_domain}/talkbox/captions"
  visualization_socket_server = "wss://${var.ingress_domain}/talkbox/visualization"
}
