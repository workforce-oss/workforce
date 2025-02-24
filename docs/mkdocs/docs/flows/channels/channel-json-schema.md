# Channel

- [1. Property `Channel > allOf > object`](#allOf_i0)
  - [1.1. [Optional] Property Channel > allOf > Object > id](#allOf_i0_id)
  - [1.2. [Optional] Property Channel > allOf > Object > orgId](#allOf_i0_orgId)
  - [1.3. [Required] Property Channel > allOf > Object > name](#allOf_i0_name)
  - [1.4. [Required] Property Channel > allOf > Object > description](#allOf_i0_description)
  - [1.5. [Optional] Property Channel > allOf > Object > credential](#allOf_i0_credential)
- [2. Property `Channel > allOf > channel-properties`](#allOf_i1)
  - [2.1. [Required] Property Channel > allOf > channel-properties > type](#allOf_i1_type)
  - [2.2. [Required] Property Channel > allOf > channel-properties > variables](#allOf_i1_variables)

**Title:** Channel

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** A channel is a communication channel that can be used to communicate with workers.

<blockquote>

| All of(Requirement)             |
| ------------------------------- |
| [object](#allOf_i0)             |
| [channel-properties](#allOf_i1) |

<blockquote>

## <a name="allOf_i0"></a>1. Property `Channel > allOf > object`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Defined in**            | #/$defs/object                                                            |

**Description:** An object is a base object that all other objects inherit from.

<details>
<summary>
<strong> <a name="allOf_i0_id"></a>1.1. [Optional] Property Channel > allOf > Object > id</strong>  

</summary>
<blockquote>

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |
| **Format**   | `uuid`   |

**Description:** The unique identifier for the object

</blockquote>
</details>

<details>
<summary>
<strong> <a name="allOf_i0_orgId"></a>1.2. [Optional] Property Channel > allOf > Object > orgId</strong>  

</summary>
<blockquote>

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |
| **Format**   | `uuid`   |

**Description:** The unique identifier for the organization the object belongs to.

</blockquote>
</details>

<details>
<summary>
<strong> <a name="allOf_i0_name"></a>1.3. [Required] Property Channel > allOf > Object > name</strong>  

</summary>
<blockquote>

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

</blockquote>
</details>

<details>
<summary>
<strong> <a name="allOf_i0_description"></a>1.4. [Required] Property Channel > allOf > Object > description</strong>  

</summary>
<blockquote>

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

</blockquote>
</details>

<details>
<summary>
<strong> <a name="allOf_i0_credential"></a>1.5. [Optional] Property Channel > allOf > Object > credential</strong>  

</summary>
<blockquote>

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The name of the credential to use for this object.

</blockquote>
</details>

</blockquote>
<blockquote>

## <a name="allOf_i1"></a>2. Property `Channel > allOf > channel-properties`

**Title:** channel-properties

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

<details>
<summary>
<strong> <a name="allOf_i1_type"></a>2.1. [Required] Property Channel > allOf > channel-properties > type</strong>  

</summary>
<blockquote>

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | Yes                |

Must be one of:
* "slack-channel"
* "native-channel"
* "discord-channel"

</blockquote>
</details>

<details>
<summary>
<strong> <a name="allOf_i1_variables"></a>2.2. [Required] Property Channel > allOf > channel-properties > variables</strong>  

</summary>
<blockquote>

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

</blockquote>
</details>

</blockquote>

</blockquote>

----------------------------------------------------------------------------------------------------------------------------
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2024-10-25 at 15:33:29 -0600