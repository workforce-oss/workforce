# Discord Channel

A **discord-channel** is a type of **channel** that allows for a worker to communicate with a user via Discord. 

## Overview

You will need a discord bot token to use this channel. Follow this guide for creating an app and bot user: [Discord Developer Portal](https://discord.com/developers/docs/quick-start/getting-started)

- **channel_id**: The id of the channel
- **bot_token**: The bot token for the Discord app

## Schema

```yaml
channel:
  ...
  type: discord-channel
  variables:
    channel_id: string, required # The channel id
```

## Credential Schema

```yaml
credential:
  ...
  type: discord-channel
  variables:
    bot_token: string, required # The bot token
```

## Worker Credential Schema

```yaml
credential:
  ...
  type: worker-discord-token
  variables:
    token: string, required # The bot token
```