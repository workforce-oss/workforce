# Common Fields

All objects that can be part of a flow share a set of common fields.

## Schema
    
```yaml
name: string, required # Must be unique within the flow
description: string, optional
type: string, required # The type of object
variables: map # The variables schema depends on the type
credential: string, optional # A reference to a credential if the type requires one
```

## Name

The name of the object must be unique within the flow. It is used to reference the object from other objects.

## Description

The description of the object is optional. It is used to provide additional information about the object.

## Type

The type of the object determines what kind of object it is. The type is used to determine how the object is handled by the runtime. It is also used to determine what fields are available on the object.

## Variables

The variables of the object are a map of arbitrary strings to values. The schema of the variables depends on the type of the object.

## Credential

The credential of the object is a reference to a credential that is used to store sensitive configuration values. Credentials are global to an organization and can be referenced by any object of the same type.

Credentials are stored in a separate location from the flow configuration. They are encrypted both at rest and in transit. Credentials can be created using either the web interface or the command line interface.