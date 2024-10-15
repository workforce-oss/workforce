import { expect } from "chai";
import { randomUUID } from "crypto";
import { Sequelize } from "sequelize-typescript";
import { TrackerBroker } from "../../../src/objects/tracker/broker.js";
import { MockTracker } from "../../../src/objects/tracker/impl/mock/mock_tracker.js";
import { TicketEvent } from "../../../src/objects/tracker/model.js";
import { createBasicFlow, createBasicTracker, createOrg, newDb } from "../../helpers/db.js";

describe("Tracker Broker", () => {
	let sequelize: Sequelize;
	before(
		() =>
			(sequelize = newDb())
	);
	beforeEach(async () => await sequelize.sync({ force: true }));
	it("should register a tracker and be able to create tickets", async () => {
		const orgId = randomUUID();
		await createOrg(orgId);

		const flow = await createBasicFlow(orgId);
		const trackerDb = await createBasicTracker(orgId, flow.id);
		const trackerConfig = trackerDb.toModel();

		const tracker = new MockTracker(trackerConfig);

		const broker = new TrackerBroker({
			mode: "in-memory",
		});
		await broker.register(tracker);
		let ticketCreated = false;
		let gotTicket: TicketEvent | undefined;
		await broker.subscribe(trackerConfig.id!, (ticket: TicketEvent) => {
			console.log("got ticket", ticket);
			ticketCreated = true;
			gotTicket = ticket;
		});

		await broker.create({
			trackerId: trackerConfig.id!,
			requestId: "mock-ticket-event-id",
			input: {
				name: "test",
				description: "test",
				status: "ready",
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 200));

		expect(ticketCreated).to.be.true;

		expect(gotTicket).to.deep.equal({
			ticketId: "mock-ticket-id",
			ticketEventId: "mock-ticket-event-id",
			trackerId: trackerConfig.id!,
			data: {
				name: "test",
				description: "test",
				status: "ready",
			},
		});
	});
	it("should update a ticket", async () => {
		const orgId = randomUUID();
		await createOrg(orgId);
		
		const flow = await createBasicFlow(orgId);
		const trackerDb = await createBasicTracker(orgId, flow.id);
		const trackerConfig = trackerDb.toModel();

		const tracker = new MockTracker(trackerConfig);

		const broker = new TrackerBroker({mode: "in-memory"});
		await broker.register(tracker);
		let ticketCreated = false;
		let ticketUpdated = false;
		let gotTicket: TicketEvent | undefined;
		await broker.subscribe(trackerConfig.id!, async (ticket: TicketEvent) => {
			if (ticketCreated) {
				ticketUpdated = true;
			} else {
				ticketCreated = true;
			}
			gotTicket = ticket;
		});

		await broker.create({
			trackerId: trackerConfig.id!,
			requestId: "mock-ticket-event-id",
			input: {
				name: "test",
				description: "test",
				status: "ready",
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 200));

		expect(ticketCreated).to.be.true;

		await broker.update({
			ticketId: "mock-ticket-id",
			ticketUpdateId: "mock-ticket-event-id",
			trackerId: trackerConfig.id!,
			data: {
				name: "test2",
				description: "test2",
				status: "ready",
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 200));

		expect(ticketUpdated).to.be.true;

		expect(gotTicket).to.deep.equal({
			ticketId: "mock-ticket-id",
			ticketEventId: "mock-ticket-event-id",
			trackerId: trackerConfig.id!,
			data: {
				name: "test2",
				description: "test2",
				status: "ready",
			},
		});
	});
});
