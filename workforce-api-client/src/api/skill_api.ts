import { Skill } from "workforce-core/model";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";

export class SkillAPI extends RestApi<Skill, string> {
    static instance: SkillAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): SkillAPI {
        if (!SkillAPI.instance || options.accessToken !== SkillAPI.instance.accessToken) {
            SkillAPI.instance = new SkillAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "skills",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return SkillAPI.instance;
    }
}