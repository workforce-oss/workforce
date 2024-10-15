import bodyParser from "body-parser";
import express, { RequestHandler } from "express";
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
import { BaseConfig } from "./model.js";
import { DocumentRepositoryConfig } from "../document_repository/model.js";
import { BaseModel, BaseModelAttributes } from "./db.js";

/**
 * This file contains the CRUD handlers for the base objects.
 * These handlers are used by the API router to handle requests.
 */
export function ModelHandlers(type: ObjectType): CrudHandlers {
	return {
		create: [
			bodyParser.json({
				reviver: reviver,
			}),
			AuthorizationHelper.withOrgRole(["admin", "maintainer"]),
			validateVariablesSchema,
			async (req: express.Request, res: express.Response, next: express.NextFunction) => {
				try {

					const body = req.body as BaseConfig;
					if (!body.orgId || !body.name) {
						res.status(400).send("Missing orgId or name");
						return;
					}

					const found = await DbFactory.getType(type).findOne({
						where: {
							orgId: body.orgId,
							name: body.name,
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
					});
					// TODO: Remove hack for worker - We are allowing upserts for workers
					if (found && type !== "worker" && type !== "document_repository") {
						res.status(409).send(`A ${type} with the name ${body.name} already exists`);
						return;
					} else {
						if (type === "worker") {
							await CredentialHelper.instance.replaceCredentialNameWithId(body);
							const workerConfig = body as WorkerConfig;
							if (workerConfig.channelUserConfig) {
								for (const channelType of Object.keys(workerConfig.channelUserConfig ?? {})) {
									const channelCredential = workerConfig.channelUserConfig[channelType as ChannelType];
									const credentialId = await CredentialHelper.instance.getCredentialIdForName(
										workerConfig.orgId,
										channelCredential
									);
									if (!credentialId) {
										res.status(400).send([
											{
												message: `Credential ${channelCredential} not found`,
											}
										]);
										return;
									}
									workerConfig.channelUserConfig[channelType as ChannelType] = credentialId;
								}
							}
						} else if (type === "document_repository") {
							await CredentialHelper.instance.replaceCredentialNameWithId(body);
						}
						if (!body.id && body.variables?.user_id) {
							body.id = body.variables?.user_id as string;
						}
						let result: unknown;
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
						}

						if (type === "worker") {
							await CredentialHelper.instance.replaceCredentialIdWithName(result as WorkerConfig);
							for (const channelType of Object.keys((result as WorkerConfig).channelUserConfig ?? {})) {
								const channelCredential = (result as WorkerConfig).channelUserConfig![
									channelType as ChannelType
								];
								const credentialName = await CredentialHelper.instance.getCredentialNameForId(
									channelCredential
								);
								if (!credentialName) {
									res.status(400).send([
										{
											message: `Credential ${channelCredential} not found`,
										}
									]);
									return;
								}
								(result as WorkerConfig).channelUserConfig![channelType as ChannelType] =
									credentialName;
							}
						} else if (type === "document_repository") {
							await CredentialHelper.instance.replaceCredentialIdWithName(result as DocumentRepositoryConfig);
						}
						res.status(201).send(result);
					}
				} catch (e) {
					Logger.getInstance(`${type}-api`).error(`${req.originalUrl} ${(e as Error).message}`, e);
					next(e);
				}
			},
		],
		read: [
			bodyParser.json({
				reviver: reviver,
			}),
			async (req: express.Request, res: express.Response, next: express.NextFunction) => {
				try {
					if (!req.auth?.payload.sub) {
						res.status(401).send("Unauthorized");
						return;
					}

					const where: WhereOptions<BaseModelAttributes> = {
						id: req.params.id,
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
						]
					};

					const found = await DbFactory.getType(type).findOne({
						where
					});
					if (!found) {
						res.status(404).send([{
							message: "Not Found",
						}]);
						return;
					}

					// validate relations
					if (found.spaceId) {
						const hasSpaceRoles = await AuthorizationHelper.hasSpaceRoles(["admin", "maintainer", "developer"], req.auth?.payload.sub, found.spaceId);
						if (!hasSpaceRoles) {
							res.status(404).send([{
								message: "Not Found",
							}]);
							return;
						}
					} else {
						const hasOrgRoles = await AuthorizationHelper.hasOrgRoles(["admin", "maintainer", "developer"], req.auth?.payload.sub, found.orgId);
						if (!hasOrgRoles) {
							res.status(404).send([{
								message: "Not Found",
							}]);
							return;
						}
					}


					const model = found.toModel();
					if (type === "worker") {
						await CredentialHelper.instance.replaceCredentialIdWithName(model);
						for (const channelType of Object.keys((model as WorkerConfig).channelUserConfig ?? {})) {
							const channelCredential = (model as WorkerConfig).channelUserConfig![
								channelType as ChannelType
							];
							const credentialName = await CredentialHelper.instance.getCredentialNameForId(
								channelCredential
							);
							if (!credentialName) {
								res.status(400).send([{
									message: `Credential ${channelCredential} not found`
								}]);
								return;
							}
							(model as WorkerConfig).channelUserConfig![channelType as ChannelType] = credentialName;
						}
					} else if (type === "document_repository") {
						await CredentialHelper.instance.replaceCredentialIdWithName(model);
					}
					res.send(model);
				} catch (e) {
					Logger.getInstance(`${type}-api`).error(`${req.originalUrl} ${(e as Error).message}`, e);
					next(e);
				}
			},
		],
		list: [
			bodyParser.json({
				reviver: reviver,
			}),
			AuthorizationHelper.withOrgRole(["admin", "maintainer"]),
			async (req: express.Request, res: express.Response, next: express.NextFunction) => {
				try {
					// unless this is in the credentials path, we need to check for a flowId
					if (type !== "worker" && type !== "document_repository") {
						if (!req.query.flowId) {
							res.status(400).send([{
								message: "Missing flowId",
							}]);
							return;
						}

						const found = await DbFactory.getType(type).findAll({
							where: {
								orgId: req.query.orgId as string,
								flowId: req.query.flowId as string,
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

							},
							include: {
								all: true,
							},
						});
						const result = found.map((f: BaseModel) => f.toModel());
						res.send(result);
					} else {
						const found = await DbFactory.getType(type).findAll({
							where: {
								orgId: req.query.orgId as string,
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
							},
							include: {
								all: true,
							},
						});
						const result = found.map((f: BaseModel) => f.toModel());
						if (type === "worker") {
							for (const worker of result) {
								await CredentialHelper.instance.replaceCredentialIdWithName(worker);
								for (const channelType of Object.keys((worker as WorkerConfig).channelUserConfig ?? {})) {
									const channelCredential = (worker as WorkerConfig).channelUserConfig![
										channelType as ChannelType
									];
									const credentialName = await CredentialHelper.instance.getCredentialNameForId(
										channelCredential
									);
									if (!credentialName) {
										res.status(400).send([{
											message: `Credential ${channelCredential} not found`
										}]);
										return;
									}
									(worker as WorkerConfig).channelUserConfig![channelType as ChannelType] = credentialName;
								}
							}
						} else if (type === "document_repository") {
							for (const repository of result) {
								await CredentialHelper.instance.replaceCredentialIdWithName(repository);
							}
						}

						res.send(result);
					}
				} catch (e) {
					Logger.getInstance(`${type}-api`).error(`${req.originalUrl} ${(e as Error).message}`, e);
					next(e);
				}
			},
		],
		update: [
			bodyParser.json({
				reviver: reviver,
			}),
			AuthorizationHelper.withOrgRole(["admin", "maintainer"]),
			validateVariablesSchema,
			async (req: express.Request, res: express.Response, next: express.NextFunction) => {
				try {
					const body = req.body as BaseConfig;
					const found = await DbFactory.getType(type).findOne({
						where: {
							orgId: body.orgId,
							id: req.params.id,
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
						},
					});
					if (!found) {
						res.status(404).send([{
							message: "Not Found",
						}]);
						return;
					}
					if (type === "worker") {
						const workerConfig = body as WorkerConfig;
						await CredentialHelper.instance.replaceCredentialNameWithId(workerConfig);
						if (workerConfig.channelUserConfig) {
							for (const channelType of Object.keys(workerConfig.channelUserConfig ?? {})) {
								const channelCredential = workerConfig.channelUserConfig[channelType as ChannelType];
								const credentialId = await CredentialHelper.instance.getCredentialIdForName(
									workerConfig.orgId,
									channelCredential
								);
								if (!credentialId) {
									res.status(400).send([{
										message: `Credential ${channelCredential} not found`
									}]);
									return;
								}
								workerConfig.channelUserConfig[channelType as ChannelType] = credentialId;
							}
						}
					} else if (type === "document_repository") {
						await CredentialHelper.instance.replaceCredentialNameWithId(body);
					}
					found.loadModel(body);
					await found.save();
					const result = found.toModel();
					if (type === "worker") {
						await CredentialHelper.instance.replaceCredentialIdWithName(result);
						for (const channelType of Object.keys((result as WorkerConfig).channelUserConfig ?? {})) {
							const channelCredential = (result as WorkerConfig).channelUserConfig![
								channelType as ChannelType
							];
							const credentialName = await CredentialHelper.instance.getCredentialNameForId(
								channelCredential
							);
							if (!credentialName) {
								res.status(400).send([{
									message: `Credential ${channelCredential} not found`
								}]);
								return;
							}
							(result as WorkerConfig).channelUserConfig![channelType as ChannelType] = credentialName;
						}
					} else if (type === "document_repository") {
						await CredentialHelper.instance.replaceCredentialIdWithName(result);
					}
					res.send(result);
				} catch (e) {
					Logger.getInstance(`${type}-api`).error(`${req.originalUrl} ${(e as Error).message}`, e);
					next(e);
				}
			},
		],
		delete: [
			bodyParser.json({
				reviver: reviver,
			}),
			async (req: express.Request, res: express.Response, next: express.NextFunction) => {
				try {
					if (!req.auth?.payload.sub) {
						res.status(401).send("Unauthorized");
						return;
					}

					const found = await DbFactory.getType(type).findOne({
						where: {
							id: req.params.id,
						},
					});
					if (!found) {
						res.status(404).send([{
							message: "Not Found",
						}]);
						return;
					}

					// validate relations
					if (found.spaceId) {
						const hasSpaceRoles = await AuthorizationHelper.hasSpaceRoles(["admin", "maintainer", "developer"], req.auth?.payload.sub, found.spaceId);
						if (!hasSpaceRoles) {
							res.status(404).send([{
								message: "Not Found",
							}]);
							return;
						}
					} else {
						const hasOrgRoles = await AuthorizationHelper.hasOrgRoles(["admin", "maintainer", "developer"], req.auth?.payload.sub, found.orgId);
						if (!hasOrgRoles) {
							res.status(404).send([{
								message: "Not Found",
							}]);
							return;
						}
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

/**
 * This function validates that the variables in the request match the variables schema.
 * If the variables do not match the schema, the request is rejected.
 */
export const validateVariablesSchema: RequestHandler = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction
) => {
	try {
		const body = req.body as BaseConfig;
		const errors = VariablesSchema.validateBaseObject(body);
		if (errors && errors.length > 0) {
			Logger.getInstance("credential-api").error(
				`validateVariablesSchema() validation errors: ${JSON.stringify(errors, null, 2)}`
			);
			res.status(400).send(JSON.stringify(errors, null, 2));
			return;
		}
	} catch (e) {
		Logger.getInstance("credential-api").error(
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
