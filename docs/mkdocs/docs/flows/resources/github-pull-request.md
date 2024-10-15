# GitHub Pull Request Resource

A **github-pull-request-resource** is a type of **resource** that allows for a task to interact with a Github pull request. A **github-pull-request-resource** tracks pull requests associated with a repository.

## Overview

- **repo**: The name(slug) of the Github repository
- **owner**: The name(slug) of owner of the Github repository

## Behavior

The **github-pull-request-resource** will watch for pull request and comment events that impact the repository. It will create a new **version** when a new event is received.

The **github-pull-request-resource** will trigger a **task** when either of the following events occur:

* A new pull request is created
* A pull request is updated
* Any user other than bot user comments on the pull request

The **github-pull-request-resource** will *not* trigger a **task** when the bot user comments on its own pull request.

When a **github-pull-request-resource** is used as an **input**, the **task** will pull the latest version of the **github-pull-request-resource**. The **task** will then fill in **task variable templates** with the contents of the pull request.

The templated content will include the following:

* Pull Request Id
* Pull Request Creator
* Pull Request Source Branch
* Pull Request Target Branch
* Pull Request Title
* Pull Request Body
* Files Changed in the Pull Request and their contents
* The full comment history of the pull request

When a **github-pull-request-resource** is used as an **output**, the following behavior occurs:

* If there **is not** an existing pull request between the source and target branches, a new pull request will be created.
* If there **is** an existing pull request between the source and target branches, the pull request will be updated.

## Schema
```yaml
resource:
  ...
  type: github-pull-request-resource
  variables:
    repo: string, required # The name(slug) of the Github repository
    owner: string, required # The name(slug) of owner of the Github repository
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
        username: string, required # The Github username of the bot user
        access_token: string, required # The Github access token of the bot user
```