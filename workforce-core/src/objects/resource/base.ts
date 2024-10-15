import { BehaviorSubject, Subscription } from "rxjs";
import { snakeify } from "../../util/snake.js";
import { BaseObject } from "../base/base.js";
import { ResourceConfig, ResourceObject, ResourceVersion, WriteRequest } from "./model.js";
import { jsonParse } from "../../util/json.js";
import { FunctionParameters } from "../../util/openapi.js";

export abstract class Resource extends BaseObject<ResourceConfig> {
	versions = new BehaviorSubject<ResourceVersion>({} as ResourceVersion);

	fetchObject(resourceVersion: ResourceVersion, objectName: string): Promise<ResourceObject> {
		this.logger.debug(`Resource.fetchObject() resourceVersion=${JSON.stringify(resourceVersion)} objectName=${objectName}`);
		throw new Error("Resource.fetchObject() not implemented");
	}

	refresh(): Promise<void> {
		throw new Error("Resource.refresh() not implemented");
	}

	write(writeRequest: WriteRequest): Promise<void> {
		this.logger.debug(`Resource.write() writeRequest=${JSON.stringify(writeRequest)}`);
		throw new Error("Resource.write() not implemented");
	}

	watch(callback: (resourceVersion: ResourceVersion) => void): Promise<Subscription> {
		return Promise.resolve(this.versions.subscribe((resourceVersion) => {
			callback(resourceVersion);
		}));
	}

	latestVersion(): Promise<ResourceVersion> {
		return Promise.resolve(this.versions.getValue());
	}

	private pluralObjectKey(): string {
		const snaked = snakeify(this.config.name);
		return `${snaked}s`;
	}

	public topLevelObjectKey(): string {
		return this.pluralObjectKey();
	}

	public schema(isToolOutput?: boolean): Promise<Record<string, FunctionParameters>> {
		const objectKey = snakeify(this.config.name);
		const pluralObjectKey = this.pluralObjectKey();
		const exampleString = this.config.example ? `\nExample:\n${this.config.example}` : "";
		const schema: Record<string, {
			type: string;
			items: {
				type: string;
				description: string;
				properties: Record<string, {
					type: string;
					description: string;
				}>;
				required: string[];
			};
		}> = {
			[pluralObjectKey]: {
				type: "array",
				items: {
					type: "object",
					description: `Purpose: Create or update a ${objectKey}.\nDescription: ${this.config.description}.`,
					properties: {
						name: {
							type: "string",
							description: `The name of the ${objectKey}`,
						},
						message: {
							type: "string",
							description: `A message explaining the change to the ${objectKey}."`,
						},
					},
					required: ["name", "message"],
				},
			},
		};
		if (isToolOutput) {
			schema[pluralObjectKey].items.properties.function_name = {
				type: "string",
				description: `The name of the function that created the ${objectKey}.`,
			};
			schema[pluralObjectKey].items.required.push("function_name");
		} else {
			schema[pluralObjectKey].items.properties.content = {
				type: "string",
				description: `The content of the ${objectKey}.${exampleString}`,
			};
			schema[pluralObjectKey].items.required.push("content");
		}
		return Promise.resolve(schema);
	}

	public async validateObject(objectArray: unknown, isToolOutput?: boolean): Promise<boolean> {
		try {
			const pluralObjectKey = this.pluralObjectKey();
			const schema = await this.schema(isToolOutput);
			const itemSchema = (schema[pluralObjectKey]).items;

			// check if objectArray is an array
			if (!Array.isArray(objectArray)) {
				this.logger.warn(`validateObject() Resource ${this.config.name} objectArray is not an array, attempting to parse`);
				this.logger.debug(`validateObject() Resource ${this.config.name} objectArray=${JSON.stringify(objectArray)}`);
				// try parsing objectArray
				try {
					objectArray = jsonParse(objectArray as string);
				} catch (err) {
					this.logger.error(`validateObject() Resource ${this.config.name} objectArray is not an array, and could not be parsed`, err);
					return false;
				}
				if (!Array.isArray(objectArray)) {
					this.logger.error(`validateObject() Resource ${this.config.name} objectArray is not an array after parsing`);
					return false;
				}
			}

			// check if each item in objectArray is an object
			for (const item of objectArray) {
				if (typeof item !== "object") {
					this.logger.error(
						`validateObject() Resource ${this.config.name} objectArray item is not an object`
					);
					return false;
				}
			}

			// check that each item in objectArray has the required properties
			if (itemSchema?.required && itemSchema.required.length > 0) {
				for (const item of objectArray) {
					for (const key of itemSchema.required) {
						if (!(key in item)) {
							this.logger.error(
								`validateObject() Resource ${this.config.name} objectArray item is missing required key ${key}`
							);
							return false;
						}
					}
				}
			}

			return true;
		} catch (err) {
			this.logger.error(`validateObject() error=`, err);
			return false;
		}
	}

	public destroy(): Promise<void> {
		// default no-op
		return Promise.resolve();
	}
}
