import bodyParser from "body-parser";
import express, { RequestHandler, Router } from "express";
import { reviver } from "../../util/json.js";
import { DbFactory } from "./factory/db_factory.js";
import { ObjectType } from "./factory/types.js";
import { VariablesSchema } from "./variables_schema.js";
// import { auth } from "express-oauth2-jwt-bearer"; Must be imported for auth typing to work
import { Op, WhereOptions } from "sequelize";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";
import { Logger } from "../../logging/logger.js";
import { ChannelType } from "../channel/model.js";
import { CredentialHelper } from "../credential/helper.js";
import { WorkerConfig } from "../worker/model.js";
import { BaseModel, BaseModelAttributes } from "./db.js";
import { BaseConfig } from "./model.js";

/**
 * This file contains the CRUD handlers for the base objects.
 * These handlers are used by the API router to handle requests.
 */
export function ModelRouter(type: ObjectType, routerOptions?: RouterOptions): Router {
	const handlers = ModelHandlers(type, routerOptions?.authorizationOptions);
	handlers.update = handlers.create;
	return CrudRouter(handlers, routerOptions?.additionalRoutes);
}

export function CrudRouter(handlers: CrudHandlers, additionalHandlers?: ((router: Router) => void)[]): Router {
	const router = Router({ mergeParams: true });
	if (additionalHandlers) {
		additionalHandlers.forEach((handler) => handler(router));
	}
	router.post("/", ...handlers.create);
	router.get("/:id", ...handlers.read);
	router.get("/", ...handlers.list);
	router.put("/:id", ...handlers.update);
	router.delete("/:id", ...handlers.delete);

	return router;
}

export function ModelHandlers(type: ObjectType, authorizationOptions?: AuthorizationOptions): CrudHandlers {
	return {
		create: [
			bodyParser.json({
				reviver: reviver,
			}),
			AuthorizationHelper.withOrgRole(authorizationOptions?.routePermissions?.create ?? ["admin", "maintainer"]),
			validateVariablesSchema(type),
			async (req: express.Request, res: express.Response) => {
				try {
					const orgId = req.params.orgId;
					const flowId = req.params.flowId;
					const id = req.params.id;
					const body = req.body as BaseConfig | undefined;

					if (!body?.name) {
						res.status(400).send([{ message: "Missing name" }]);
						return;
					}

					body.orgId = orgId;
					if (flowId) {
						body.flowId = flowId;
					}
					let found: BaseModel & { flowId?: string } | null = null;
					if (id) {
						found = await DbFactory.getType(type).findByPk(id);
						if (found?.orgId !== orgId) {
							res.status(404).send({ message: "Invalid OrgId" });
							return;
						} else if (flowId && found?.flowId !== flowId) {
							res.status(404).send({ message: "Invalid FlowId" });
							return;
						}
					} else {
						found = await DbFactory.getType(type).findOne({
							where: whereQuery({ orgId, name: body.name, flowId }),
						});
					}
					try {
						await replaceCredentialNamesWithIds(body, type, orgId);
					} catch (e) {
						Logger.getInstance(`${type}-api`).error(`${(e as Error).message}`, e);
						res.status(400).send([{ message: (e as Error).message }]);
						return
					}

					if (!body.id && body.variables?.user_id) {
						body.id = body.variables?.user_id as string;
					}
					let result: unknown;
					let status = 201;
					if (!found) {
						const db = DbFactory.createDb(type, body);
						db.loadModel(body);
						if (body.id) {
							db.id = body.id;
							Logger.getInstance(`${type}-api`).info(`Setting id for ${type}: ${body.id}`);
							db.setDataValue("id", body.id);
						}

						await db.save();
						result = db.toModel();
					} else {
						found.loadModel(body);
						await found.save();
						result = found.toModel();
						status = 200;
					}

					await replaceCredentialIdsWithNames(result as BaseConfig, type);

					res.status(status).send(result);

				} catch (e) {
					Logger.getInstance(`${type}-api`).error(`${req.originalUrl} ${(e as Error).message}`, e);
					res.status(500).send([{ message: (e as Error).message }]);
				}
			},
		],
		read: [
			bodyParser.json({
				reviver: reviver,
			}),
			AuthorizationHelper.withOrgRole(authorizationOptions?.routePermissions?.read ?? ["admin", "maintainer"]),
			async (req: express.Request, res: express.Response) => {
				try {
					const orgId = req.params.orgId;
					const flowId = req.params.flowId;
					const id = req.params.id;

					const found = await DbFactory.getType(type).findOne({
						where: whereQuery({ orgId, id, flowId }),
					});
					if (!found) {
						Logger.getInstance(`${type}-api`).error(`Not Found: ${req.originalUrl}, orgId: ${orgId}, flowId: ${flowId} id: ${req.params.id}`);
						res.status(404).send([{
							message: "Not Found",
						}]);
						return;
					}

					const model = found.toModel();
					await replaceCredentialIdsWithNames(model, type);
					res.send(model);
				} catch (e) {
					Logger.getInstance(`${type}-api`).error(`${req.originalUrl} ${(e as Error).message}`, e);
					res.status(500).send({ message: (e as Error).message });
				}
			},
		],
		list: [
			bodyParser.json({
				reviver: reviver,
			}),
			AuthorizationHelper.withOrgRole(authorizationOptions?.routePermissions?.list ?? ["admin", "maintainer"]),
			async (req: express.Request, res: express.Response) => {
				try {
					const orgId = req.params.orgId;
					const flowId = req.params.flowId;

					const found = await DbFactory.getType(type).findAll({
						where: whereQuery({ orgId, flowId }),
						include: {
							all: true,
						},
					});

					const models = found.map((f: BaseModel) => f.toModel());
					await Promise.all(models.map(async (r) => {
						await replaceCredentialIdsWithNames(r, type);
					}));
					res.send(models);
				} catch (e) {
					Logger.getInstance(`${type}-api`).error(`${req.originalUrl} ${(e as Error).message}`, e);
					res.status(500).send({ message: (e as Error).message });
				}
			},
		],
		// No Update handler for now, just doing upserts with create
		update: [],
		delete: [
			bodyParser.json({
				reviver: reviver,
			}),
			AuthorizationHelper.withSpaceRole(authorizationOptions?.routePermissions?.delete ?? ["admin", "maintainer"]),
			async (req: express.Request, res: express.Response, next: express.NextFunction) => {
				try {
					const orgId = req.params.orgId;
					const flowId = req.params.flowId;
					const id = req.params.id;
					const found = await DbFactory.getType(type).findOne({
						where: whereQuery({ orgId, id, flowId }),
					});
					if (!found) {
						res.status(404).send([{
							message: "Not Found",
						}]);
						return;
					}

					await found.destroy();
					res.send({ id: req.params.id, deleted: true });
				} catch (e) {
					Logger.getInstance(`${type}-api`).error(`${req.originalUrl} ${(e as Error).message}`, e);
					next(e);
				}
			},
		],
	};
}

