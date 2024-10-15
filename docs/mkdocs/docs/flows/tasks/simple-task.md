# Simple Task

A **simple-task** is a type of **task** that allows for a prompt_template and system_message_template to be defined manually.

## Overview

- **prompt_template**: A template that is used to generate the initial prompt for the worker.
- **system_message_template**: A template that is used to generate the system message that is sent to the worker. This is generally used to provide instructions to the worker.

## Schema

```yaml
task:
  ...
  type: simple-task
  variables:
    prompt_template: string, required
    system_message_template: string, optional
```

