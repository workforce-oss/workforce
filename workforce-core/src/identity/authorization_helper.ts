import { RequestHandler } from "express";
import { OrgUserRelationDb } from "./db.org_user.js";
import { SpaceUserRelationDb } from "./db.space_user.js";
import { Logger } from "../logging/logger.js";

export class AuthorizationHelper {
    static withOrgRole(roles: string[]): RequestHandler {
        return (req, res, next) => {
            if (!req.auth?.payload.sub) {
                Logger.getInstance("AuthorizationHelper").error("withOrgRole() No sub in payload");
                res.status(401).send("Unauthorized");
                return;
            }

            const orgId = req.params.orgId;

            if (!orgId) {
                Logger.getInstance("AuthorizationHelper").error("withOrgRole() No orgId provided");
                res.status(400).send("Bad Request");
                return;
            }

            if (orgId) {
                this.hasOrgRoles(roles, req.auth.payload.sub, orgId).then((hasRoles) => {
                    if (hasRoles) {
                        next();
                        return;
                    }

                    Logger.getInstance("AuthorizationHelper").debug("withOrgRole() User does not have required roles");
                    res.status(404).send("Not Found");
                }).catch(() => {
                    Logger.getInstance("AuthorizationHelper").error("Error checking org roles");
                    res.status(404).send("Not Found");
                });
            } else {
                Logger.getInstance("AuthorizationHelper").error("withOrgRole() No orgId provided");
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
            Logger.getInstance("AuthorizationHelper").debug("hasOrgRoles() User has required roles");
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

            const params = req.params as { orgId?: string, spaceId?: string } || {};
            const orgId = params.orgId;
            const spaceId = params.spaceId;

            if (orgId && !spaceId) {
                this.hasOrgRoles(roles, req.auth.payload.sub, orgId).then((hasRoles) => {
                    if (hasRoles) {
                        next();
                        return;
                    }
                    Logger.getInstance("AuthorizationHelper").debug("withSpaceRole() User does not have org roles");
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
                    Logger.getInstance("AuthorizationHelper").debug("withSpaceRole() User does not have required roles");
                    res.status(404).send("Not Found");
                }).catch((e) => {
                    Logger.getInstance("AuthorizationHelper").error("Error checking space roles", e);
                    res.status(404).send("Not Found");
                });
            } else {
                Logger.getInstance("AuthorizationHelper").error("withSpaceRole() No orgId or spaceId provided");
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