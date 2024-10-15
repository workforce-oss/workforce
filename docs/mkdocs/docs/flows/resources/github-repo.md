# GitHub Repo Resource

A **github-repo-resource** is a type of **resource** that allows for a task to access a Github repository. A **github-repo-resource** tracks commits that impact files that match a path template.

## Overview

- **repo**: The name(slug) of the Github repository
- **owner**: The name(slug) of owner of the Github repository
- **branch**: The branch name. Defaults to `main`
- **path_template**: A regular expression used to use to generate the path to the file. This can also just be the name of a particular or directory. Defaults to {{filename}}.
- **org_name**: The name of the Github organization to use for webhooks.

## Behavior

The **github-repo-resource** will watch for **push events** that impact files matching the **path_template**. It will create a new **version** when a **push event** is received.

A **path_template** can match multiple files or a single file. If the **path_template** matches multiple files, **github-repo-resource** will create a single **version** that contains all of the files matching the **path_template**.

* When a **Task** uses a **github-repo-resource** as a **trigger**, the **Task** will be triggered when the **github-repo-resource** receives a new **version**.

    If the **resource version** is associated with multiple files, the **Task** will be triggered for each file. The **Task** will then fill in **task variable templates** with the contents of the file.
         
* When a **Task** uses a **github-repo-resource** as an **input**, the **Task** will pull the latest version of the **github-repo-resource**. 

    If the **path_template** matches multiple files, and the resource was not the trigger of the task, the first file in the version will be used. The **Task** will then fill in **task variable templates** with the contents of the file.

    This behavior is designed to mitigate issues with creating a cartesian product of files when a task has multiple inputs.

    For this reason, it is recommended that **github-repo-resources** not used as triggers should only match a single file.

    If you want to fan-out, consider using a **github-repo-resource** as an output of a task and then using the **github-repo-resource** as a trigger for a new task.

* When a **Task** uses a **github-repo-resource** as an **output**, the **Task** will push the file to the **github-repo-resource**.

    The runtime will automatically create a new **version** of the **github-repo-resource** when the **task** completes. The **worker** will choose an appropriate file name based on the **path_template**.

## Schema
```yaml
resource:
  ...
  type: github-repo-resource
  variables:
    repo: string, required # The name(slug) of the Github repository
    owner: string, required # The name(slug) of owner of the Github repository
    branch: string, optional # The branch name
    path_template: string, optional # A template to monitor for changes
    org_name: string, optional # The name of the Github organization to use for webhooks
```
## Credential

The **github-repo-resource** requires a **credential** with a **Github access token**.

- **access_token**: The Github access token

See the [Github documentation](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token) for more information on how to get this token.

## Credential Schema

```yaml
credential:
    ...
    type: github-repo-resource
    variables:
        access_token: string, required # The Github access token
```