import { OAuth2Server } from "workforce-core";
import { RestApiComponent } from "../../../src/components/impl/rest_api.js";
import { ServerContext } from "../../../src/context.js";

export class TestContext extends ServerContext {
    oauth2Server?: OAuth2Server;

    constructor() {
        const rootDir = import.meta.dirname;
        console.log("TestContext dirname: " +rootDir);
        super(["all"], rootDir);
    }

    async init() {
        await super.init();
        const restApiComponent = this.components.find((component) => component.componentName === "workforce-rest-api");
        this.oauth2Server = (restApiComponent as RestApiComponent).oauth2Server;
    }

    async createJwt(options: {
        payload: { [key: string]: any },
        issuer: string,
        subject: string,
        audience: string,
        secret?: string,
    }): Promise<string> {
        const jwt = await this.oauth2Server?.createJwt(options) ?? "";
        console.log(jwt);
        return jwt;
    }
}