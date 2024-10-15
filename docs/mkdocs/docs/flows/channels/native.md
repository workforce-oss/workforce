# Native Channel

A **native-channel** is a type of **channel** that allows for a worker to communicate with a user via an embeddable web-component.

The **native-channel** is a fully customizable, embeddable web-component that offers real-time communication between a worker and a user. The **native-channel** can be embedded in any web page or application.

## Overview

The Native Channel supports end-user authentication via OAuth2. The channel can be configured to require an OAuth2 token with specific claims.

- **channel_name**: A unique name for the channel
- **anonymous_access**: Allow anonymous access to the channel
- **oauth2_issuer_uri**: The issuer URI for OAuth2 Tokens
- **oauth2_audience**: The expected audience for OAuth2 Tokens
- **oauth2_claims**: The claims to validate in the OAuth2 Token

## Schema

```yaml
channel:
  ...
  type: native-channel
  variables:
    channel_name: string, required # A unique name for the channel
    anonymous_access: boolean, optional # Allow anonymous access to the channel
    oauth2_issuer_uri: string, optional # The issuer URI for OAuth2 Tokens
    oauth2_audience: string, optional # The expected audience for OAuth2 Tokens
    oauth2_claims: a list of strings, optional # The claims to validate in the OAuth2 Token
```

## Credential Schema

The credential schema for a **native-channel** is empty.

```yaml
credential:
  ...
  type: native-channel    
```


## Worker Credential Schema

```yaml
credential:
  ...
  type: worker-native-token
  variables:
    token: string, required # Any string you want to use as a token
```