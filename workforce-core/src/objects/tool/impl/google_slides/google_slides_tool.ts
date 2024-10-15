import { Logger } from "../../../../logging/logger.js";
import { APICall, convertToAPICall, performAPICall } from "../../../../util/openapi.js";
import { HumanState, ToolState } from "../../../base/model.js";
import { ToolStateDb } from "../../db.state.js";
import { OpenAPITool } from "../openapi/openapi_tool.js";
import { AuthData } from "../openapi/openapi_types.js";
import schema from "./api_schema.js";

export class GoogleSlidesTool extends OpenAPITool {
    logger = Logger.getInstance("GoogleSlidesTool");

    protected displayName = "Google Slides";
    
    protected getSchema(): Promise<Record<string, unknown>> {
        return Promise.resolve(schema);
    }
    protected extractHumanState(apiCall: APICall, result: Record<string, unknown>): Promise<HumanState | undefined> {
        this.logger.debug(`Extracting human state for ${apiCall.path}`);
        if ((/\/presentations\/[^/]+/.exec(apiCall.path)) && apiCall.verb.toLocaleLowerCase() === "get") {
            this.logger.debug(`extractHumanState() matched ${apiCall.path}`)
            return Promise.resolve({
                name: result.title as string | undefined,
                embed: this.getEmbedurl(result.presentationId as string | undefined),
                directUrl: this.getDirectUrl(result.presentationId as string | undefined),
                type: "iframe",
            });
        }
        return Promise.resolve(undefined);
    }

    protected extractMachineState(apiCall: APICall, result: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
        if ((/\/presentations\/[^/]+/.exec(apiCall.path)) && apiCall.verb.toLocaleLowerCase() === "get") {
            const stateData = {
                slides: result.slides,
                title: result.title,
                revisionId: result.revisionId,
            }

            delete result.slides;

            return Promise.resolve({
                presentationState: {
                    stateData,
                },
                presentationId: result.presentationId,
            });
        }

        return Promise.resolve(undefined);
    }
    
    override initSession(sessionId?: string): Promise<void> {
        const initialState: ToolState<unknown> = {
            toolId: this.config.id!,
            taskExecutionId: sessionId!,
            timestamp: Date.now(),
        };

        ToolStateDb.create({
            taskExecutionId: sessionId!,
            toolId: this.config.id!,
        }).catch((err: Error) => {
            this.logger.error(`Error saving state to db for taskExecutionId=${sessionId} toolId=${this.config.id}`, err);
        });

        return this.stateCache?.taskExecutionIdsToToolState.set(sessionId!, JSON.stringify(initialState));
    }

    public override async getState(args:
        {
            currentState: ToolState<Record<string, unknown>>,
            channelId?: string,
            channelThreadId?: string,
            workerId?: string
        }): Promise<ToolState<Record<string, unknown>> | undefined> {
        const {currentState, channelId, channelThreadId } = args;
        const currentMachineState = currentState?.machineState;
        const presentationId = currentMachineState?.presentationId;
        if (!presentationId) {
            this.logger.error(`getState() No presentationId found in machine state for taskExecutionId=${currentState.taskExecutionId}`);
            return;
        }

        const schema = await this.getSchema();
        const apiCall = convertToAPICall({
            name: "get_presentations_by_presentationId",
            arguments: {
                presentationId: currentMachineState.presentationId,
            }
        }, schema)

        const result = await performAPICall({
            apiCall,
            openApiDocument: schema,
            orgId: this.config.orgId,
            taskExecutionId: currentState.taskExecutionId,
            variables: this.config.variables!,
            channelThreadId: channelThreadId,
            logger: this.logger,
            additionalQueryParams: this.additionalQueryParams(apiCall),
            oauth2CallBackHandler: async (auth: AuthData) => {
                return await this.refreshAuth({
                    auth,
                    channelId: channelId,
                    workerId: args.workerId,
                    taskExecutionId: currentState.taskExecutionId,
                });
            },
        }).catch((err: Error) => {
            this.logger.error(`Error performing API call: ${err.message}`);
            return { error: err.message };
        });

        if (result.error) {
            this.logger.error(`Error updating machine state: ${result.error as string}`);
            return currentState
        } else {
            const humanState = await this.extractHumanState(apiCall, result);
            const machineState = await this.extractMachineState(apiCall, result);

            const toolState: ToolState<Record<string, unknown>> = {
                toolId: this.config.id!,
                taskExecutionId: currentState.taskExecutionId,
                timestamp: Date.now(),
                machineState: machineState,
                humanState: humanState,
            };
            return toolState;
        }
    }

    private getDirectUrl(presentationId?: string): string | undefined {
        if (!presentationId) {
            return undefined;
        }
        return `https://docs.google.com/presentation/d/${presentationId}/edit?usp=sharing`;
    }


    private getEmbedurl(presentationId?: string): string | undefined {
        if (!presentationId) {
            return undefined;
        }
        return `https://docs.google.com/presentation/d/${presentationId}/edit?usp=sharing&rm=embedded`;
    }

    protected filterOutput(apiCall: APICall, result: Record<string, unknown>): Record<string, unknown> {
        if ((/\/presentations\/[^/]+/.exec(apiCall.path)) && apiCall.verb.toLocaleLowerCase() === "get") {
            const masters = result.masters as {
                objectId?: string,
                pageType?: string,
                masterProperties?: Record<string, unknown>,
                pageElements?:  {
                    objectId?: string,
                    shape?: {
                        shapeType?: string,
                        placeholder?: Record<string, unknown>
                    }
                }[]
            }[] | undefined;

            const layouts = result.layouts as {
                objectId?: string,
                pageType?: string,
                layoutProperties?: Record<string, unknown>,
                pageProperties?: Record<string, unknown>,
                pageElements?:  {
                    objectId?: string,
                    shape?: {
                        shapeType?: string,
                        placeholder?: Record<string, unknown>
                    }
                }[]
            }[] | undefined;
            
            return {
                title: result.title,
                presentationId: result.presentationId,
                revisionId: result.revisionId,
                slides: result.slides,
                masters: masters?.map((master) => {
                    return {
                        objectId: master.objectId,
                        pageType: master.pageType,
                        masterProperties: master.masterProperties,
                        pageElements: master.pageElements?.map((pageElement) => {
                            return {
                                objectId: pageElement.objectId,
                                shape: pageElement.shape ? {
                                    shapeType: pageElement.shape?.shapeType,
                                    placeholder: pageElement.shape?.placeholder
                                } : undefined,
                            };
                        })
                    };
                }),
                layouts: layouts?.map((layout) => {
                    return {
                        objectId: layout.objectId,
                        pageType: layout.pageType,
                        layoutProperties: layout.layoutProperties,
                        pageProperties: layout.pageProperties,
                        pageElements: layout.pageElements?.map((pageElement) => {
                            return {
                                objectId: pageElement.objectId,
                                shape: pageElement.shape ? {
                                    shapeType: pageElement.shape?.shapeType,
                                    placeholder: pageElement.shape?.placeholder
                                } : undefined,
                            };
                        })
                    };
                })
            };
        }
        return result;
    }
}