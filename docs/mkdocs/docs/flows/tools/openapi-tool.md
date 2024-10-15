# OpenAPI Tool

An **openapi-tool** is a type of **tool** that can be used to interact with any external service that provides an OpenAPI specification. Given a schema, the worker will automatically be able to interact with the service.

The schema must be a valid [OpenAPI 3.0 specification](https://spec.openapis.org/oas/latest.html). The tool will use the schema to determine the available functions and their parameters. The worker will then use the schema to determine how to interact with the service.

## Overview

- **schema_url**: A web-accessible URL to the OpenAPI schema. This should be a valid OpenAPI 3.0 specification.
- **raw_schema**: A JSON string that contains the OpenAPI schema. This should be a valid OpenAPI 3.0 specification.

## Schema

```yaml
tool:
  ...
  type: openapi-tool
  variables:
    schema_url: string, optional # A web-accessible URL to the OpenAPI schema
    raw_schema: string, optional # A JSON string that contains the OpenAPI schema
```

## Behavior

All forms of authentication and server information should be included in the OpenAPI schema. The worker will use this information to determine how to interact with the service.

Configure the server section of the OpenAPI schema to include the base URL of the service. This will allow the worker to make requests to the service. See here for how to configure the server section of the OpenAPI schema: [OpenAPI Servers](https://spec.openapis.org/oas/latest.html#server-object).

See here for how to configure the security section of the OpenAPI schema: [OpenAPI Security](https://spec.openapis.org/oas/latest.html#security-scheme-object).

When including a security section in the OpenAPI schema, a credential of type **openapi-tool** must be provided. The credential should populate the appropriate fields for the security scheme. The worker will use the credential to authenticate with the service.

In the case of the Oauth2 `authorization_code` flow, the worker will send a message to the **channel** with a link to the authorization page. The worker will then wait for the user to authenticate and then continue with the task. The token will live for the duration of the task, or the user will be prompted to re-authenticate if the token expires.


