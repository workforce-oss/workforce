import { BaseComponent } from "./base.js";
import { AsyncApiComponent } from "./impl/async_api.js";
import { EngineComponent } from "./impl/engine.js";
import { RestApiComponent } from "./impl/rest_api.js";
import { SecretsApiComponent } from "./impl/secrets_api.js";
import { WorkforceComponent } from "./model.js";

export class ComponentFactory {
    static createComponent(componentName: WorkforceComponent): BaseComponent[] {
        if (componentName === "workforce-engine") {
            return [new EngineComponent(componentName)];
        } else if (componentName === "workforce-rest-api") {
            return [new RestApiComponent(componentName)];
        } else if (componentName === "workforce-async-api") {
            return [new AsyncApiComponent(componentName)];
        } else if (componentName === "workforce-secrets-api") {
            return [new SecretsApiComponent(componentName)];
        } else if (componentName === "all") {
            return [
                new SecretsApiComponent("workforce-secrets-api"),
                new RestApiComponent("workforce-rest-api"),
                new AsyncApiComponent("workforce-async-api"),
                new EngineComponent("workforce-engine"),
            ];
        } else {
            throw new Error(`Component ${componentName} not found`);
        }
    }
}