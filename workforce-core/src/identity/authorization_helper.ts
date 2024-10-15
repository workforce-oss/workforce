import { RequestHandler } from "express";
import { OrgUserRelationDb } from "./db.org_user.js";
import { SpaceUserRelationDb } from "./db.space_user.js";
import { Logger } from "../logging/logger.js";

export class AuthorizationHelper {
    static withOrgRole(roles: string[]): RequestHandler {
        return (req, res, next) => {
            const body = req.body as { orgId?: string } || {};
            const query = req.query as { orgId?: string } || {};

            if (!req.auth?.payload.sub) {
                Logger.getInstance("AuthorizationHelper").error("withOrgRole() No sub in payload");
                res.status(401).send("Unauthorized");
                return;
            }

            if (!query.orgId && !body.orgId) {
                Logger.getInstance("AuthorizationHelper").error("withOrgRole() No orgId provided");
                res.status(400).send("Bad Request");
                return;
            }

            if (req.query?.orgId && body.orgId && (query.orgId !== body.orgId)) {
                Logger.getInstance("AuthorizationHelper").error(`WithOrgRole() OrgId mismatch: query: ${query.orgId} body: ${body.orgId}`);
                res.status(400).send("Bad Request");
                return;
            }

            let orgId = query.orgId;
            if (!orgId) {
                orgId = body.orgId;
            }

            if (orgId) {
                this.hasOrgRoles(roles, req.auth.payload.sub, orgId).then((hasRoles) => {
                    if (hasRoles) {
                        next();
                        return;
                    }

                    res.status(404).send("Not Found");
                }).catch(() => {
                    res.status(404).send("Not Found");
                });
            } else {
                res.status(404).send("Not Found");
            }
        }
    }

    static async hasOrgRoles(roles: string[], userId: string, orgId: string): Promise<boolean> {

        const relationships = await OrgUserRelationDb.findAll({
            where: {
                orgId: orgId,
                userId: userId
            }
        }).catch(() => {
            Logger.getInstance("AuthorizationHelper").error("Error fetching org user relationships");
            return [];
        });


        if (relationships.length === 0) {
            return false;
        }

        if (relationships.some(r => roles.includes(r.role))) {
            return true;
        }


        return false;
    }

    static withSpaceRole(roles: string[]): RequestHandler {
        return (req, res, next) => {
            if (!req.auth?.payload.sub) {
                Logger.getInstance("AuthorizationHelper").error("withSpaceRole() No sub in payload");
                res.status(401).send("Unauthorized");
                return;
            }

            const body = req.body as { orgId?: string, spaceId?: string } || {};
            const query = req.query as { orgId?: string, spaceId?: string } || {};

            if (req.query?.orgId && body.orgId && (query.orgId !== body.orgId)) {
                Logger.getInstance("AuthorizationHelper").error(`withSpaceRole() OrgId mismatch: query: ${query.orgId} body: ${body.orgId}`);
                res.status(400).send("Bad Request");
                return;
            }

            if (query.spaceId && body.spaceId && (query.spaceId !== body.spaceId)) {
                Logger.getInstance("AuthorizationHelper").error(`withSpaceRole() SpaceId mismatch: query: ${query.spaceId} body: ${body.spaceId}`);
                res.status(400).send("Bad Request");
                return;
            }

            let orgId = query.orgId;
            if (!orgId) {
                orgId = body.orgId;
            }

            let spaceId = query.spaceId;
            if (!spaceId) {
                spaceId = body.spaceId;
            }

            if (orgId) {
                this.hasOrgRoles(roles, req.auth.payload.sub, orgId).then((hasRoles) => {
                    if (hasRoles) {
                        next();
                        return;
                    }

                    res.status(404).send("Not Found");
                }).catch((e) => {
                    Logger.getInstance("AuthorizationHelper").error("Error checking org roles", e);
                    res.status(404).send("Not Found");
                });
            } else if (spaceId) {
                this.hasSpaceRoles(roles, req.auth.payload.sub, spaceId).then((hasRoles) => {
                    if (hasRoles) {
                        next();
                        return;
                    }

                    res.status(404).send("Not Found");
                }).catch((e) => {
                    Logger.getInstance("AuthorizationHelper").error("Error checking space roles", e);
                    res.status(404).send("Not Found");
                });
            } else {
                res.status(404).send("Not Found");
            }
        };
    }

    static async hasSpaceRoles(roles: string[], userId: string, spaceId: string): Promise<boolean> {
        const relationships = await SpaceUserRelationDb.findAll({
            where: {
                spaceId: spaceId,
                userId: userId
            }
        }).catch(() => {
            Logger.getInstance("AuthorizationHelper").error("Error fetching space user relationships");
            return [];
        });

        if (relationships.length === 0) {
            return false;
        }

        if (relationships.some(r => roles.includes(r.role))) {
            return true;
        }

        return false;
    }
}