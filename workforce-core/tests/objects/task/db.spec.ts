import { expect } from "chai";
import { randomUUID } from "crypto";
import { Sequelize } from "sequelize-typescript";
import { TaskDb } from "../../../src/objects/task/db.js";
import { TaskConfig } from "../../../src/objects/task/model.js";
import { createBasicFlow, createBasicTask, createOrg, newDb } from "../../helpers/db.js";
import { create } from "lodash";

describe("Task DB", () => {
	let sequelize: Sequelize;
	const orgId = randomUUID();
	before(() => (sequelize = newDb()));
	beforeEach(async () => {
		await sequelize.sync({ force: true })
		await createOrg(orgId);
	});

	describe("TaskDb", () => {
		it("should create a db object from a model, save it, retrieve it, and convert back", async () => {
			const flow = await createBasicFlow(orgId);

			const taskDb = await createBasicTask(orgId, flow.id);

			const retrievedTaskDb = await TaskDb.findByPk(taskDb.id);

			const retrievedTaskConfig = retrievedTaskDb!.toModel();

			expect(retrievedTaskConfig).to.deep.equal(taskDb.toModel());
		});
		it("should not be possible to create two tasks with the same name for the same flow", async () => {
            const flow = await createBasicFlow(orgId);
    
			const taskDb = await createBasicTask(orgId, flow.id);

			const taskDb2 = new TaskDb().loadModel(taskDb.toModel());
            taskDb2.id = randomUUID();
			try {
				await taskDb2.save();
				expect.fail();
			} catch (e: any) {
				expect(e.message).to.equal("Validation error");
			}
		});
	});
});
