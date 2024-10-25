import { Skill } from "workforce-core/model";
import { RestApiInstanceOptions } from "./base/rest_api.js";
import { OrgSubResourceAPI } from "./org_api.subresource.js";

export class SkillAPI extends OrgSubResourceAPI<Skill, string> {
    static instance: SkillAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): SkillAPI {
        if (!SkillAPI.instance || options.accessToken !== SkillAPI.instance.accessToken) {
            SkillAPI.instance = new SkillAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "skills",
                objectType: "skill",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return SkillAPI.instance;
    }
}