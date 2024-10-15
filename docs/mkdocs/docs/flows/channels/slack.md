
# Slack Channel

A **slack-channel** is a type of **channel** that allows for a worker to communicate with a user via a **Slack bot**.

## Overview

- **channel**: The channel name to listen to

## Behavior

- The **slack-channel** listens to a specific channel in Slack and creates a thread for each conversation. The **slack-channel** then assigns a worker to the thread and allows the worker to respond to messages in the thread. The worker can also respond to direct messages.

- You must have a Slack app with a bot user in order to use this channel.  See the [Slack documentation](https://api.slack.com/start/quickstart) for more information on how to create a Slack app.

- The bot user must be invited to the Slack channel in order to listen to that channel.



## Schema
```yaml
channel:
  ...
  type: slack-channel
  variables:
    channel_id: string, required # The channel name
```

## Credential

The **slack-channel** requires a **credential** of type **slack-channel**. The **credential** must have the following variables defined:

- **app_token**: The app token (not the bot token) for the Slack app
- **bot_token**: The bot token for the Slack app

See the [Slack documentation](https://api.slack.com/authentication/token-types#granular_bot) for more information on how to get these tokens.

## Credential Schema
```yaml
credential:
  ...
  type: slack-channel
  variables:
    app_token: string, required # The app token
```

## Worker Credential Schema
```yaml
credential:
  ...
  type: worker-slack-token
  variables:
    token: string, required # The bot token
```

