import { resolveRefs } from "../../util/openapi.js";
import { VariableSchemaElement } from "./variables_schema_model.js";


export function convertJsonSchemaToVariablesSchema(obj: Record<string, unknown>, jsonSchema: Record<string, unknown>): Map<string, VariableSchemaElement> {
    obj = resolveRefs(obj, jsonSchema);
    // we now have a flat json schema object with all refs resolved
    const schema = new Map<string, VariableSchemaElement>();
    if (obj.properties) {
        const properties = obj.properties as Record<string, unknown>;
        for (const key of Object.keys(properties)) {
            const prop = properties[key] as Record<string, unknown>;
            const element: VariableSchemaElement = {
                type: prop.type as 'string' | 'number' | 'boolean' | 'array' | 'object',
                description: prop.description as string | undefined,
                required: ((obj.required ?? []) as string[]).includes(key),
                default: prop.default as string | number | boolean | [] | Record<string, unknown> | undefined,
                multiline: prop["x-workforce-multiline"] as boolean | undefined,
                sensitive: prop["x-workforce-sensitive"] as boolean | undefined,
                options: prop.enum as string[] | undefined,
                requiredFor: prop["x-workforce-required-for"] as { name: string, option: string }[] | undefined,
                optionalFor: prop["x-workforce-optional-for"] as { name: string, option: string }[] | undefined,
                min: prop.minimum as number | undefined,
                max: prop.maximum as number | undefined,
                hidden: prop["x-workforce-hidden"] as boolean | undefined,
                advanced: prop["x-workforce-advanced"] as boolean | undefined,
            };
            schema.set(key, element);
        }
    }
    return schema;
}

export function convertVariablesSchemaToJsonSchema(schema: Map<string, VariableSchemaElement>): Record<string, unknown> {
    const jsonSchema = {
        type: "object",
        properties: {} as Record<string, unknown>,
        required: [] as string[],
    };
    for (const [key, element] of schema.entries()) {
        const prop: Record<string, unknown> = {
            type: element.type,
            description: element.description,
            default: element.default,
            "x-workforce-multiline": element.multiline,
            "x-workforce-sensitive": element.sensitive,
            enum: element.options,
            "x-workforce-required-for": element.requiredFor,
            "x-workforce-optional-for": element.optionalFor,
            minimum: element.min,
            maximum: element.max,
            "x-workforce-hidden": element.hidden,
            "x-workforce-advanced": element.advanced,
        };
        jsonSchema.properties[key] = prop;
        if (element.required) {
            jsonSchema.required.push(key);
        }
    }
    return jsonSchema;
}