export interface VariableSchemaElementOptionReference {
    name: string;
    option: string;
  }
  
  export interface VariableSchemaElement {
    type: "string" | "number" | "boolean" | "object" | "array";
    multiline?: boolean;
    sensitive?: boolean;
    description?: string;
    required?: boolean;
    default?: string | number | boolean | object | unknown[];
    options?: string[];
    requiredFor?: VariableSchemaElementOptionReference[];
    optionalFor?: VariableSchemaElementOptionReference[];
    min?: number;
    max?: number;
    hidden?: boolean;
    advanced?: boolean;
  }
  
  export interface VariableSchemaValidationError {
    message: string;
  }
  