/**
 * This type serves as a container for the CRUD handlers.
 * The handlers are grouped by CRUD operation.
 */
export interface CrudHandlers {
	create: RequestHandler[];
	read: RequestHandler[];
	list: RequestHandler[];
	update: RequestHandler[];
	delete: RequestHandler[];
};

export interface RouterOptions {
	additionalRoutes?: ((router: Router) => void)[];
	authorizationOptions?: AuthorizationOptions;
}

export interface AuthorizationOptions {
	routePermissions?: RoutePermissions;
}

export interface RoutePermissions {
	create?: string[];
	read?: string[];
	list?: string[];
	update?: string[];
	delete?: string[];
}

const whereQuery = (options: { orgId: string, id?: string, name?: string, flowId?: string }): WhereOptions<BaseModelAttributes> => {
	const { orgId, id, name, flowId } = options;
	let where: WhereOptions<BaseModelAttributes> = {
		orgId,
	}
	if (name) {
		where = {
			...where,
			name,
		}
	}
	if (id) {
		where = {
			...where,
			id,
		}
	}

	if (flowId) {
		where = {
			...where,
			flowId,
		}
	} else {
		where = {
			...where,
			[Op.or]: [
				{
					status: {
						[Op.is]: null
					},
				},
				{
					status: {
						[Op.ne]: "deleted"
					},
				},
			],
		}
	}
	return where;
}

const replaceCredentialNamesWithIds = async (config: BaseConfig, objectType: ObjectType, orgId: string): Promise<void> => {
	if (objectType === "worker") {
		await replaceWorkerCredentialNamesWithIds(config as WorkerConfig, orgId);
	} else {
		await CredentialHelper.instance.replaceCredentialNameWithId(config, orgId);
	}
}

const replaceCredentialIdsWithNames = async (config: BaseConfig, objectType: ObjectType): Promise<void> => {
	if (objectType === "worker") {
		await replaceWorkerCredentialIdsWithNames(config as WorkerConfig);
	} else {
		await CredentialHelper.instance.replaceCredentialIdWithName(config);
	}
}

const replaceWorkerCredentialIdsWithNames = async (config: WorkerConfig): Promise<void> => {
	await CredentialHelper.instance.replaceCredentialIdWithName(config);
	for (const channelType of Object.keys(config.channelUserConfig ?? {})) {
		const channelCredential = (config).channelUserConfig![
			channelType as ChannelType
		];
		const credentialName = await CredentialHelper.instance.getCredentialNameForId(
			channelCredential
		);
		if (!credentialName) {
			throw new Error(`Credential ${channelCredential} not found`);
		}
		config.channelUserConfig![channelType as ChannelType] = credentialName;
	}
}

const replaceWorkerCredentialNamesWithIds = async (config: WorkerConfig, orgId: string): Promise<void> => {
	await CredentialHelper.instance.replaceCredentialNameWithId(config, orgId);
	if (!config.channelUserConfig) {
		return;
	}
	for (const channelType of Object.keys(config.channelUserConfig)) {
		const channelCredential = config.channelUserConfig[channelType as ChannelType];
		const credentialId = await CredentialHelper.instance.getCredentialIdForName(
			config.orgId,
			channelCredential
		);
		if (!credentialId) {
			throw new Error(`Credential ${channelCredential} not found`);
		}
		config.channelUserConfig[channelType as ChannelType] = credentialId;
	}
}
/**
 * This function validates that the variables in the request match the variables schema.
 * If the variables do not match the schema, the request is rejected.
 */
export const validateVariablesSchema = (objectType: ObjectType): RequestHandler => (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction
) => {
	try {
		const body = req.body as BaseConfig;
		const errors = VariablesSchema.validateBaseObject(body, objectType);
		if (errors && errors.length > 0) {
			Logger.getInstance("object-api").error(
				`validateVariablesSchema() validation errors: ${JSON.stringify(errors, null, 2)}`
			);
			res.status(400).send(JSON.stringify(errors, null, 2));
			return;
		}
	} catch (e) {
		Logger.getInstance("object-api").error(
			`validateVariablesSchema() error executing validation: ${(e as Error).message}`,
			e
		);
		res.status(400).send([{
			message: "Bad Request"
		}]);
		return;
	}
	next();
};
