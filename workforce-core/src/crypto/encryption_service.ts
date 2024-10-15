import { constants, generateKeyPair, privateDecrypt, publicEncrypt } from "crypto";
import { promises as fs } from "fs";
import { WorkforceClient } from "../identity/model.js";
import { Logger } from "../logging/logger.js";

export class EncryptionService {
    private password: string;
    static _instance: EncryptionService;
    private privateKey?: Buffer;
    private clientPublicKeys: Map<WorkforceClient, Buffer>;

    constructor(privateKey: Buffer, password: string, clientPublicKeys: Map<WorkforceClient, Buffer>) {
        this.password = password;
        this.privateKey = privateKey;
        this.clientPublicKeys = clientPublicKeys;
    }

    public static async init(privateKeyPath: string, publicKeyPath: string, password: string, clientKeyPaths: Map<WorkforceClient, string>): Promise<EncryptionService> {
        if (!EncryptionService._instance) {
            await EncryptionService.genKeys(password, privateKeyPath, publicKeyPath);
            const privateKey = await fs.readFile(privateKeyPath).catch((err) => {
                Logger.getInstance("EncryptionService").error(`Error reading private key: ${err}`);
                throw err;
            });

            const clientPublicKeys = new Map<WorkforceClient, Buffer>();
            for (const [client, clientKeyPath] of clientKeyPaths) {
                const clientPublicKey = await fs.readFile(clientKeyPath).catch((err) => {
                    Logger.getInstance("EncryptionService").error(`Error reading client public key for client ${client}: ${err}`);
                    throw err;
                });
                clientPublicKeys.set(client, clientPublicKey);
            }
            EncryptionService._instance = new EncryptionService(privateKey, password, clientPublicKeys);

        }
        return EncryptionService._instance;
    }

    public static getInstance(): EncryptionService {
        if (!EncryptionService._instance) {
            throw new Error("EncryptionService not initialized");
        }
        return EncryptionService._instance;
    }

    // Encrypt using the other party's public key
    encrypt(data: string, client: WorkforceClient): string {
        const clientPublicKey = this.clientPublicKeys.get(client);
        if (!clientPublicKey) {
            throw new Error(`Client public key not found for ${client}`);
        }
        return publicEncrypt({
            key: clientPublicKey,
            padding: constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
        }, Buffer.from(data)).toString("base64");
    }

    // Decrypt using our private key
    decrypt(data: string): string {
        if (!this.privateKey) {
            throw new Error("Private key not found");
        }
        return privateDecrypt({
            key: this.privateKey,
            passphrase: this.password,
            padding: constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
        }, Buffer.from(data, "base64")).toString();
    }


    public static async genKeys(password: string, privateKeyPath: string, publicKeyPath: string): Promise<void> {
        const privateKeyExists = await fs.access(privateKeyPath).then(() => true).catch(() => false);
        const publicKeyExists = await fs.access(publicKeyPath).then(() => true).catch(() => false);

        if (privateKeyExists) {
            Logger.getInstance("EncryptionService").debug(`Private key exists at ${privateKeyPath}`);
        } else {
            Logger.getInstance("EncryptionService").debug(`Private key does not exist at ${privateKeyPath}`);
        }

        if (publicKeyExists) {
            Logger.getInstance("EncryptionService").debug(`Public key exists at ${publicKeyPath}`);
        } else {
            Logger.getInstance("EncryptionService").debug(`Public key does not exist at ${publicKeyPath}`);
        }

        if (privateKeyExists && publicKeyExists) {
            return;
        }

        await new Promise<void>((resolve, reject) => {

            const callback = function (err: Error | null, publicKey: string, privateKey: string) {
                if (err) {
                    reject(err);
                    return;
                }
                fs.writeFile(privateKeyPath, privateKey).then(() => {
                    fs.writeFile(publicKeyPath, publicKey).then(() => {
                        Logger.getInstance("EncryptionService").debug(`Generated public and private keys at ${publicKeyPath} and ${privateKeyPath}`);
                        resolve();
                    }).catch((err) => {
                        Logger.getInstance("EncryptionService").error(`Error writing public key: ${err}`);
                    });
                }).catch((err) => {
                    Logger.getInstance("EncryptionService").error(`Error writing private key: ${err}`);
                });
            };

            generateKeyPair("rsa", {
                modulusLength: 4096,
                publicKeyEncoding: {
                    type: "pkcs1",
                    format: "pem"
                },
                privateKeyEncoding: {
                    type: "pkcs8",
                    format: "pem",
                    cipher: "aes-256-cbc",
                    passphrase: password
                }
            }, callback)
        }).catch((err) => {
            Logger.getInstance("EncryptionService").error(`Error generating keys: ${err}`);
        });
    }
}
