import ansi from "ansi-colors";
import { BaseConfig } from "./model.js";
import { VariablesSchemaFactory } from "./factory/variable_schema_factory.js";
import { ObjectSubtype, ObjectType } from "./factory/types.js";
import { VariableSchemaElement, VariableSchemaValidationError } from "./variables_schema_model.js";
import { jsonParse } from "../../util/json.js";

// const { cyan, green, red, white } = ansi;

export class VariablesSchema extends Map<string, VariableSchemaElement> {
  private type: ObjectType;
  private subtype: ObjectSubtype;

  constructor(
    configSchema: Map<string, VariableSchemaElement>,
    type: ObjectType,
    subtype: ObjectSubtype
  ) {
    super(configSchema);
    for (const [key, value] of configSchema.entries()) {
      this.set(key, value);
    }
    this.type = type;
    this.subtype = subtype;
  }

  public static validateBaseObject(
    model: BaseConfig,
    type: ObjectType
  ): VariableSchemaValidationError[] {
    const errors = VariablesSchemaFactory.for(model, type).validateObject(
      `${type}/${model.name}`,
      model.variables
    );
    return errors;
  }

  public validateObject(
    objectName: string,
    object?: Record<string, unknown>,
    propertyName?: string
  ): VariableSchemaValidationError[] {
    const propertyNamePrefix = propertyName ? `${propertyName}.` : "variables.";
    const errors: VariableSchemaValidationError[] = [];
    for (const [key, value] of this.entries()) {
      if (value.required && (!object?.[key])) {
        errors.push({
          message: `${ansi.white.underline(objectName)}:\n\t${ansi.red.italic(
            `'${propertyNamePrefix + key}'`
          )} ${ansi.red.italic("is required for a")} ${ansi.cyan.italic(this.subtype)}.`,
        });
      }
    }
    if (!object || errors.length !== 0) {
      return errors;
    }

    for (const [key, value] of Object.entries(object)) {
      if (!this.has(key)) {
        const validKeys = Array.from(this.keys()).join(", ");
        errors.push({
          message: `${ansi.white.underline(objectName)}:\n\t${ansi.red.italic(
            `'${propertyNamePrefix + key}'`
          )} ${ansi.red.italic("is not a valid key for a")} ${ansi.cyan.italic(
            this.subtype
          )}.\n\t${ansi.white("Valid keys are: ")}${ansi.green.italic(validKeys)}`,
        });
        continue;
      }
      if (this.get(key)?.type === "object") {
        errors.push(
          ...this.validateObject(
            objectName,
            value as Record<string, unknown> | undefined,
            `${propertyNamePrefix}${key}`
          )
        );
      } else if (this.get(key)?.type === "array") {
        errors.push(
          ...this.validateArray(
            objectName,
            value as unknown[],
            `${propertyNamePrefix}${key}`
          )
        );
      } else {
        errors.push(
          ...this.validateElement(
            objectName,
            value,
            `${propertyNamePrefix}${key}`,
            this.get(key)
          )
        );
      }
    }
    for (const [key, value] of this.entries()) {
      if (value.required && !object?.[key]) {
        errors.push({
          message: `${ansi.white.underline(objectName)}:\n\t${ansi.red.italic(
            `'${propertyNamePrefix + key}'`
          )} ${ansi.red.italic("is required for a")} ${ansi.cyan.italic(this.subtype)}.`,
        });
      }
    }
    return errors;
  }

  private validateArray(
    objectName: string,
    array: unknown[],
    elementName: string
  ): VariableSchemaValidationError[] {
    const errors: VariableSchemaValidationError[] = [];
    for (const element of array) {
      errors.push(
        ...this.validateElement(
          objectName,
          element,
          elementName,
          this.get(elementName)
        )
      );
    }
    return errors;
  }

