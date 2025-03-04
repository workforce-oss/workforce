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
            type: element.type ?? null,
            description: element.description ?? null,
            default: element.default ?? null,
            "x-workforce-multiline": element.multiline ?? null,
            "x-workforce-sensitive": element.sensitive ?? null,
            enum: element.options ?? null,
            "x-workforce-required-for": element.requiredFor ?? null,
            "x-workforce-optional-for": element.optionalFor ?? null,
            minimum: element.min ?? null,
            maximum: element.max ?? null,
            "x-workforce-hidden": element.hidden ?? null,
            "x-workforce-advanced": element.advanced ?? null,
        };
        jsonSchema.properties[key] = prop;
        // filter out null values
        for (const key of Object.keys(prop)) {
            if (prop[key] === null) {
                delete prop[key];
            }
        }
        if (element.required) {
            jsonSchema.required.push(key);
        }
    }
    return jsonSchema;
}