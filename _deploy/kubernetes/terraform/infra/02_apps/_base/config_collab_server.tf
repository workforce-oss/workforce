locals {
  talkbox_connection_url      = "wss://${var.ingress_domain}/collab-server/"
  turn_server                 = var.turn_server
}