  private validateElement(
    objectName: string,
    element: unknown,
    elementName: string,
    schemaElement: VariableSchemaElement | undefined
  ): VariableSchemaValidationError[] {
    const errors: VariableSchemaValidationError[] = [];
    if (schemaElement === undefined) {
      return errors;
    }
    if (schemaElement.type === "object") {
      return this.validateObject(objectName, element as Record<string, unknown> | undefined, elementName);
    } else if (schemaElement.type === "array") {
      return this.validateArray(objectName, element as unknown[], elementName);
    } else {
      if (schemaElement.options !== undefined) {
        if (!schemaElement.options.includes(element as string)) {
          errors.push({
            message: `${ansi.white.underline(objectName)}:\n\t${ansi.red.italic(
              `'${element as string}'`
            )} ${ansi.red.italic("is not a valid option for")} ${ansi.cyan.italic(
              elementName
            )}.`,
          });
        }
      }
      if (schemaElement.type === "number") {
        // check if the number is a number
        if (typeof element !== "number") {
          errors.push({
            message: `${ansi.white.underline(objectName)}:\n\t${ansi.red.italic(
              `'${element as string}'`
            )} ${ansi.red.italic("is not a number for")} ${ansi.cyan.italic(
              elementName
            )}.`,
          });
          return errors;
        }
        if (schemaElement.min !== undefined) {
          if ((element) < schemaElement.min) {
            errors.push({
              message: `${ansi.white.underline(objectName)}:\n\t${ansi.red.italic(
                `'${element}'`
              )} ${ansi.red.italic(
                "is less than the minimum value for"
              )} ${ansi.cyan.italic(elementName)}: ${ansi.green.italic(
                schemaElement.min.toString()
              )}.`,
            });
          }
        }
        if (schemaElement.max !== undefined) {
          if ((element) > schemaElement.max) {
            errors.push({
              message: `${ansi.white.underline(objectName)}:\n\t${ansi.red.italic(
                `'${element}'`
              )} ${ansi.red.italic(
                "is greater than the maximum value for"
              )} ${ansi.cyan.italic(elementName)}: ${ansi.green.italic(
                schemaElement.max.toString()
              )}.`,
            });
          }
        }

      }
      return errors;
    }
  }

  public toJsonString(): string {
    const json: Record<string, unknown> = {};
    for (const [key, value] of this.entries()) {
      json[key] = value;
    }
    json.type = this.type;
    json.subtype = this.subtype;
    return JSON.stringify(json);
  }

  public static fromJsonString(jsonString: string): VariablesSchema {

    const json = jsonParse<Record<string, unknown>>(jsonString);
    const configSchema = new Map<string, VariableSchemaElement>();
    if (!json?.type || !json?.subtype) {
      throw new Error("Invalid JSON string for VariablesSchema");
    }
    for (const [key, value] of Object.entries(json)) {
      if (key !== "type" && key !== "subtype") {
        configSchema.set(key, value as VariableSchemaElement);
      }
    }
    return new VariablesSchema(configSchema, json.type as ObjectType, json.subtype as ObjectSubtype);

  }

  public toDocString(): string {
    let docString = "";
    for (const [key, value] of this.entries()) {
      docString += `**${key}**`;
      if (value.required) {
        docString += " (required)";
      }
      docString += "\n";
      if (value.description !== undefined) {
        docString += `${value.description}\n`;
      }
      if (value.options !== undefined) {
        docString += `Options: ${value.options.join(", ")}\n`;
      }
      if (value.default !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
        docString += `Default: ${value.default}\n`;
      }
      if (value.type === "string") {
        if (value.sensitive) {
          docString += "Sensitive\n";
        }
      }
      if (value.type === "number") {
        if (value.min !== undefined) {
          docString += `Min: ${value.min}\n`;
        }
        if (value.max !== undefined) {
          docString += `Max: ${value.max}\n`;
        }
      }
      docString += "\n";
    }
    return docString;
  }

  public withoutSensitive(): VariablesSchema {
    const schema = new Map<string, VariableSchemaElement>();
    for (const [key, value] of this.entries()) {
      if (value.sensitive !== true) {
        schema.set(key, value);
      }
    }
    return new VariablesSchema(schema, this.type, this.subtype);
  }

  public onlySensitive(): VariablesSchema {
    const schema = new Map<string, VariableSchemaElement>();
    for (const [key, value] of this.entries()) {
      if (value.sensitive === true) {
        schema.set(key, value);
      }
    }
    const sensitive = new VariablesSchema(schema, this.type, this.subtype);
    return sensitive;
  }

  public merge(other: VariablesSchema): VariablesSchema {
    const schema = new Map<string, VariableSchemaElement>();
    for (const [key, value] of this.entries()) {
      schema.set(key, value);
    }
    for (const [key, value] of other.entries()) {
      schema.set(key, value);
    }
    return new VariablesSchema(schema, this.type, this.subtype);
  }
}

export function mockVariablesSchema(type: ObjectType): VariablesSchema {
  const schema = new Map<string, VariableSchemaElement>();
  const subtype = `mock-${type}`;
  schema.set("output", {
    type: "string",
    description: "An output value to use for testing",
    default: "test",
    required: true,
  });

  schema.set("messages", {
    type: "string",
    description: "An array of messages to use for testing",
  });
  schema.set("subtask_message", {
    type: "string",
    description: "A subtask to use for testing",
  })
  schema.set("subtask_tool_call", {
    type: "string",
    description: "A toolcall to use for testing",
  })
  schema.set("secret_key", {
    type: "number",
    description: "A secret value to test credential handling",
    sensitive: true,
  });
  return new VariablesSchema(schema, type, subtype as ObjectSubtype);
}

