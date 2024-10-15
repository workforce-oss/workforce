import chai, { expect } from "chai";
import { randomUUID } from "crypto";
import deepEqualInAnyOrder from "deep-equal-in-any-order";
import _ from "lodash";
import { Sequelize } from "sequelize-typescript";
import { ChannelConfig, ResourceConfig, ToolConfig, TrackerConfig } from "../../../src/model.js";
import { FlowDb } from "../../../src/objects/flow/db.js";
import { FlowConfig } from "../../../src/objects/flow/model.js";
import { createBasicDocumentationConfig, createOrg, newDb } from "../../helpers/db.js";
import { Documentation, DocumentationDb } from "../../../src/index.js";
import { DocumentRelationDb } from "../../../src/objects/documentation/db.document_relation.js";

chai.use(deepEqualInAnyOrder);

describe("Flow DB", () => {
    let sequelize: Sequelize;
    before(() => (sequelize = newDb()));
    beforeEach(async () => await sequelize.sync({ force: true }));

    describe("FlowDb", () => {
        it("should create a db object from a model, save it, retrieve it, and convert back", async () => {
            const orgId = randomUUID();
            await createOrg(orgId);

            const flowConfig: FlowConfig = {
                name: "test",
                description: "test",
                orgId: orgId,
                status: "active",

                tasks: [{
                    name: "test-input-task",
                    description: "test",
                    type: "task",
                    subtype: "mock",
                    orgId: orgId,
                    defaultChannel: "test-channel",
                    tracker: "test-input-tracker",
                    documentation: ["test-documentation"],
                    outputs: ["test-output-resource", "test-output-tracker"],
                    tools: [{ name: "test-tool" }],
                    subtasks: [{
                        name: "test-input-task2",
                    }],
                    inputs: {
                        testInput: "test-input-resource",
                    }
                },
                {
                    name: "test-input-task2",
                    description: "test",
                    type: "task",
                    subtype: "mock",
                    orgId: orgId,
                    inputs: {
                        message: "test-input-task"
                    },
                }],
                channels: [],
                documentation: [],
                tools: [],
            }
            const inputTrackerConfig: TrackerConfig = {
                name: "test-input-tracker",
                description: "test",
                orgId: orgId,
                subtype: "mock",
                type: "tracker",
            }
            const outputTrackerConfig: TrackerConfig = {
                name: "test-output-tracker",
                description: "test",
                orgId: orgId,
                subtype: "mock",
                type: "tracker",
            }
            const inputResourceConfig: ResourceConfig = {
                name: "test-input-resource",
                description: "test",
                orgId: orgId,
                subtype: "mock",
                type: "resource",
            }
            const outputResourceConfig: ResourceConfig = {
                name: "test-output-resource",
                description: "test",
                orgId: orgId,
                subtype: "mock",
                type: "resource",
            }
            const testChannelConfig: ChannelConfig = {
                name: "test-channel",
                description: "test",
                orgId: orgId,
                subtype: "mock",
                type: "channel",
            }
            const testToolConfig: ToolConfig = {
                name: "test-tool",
                description: "test",
                orgId: orgId,
                subtype: "mock",
                type: "tool",
            }

            const documentationConfig = await createBasicDocumentationConfig(orgId, "test-documentation");

            flowConfig.resources = [inputResourceConfig, outputResourceConfig];
            flowConfig.trackers = [inputTrackerConfig, outputTrackerConfig];
            flowConfig.channels = [testChannelConfig];
            flowConfig.documentation = [documentationConfig];
            flowConfig.tools = [testToolConfig];



            const flowDb = await new FlowDb().loadModel(flowConfig);

            // updated has references replaced with ids
            // flowConfig has ids added, but references remain as names
            const updated = _.cloneDeep(flowConfig);

            updated.id = flowDb.id;
            flowConfig.id = flowDb.id;


            updated.tasks![0].id = flowDb.tasks![0].id;
            updated.tasks![0].flowId = flowDb.id;

            flowConfig.tasks![0].id = flowDb.tasks![0].id;
            flowConfig.tasks![0].flowId = flowDb.id;

            flowConfig.tasks![1].id = flowDb.tasks![1].id;
            flowConfig.tasks![1].flowId = flowDb.id;

            updated.resources![0].id = flowDb.resources![0].id;
            updated.resources![0].flowId = flowDb.id;

            flowConfig.resources![0].id = flowDb.resources![0].id;
            flowConfig.resources![0].flowId = flowDb.id;

            updated.resources![1].id = flowDb.resources![1].id;
            updated.resources![1].flowId = flowDb.id;

            flowConfig.resources![1].id = flowDb.resources![1].id;
            flowConfig.resources![1].flowId = flowDb.id

            updated.trackers![0].id = flowDb.trackers![0].id;
            updated.trackers![0].flowId = flowDb.id;

            flowConfig.trackers![0].id = flowDb.trackers![0].id;
            flowConfig.trackers![0].flowId = flowDb.id;

            updated.trackers![1].id = flowDb.trackers![1].id;
            updated.trackers![1].flowId = flowDb.id;

            flowConfig.trackers![1].id = flowDb.trackers![1].id;
            flowConfig.trackers![1].flowId = flowDb.id;

            updated.channels![0].id = flowDb.channels![0].id;
            updated.channels![0].flowId = flowDb.id;

            flowConfig.channels![0].id = flowDb.channels![0].id;
            flowConfig.channels![0].flowId = flowDb.id;

            updated.documentation![0].id = flowDb.documentation![0].id;
            updated.documentation![0].flowId = flowDb.id;
            updated.documentation![0].repository = flowDb.documentation![0].repositoryId!;
            updated.documentation![0].documents = flowDb.documentation![0].documentRelations?.map((d) => d.documentId);

            flowConfig.documentation![0].id = flowDb.documentation![0].id;
            flowConfig.documentation![0].flowId = flowDb.id;

            updated.tools![0].id = flowDb.tools![0].id;
            updated.tools![0].flowId = flowDb.id;

            flowConfig.tools![0].id = flowDb.tools![0].id;
            flowConfig.tools![0].flowId = flowDb.id;

            updated.tasks![0] = {
                id: flowDb.tasks![0].id,
                orgId: orgId,
                flowId: flowDb.id,
                name: flowDb.tasks![0].name,
                description: flowDb.tasks![0].description,
                type: 'task',
                subtype: 'mock',
                documentation: [flowDb.documentation![0].id],
                tracker: flowDb.trackers![0].id,
                outputs: [flowDb.resources![1].id, flowDb.trackers![1].id],
                defaultChannel: flowDb.channels![0].id,
                tools: [{
                    id: flowDb.tools![0].id,
                    name: flowDb.tools![0].name,
                }],
                inputs: {
                    testInput: flowDb.resources![0].id,
                },
                subtasks: [{
                    id: flowDb.tasks![1].id,
                    name: flowDb.tasks![1].name,
                }],
            }

            updated.tasks![1] = {
                id: flowDb.tasks![1].id,
                orgId: orgId,
                flowId: flowDb.id,
                name: flowDb.tasks![1].name,
                description: flowDb.tasks![1].description,
                type: 'task',
                subtype: 'mock',
                inputs: {
                    message: flowDb.tasks![0].id,
                },
            }


            await flowDb.save().catch((e) => {
                throw e;
            });

            const retrievedFlowDb = await FlowDb.findByPk(flowDb.id, { include: [{ all: true}, {
                model: DocumentationDb,
                include: [DocumentRelationDb]
            }] });
            
        
            const retrievedDocumentation = await DocumentationDb.findByPk(flowDb.documentation![0].id, { include: { all: true } });
            // Expect retrieved flow to use ids for references
            const retrievedFlowConfig = await retrievedFlowDb!.toModel();
            expect(retrievedFlowConfig, "expect updated flow to equal retrieved flow config").to.deep.equalInAnyOrder(updated);

            // Expect mapped flow to use names for references
            const mappedFlowConfig = await retrievedFlowDb!.toModel({ replaceIdsWithNames: true });
            expect(mappedFlowConfig, "expect mapped flow to equal flowconfig").to.deep.equalInAnyOrder(flowConfig);
        });
    });
    it("should not be possible to create two flows for the same org with the same name", async () => {
        const orgId = randomUUID();
        await createOrg(orgId);
        
        const flowConfig: FlowConfig = {
            name: "test",
            description: "test",
            orgId: orgId,
            status: "active",
        }

        const flowDb = await new FlowDb().loadModel(flowConfig);
        flowConfig.id = flowDb.id;
        await flowDb.save();

        const flowDb2 = await new FlowDb().loadModel(flowConfig);
        flowConfig.id = flowDb2.id;
        try {
            await flowDb2.save();
            expect.fail("should not have been able to save a second flow with the same name and org");
        } catch (e: any) {
            expect(e.message).to.equal("Validation error");
        }
    });

});