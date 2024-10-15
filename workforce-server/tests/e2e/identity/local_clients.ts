import { Configuration, LocalIdentityDb } from "workforce-core";
import bcrypt from "bcryptjs";

export async function ensureLocalClient(): Promise<boolean> {
    if (!Configuration.EnableLocalAuth) {
        return true;
    }

    const localOauth2ClientIdenity = await LocalIdentityDb.findOne({
        where: {
            username: Configuration.OAuth2ClientId
        }
    }).catch((err) => {
        console.error(`Error getting local identity: ${err}`);
        return null;
    });

    if (!localOauth2ClientIdenity) {
        const passwordHash = await bcrypt.hash(Configuration.OAuth2ClientSecret, 12);
        const result = await LocalIdentityDb.create({
            username: Configuration.OAuth2ClientId,
            passwordHash 
        }).catch((err) => {
            console.error(`Error creating local identity: ${err}`);
            return false;
        });
        if (!result) {
            return false;
        }
    }

    return true;
}