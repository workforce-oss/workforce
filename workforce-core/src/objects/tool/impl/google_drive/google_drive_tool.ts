import { APICall } from "../../../../util/openapi.js";
import { HumanState } from "../../../base/model.js";
import { OpenAPITool } from "../openapi/openapi_tool.js";
import schema from "./api_schema.js";

export class GoogleDriveTool extends OpenAPITool {
    protected getSchema(): Promise<Record<string, unknown>> {
        return Promise.resolve(schema);
    }

    protected displayName = "Google Drive";

    protected extractHumanState(apiCall: APICall, result: Record<string, unknown>): Promise<HumanState | undefined> {
        this.logger.debug(`Extracting human state for ${apiCall.path}`);
        if ((/\/files\/[^/]+/.exec(apiCall.path)) || (apiCall.path === "/files" && apiCall.verb.toLocaleLowerCase() === "post")) {
            this.logger.debug(`extractHumanState() matched ${apiCall.path}`)
            return Promise.resolve({
                name: result.name as string | undefined,
                embed: this.getEmbedurl(result.webViewLink as string | undefined),
                directUrl: result.webViewLink as string | undefined,
                type: "iframe",
            });
        } else {
            return Promise.resolve(undefined);
        }
    }

    protected additionalQueryParams(apiCall: APICall): Record<string, string> {
        if (apiCall.path === "/files" && apiCall.verb.toLocaleLowerCase() === "post") {
            return {
                fields: "id,webViewLink,name",
            };
        } else if (/\/files\/[^/]+/.exec(apiCall.path)) {
            return {
                fields: "id,webViewLink,name",
            };
        }

        return {};
    }

    private getEmbedurl(webViewLink?: string): string | undefined {
        if (!webViewLink) {
            return undefined;
        }
        return webViewLink + "&rm=embedded";
        
    }

}