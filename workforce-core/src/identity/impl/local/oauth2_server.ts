import bodyParser from "body-parser";
import { createHash, createSecretKey } from "crypto";
import express, { RequestHandler } from "express";
import { JWK, KeyLike, SignJWT, exportJWK, generateKeyPair, importJWK } from "jose";
import { AsyncMap } from "../../../manager/impl/cache/async_map.js";
import bcrypt from "bcryptjs";
import { UserDb } from "../../db.user.js";
import { LocalIdentityDb } from "./db.js";
import { Logger } from "../../../logging/logger.js";
import { Configuration } from "../../../config/configuration.js";
import { OAuthKeysDb } from "./db.oauth_keys.js";
import { jsonParse } from "../../../util/json.js";

export class OAuth2Server {
    publicKey?: KeyLike;
    privateKey?: KeyLike;

    dataCache: AsyncMap<Record<string, string>>;

    logger: Logger = Logger.getInstance("OAuth2Server");

    constructor(dataCache: AsyncMap<Record<string, string>>) {
        this.dataCache = dataCache
    }

    generateAuthorizationCode = () => {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    getKeys = async () => {
        if (!this.publicKey || !this.privateKey) {
            const keys = await OAuthKeysDb.findOne();
            if (keys) {
                const publicJwk = jsonParse<JWK>(keys.publicKey);
                if (publicJwk) {
                    this.publicKey = await importJWK(publicJwk, 'RS256') as KeyLike;
                } else {
                    this.logger.error(`Error parsing public key: ${keys.publicKey}`);
                }

                const privateJwk = jsonParse<JWK>(keys.privateKey);
                if (privateJwk) {
                    this.privateKey = await importJWK(privateJwk, 'RS256') as KeyLike;
                } else {
                    this.logger.error(`Error parsing private key: ${keys.privateKey}`);
                }
            } else {


                const { publicKey: pub, privateKey: priv } = await generateKeyPair('RS256');
                this.publicKey = pub;
                this.privateKey = priv;
                if (pub && priv) {
                    OAuthKeysDb.create({
                        publicKey: JSON.stringify(await exportJWK(pub)),
                        privateKey: JSON.stringify(await exportJWK(priv)),
                    }).catch((e) => {
                        this.logger.error(`Error saving keys: ${e}`);
                    });
                } else {
                    this.logger.error(`Error generating keys`);
                }
            }
        }
        return { publicKey: this.publicKey, privateKey: this.privateKey };
    };

    createJwt = async (args: {
        payload: Record<string, unknown>,
        issuer: string,
        subject: string,
        audience: string,
        secret?: string,
    }): Promise<string> => {
        const { privateKey } = await this.getKeys();

        const { payload, issuer, subject, audience, secret } = args;

        const iat = (Date.now() / 1000) | 0;
        const exp = iat + 60 * 60 * 24;

        const secretKey = secret && createSecretKey(Buffer.from(secret));

        let signingKey: KeyLike | undefined = undefined;
        if (secretKey) {
            signingKey = secretKey;
        } else if (privateKey) {
            signingKey = privateKey;
        } else {
            this.logger.error(`createJwt() Error getting signing key`);
            throw new Error('Error getting signing key');
        }

        return new SignJWT(payload)
            .setProtectedHeader({
                alg: secretKey ? 'HS256' : 'RS256',
                typ: 'JWT',
                kid: "kid"
            })
            .setIssuer(issuer)
            .setSubject(subject)
            .setAudience(audience)
            .setIssuedAt(iat)
            .setExpirationTime(exp)
            .sign(signingKey);
    }


    validateRedirectUri = (req: express.Request, redirect_uri: string) => {
        return redirect_uri.startsWith(`${req.protocol}//${req.hostname}/`) || redirect_uri.startsWith(`${req.protocol}//${req.hostname}:`) || redirect_uri === `${req.protocol}//${req.hostname}` || redirect_uri.startsWith(`http://localhost`) || redirect_uri.startsWith(`vscode://`);
    }

    validateParams = ({ client_id, redirect_uri, response_type, scope, }: { client_id: string, redirect_uri: string, response_type: string, scope: string, state: string, code_challenge: string, code_challenge_method: string }) => {
        if (response_type !== 'code') {
            console.log(`response_type ${response_type} is not code`);
            return false;
        }

        if (!client_id) {
            console.log('client_id is missing');
            return false;
        }

        if (!redirect_uri) {
            console.log('redirect_uri is missing');
            return false;
        }

        if (!scope) {
            console.log('scope is missing');
            return false;
        }

        return true;
    }

    validateCodeVerifier = (codeVerifier: string, codeChallenge: string, codeChallengeMethod: string) => {
        if (codeChallengeMethod === 'plain') {
            return codeVerifier === codeChallenge;
        }

        if (codeChallengeMethod === 'S256') {
            const hash = createHash('sha256');
            hash.update(codeVerifier);
            const hashed = hash.digest('base64');
            const base64url = this.base64url(hashed);
            this.logger.debug(`codeVerifier: ${codeVerifier} codeChallenge: ${codeChallenge} hashed: ${base64url}`);
            return base64url === codeChallenge;
        }

        return false;
    }

    base64url = (base64: string) => base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    createIssuerUri = (req: express.Request) => {
        let host = req.headers.host;
        if (!host) {
            host = req.headers.Host as string;
        }
        return `${req.protocol}://${host}${req.baseUrl}`;
    }

    bcryptHash = async (data: string) => {
        return bcrypt.hash(data, 12);
    }

    bcryptCompare = async (data: string, hash: string) => {
        return bcrypt.compare(data, hash);
    }

    expressHandlers: Record<string, RequestHandler[]> = {
        config: [
            async (req: express.Request, res: express.Response) => {
                try {
                    const { publicKey } = await this.getKeys();
                    if (!publicKey) {
                        res.status(500).send({ error: 'internal_server_error' });
                        return;
                    }
                    const publicJwk = await exportJWK(publicKey);
                    res.status(200).send({ keys: [{ kid: 'kid', ...publicJwk }] });
                } catch (e) {
                    this.logger.error(`Error getting keys`, e);
                    res.status(500).send({ error: 'internal_server_error' });
                }
            }
        ],
        authorize: [
            bodyParser.urlencoded({ extended: true }),
            async (req: express.Request, res: express.Response) => {
                let client_id = '';
                let redirect_uri = '';
                let response_type = '';
                let scope = '';
                let state = '';
                let code_challenge = '';
                let code_challenge_method = '';


                if (req.method === 'POST') {
                    const reqBody = req.body as Record<string, unknown>;

                    client_id = reqBody.client_id as string;
                    redirect_uri = reqBody.redirect_uri as string;
                    response_type = reqBody.response_type as string;
                    scope = reqBody.scope as string;
                    state = reqBody.state as string;
                    code_challenge = reqBody.code_challenge as string;
                    code_challenge_method = reqBody.code_challenge_method as string;
                } else if (req.method === 'GET') {
                    client_id = req.query.client_id as string;
                    redirect_uri = req.query.redirect_uri as string;
                    response_type = req.query.response_type as string;
                    scope = req.query.scope as string;
                    state = req.query.state as string;
                    code_challenge = req.query.code_challenge as string;
                    code_challenge_method = req.query.code_challenge_method as string;
                } else {
                    console.log(`authorize: ${req.method} request method not supported`);
                    res.status(400).send({ error: 'invalid_request' });
                    return;
                }

                if (!this.validateParams({ client_id, redirect_uri, response_type, scope, state, code_challenge, code_challenge_method })) {
                    res.status(400).send({ error: 'invalid_params' });
                    return;
                }

                if (!this.validateRedirectUri(req, redirect_uri)) {
                    res.status(400).send({ error: 'invalid_redirect_uri' });
                    return;
                }


                await this.dataCache.set(state, {
                    client_id,
                    redirect_uri,
                    scope,
                    code_challenge,
                    code_challenge_method,
                });

                this.logger.debug(`set data for state ${state}: ${JSON.stringify({ client_id, redirect_uri, scope, code_challenge, code_challenge_method })}`);

                res.status(302).redirect(`${Configuration.LocalAuthLoginUrl}?state=${state}&redirect_uri=${redirect_uri}`);
            }
        ],
        login: [
            bodyParser.urlencoded({ extended: true }),
            async (req: express.Request, res: express.Response) => {
                const { username, password, state } = req.body as Record<string, string>;

                const identity = await LocalIdentityDb.findOne({ where: { username } }).catch((e) => {
                    this.logger.error(`Error getting local identity: ${e}`);
                    return undefined;
                });
                if (!identity) {
                    this.logger.debug(`Identity not found: ${username}`);
                    res.status(400).send({ error: 'invalid_request' });
                    return;
                }

                const user = await UserDb.findOne({ where: { id: identity.id } }).catch((e) => {
                    this.logger.error(`Error getting user: ${e}`);
                    return undefined;
                });

                if (!user) {
                    this.logger.debug(`User not found: ${identity.username}`);
                    res.status(400).send({ error: 'invalid_request' });
                    return;
                }

                const passwordValid = await this.bcryptCompare(password, identity.passwordHash);

                if (!passwordValid) {
                    this.logger.debug(`Password invalid: ${username}`);
                    res.status(400).send({ error: 'invalid_request' });
                    return;
                }

                const code = this.generateAuthorizationCode();
                const currentState = await this.dataCache.get(state);
                if (!currentState) {
                    this.logger.debug(`State not found: ${state}`);
                    res.status(400).send({ error: 'invalid_request' });
                    return;
                }
                await this.dataCache.set(code, {
                    ...currentState,
                    userId: user.id,
                    code

                });
                this.logger.debug(`set data for state ${state}: ${JSON.stringify({ ...currentState, userId: user.id, code })}`);

                const queryChar = currentState.redirect_uri.includes('?') ? '&' : '?';
                res.status(302).redirect(`${currentState.redirect_uri}${queryChar}code=${code}&state=${state}`);
            }
        ],
        discovery: [
            (req: express.Request, res: express.Response) => {
                const issuer = this.createIssuerUri(req);
                res.status(200).send({
                    issuer,
                    jwks_uri: `${issuer}/.well-known/jwks.json`,
                    id_token_signing_alg_values_supported: ['RS256'],
                    token_endpoint: `${issuer}/token`,
                    authorization_endpoint: `${issuer}/authorize`,
                });
            }
        ],
        token: [
            bodyParser.urlencoded({ extended: true }),
            async (req: express.Request, res: express.Response) => {
                const { code, client_id, code_verifier, grant_type, state, client_secret } = req.body as Record<string, string>;

                let jwt: string | undefined = undefined;

                const issuer = this.createIssuerUri(req);

                if (grant_type === "authorization_code") {
                    this.logger.debug(`Getting data for code ${code}`);
                    const data = await this.dataCache.get(code);
                    this.logger.debug(`Data: ${JSON.stringify(data)}`);
                    await this.dataCache.delete(state);

                    if (!data || data.code !== code) {
                        this.logger.debug(`Code mismatch: ${code} ${data?.code}`);
                        res.status(400).send({ error: 'invalid_request' });
                        return;
                    }

                    if (data.client_id !== client_id) {
                        this.logger.debug(`Client ID mismatch: ${client_id}`);
                        res.status(400).send({ error: 'invalid_request' });
                        return;
                    }

                    if (!this.validateCodeVerifier(code_verifier, data.code_challenge, data.code_challenge_method)) {
                        this.logger.debug(`Code verifier mismatch: ${code_verifier} ${data.code_challenge}`);
                        res.status(400).send({ error: 'invalid_request' });
                        return;
                    }

                    await this.dataCache.delete(code);
                    jwt = await this.createJwt({
                        issuer,
                        payload: {
                            scope: "openId"
                        },
                        subject: data.userId,
                        audience: Configuration.OAuth2Audience,
                    });
                } else if (grant_type === "client_credentials") {
                    if (!client_id || !client_secret) {
                        res.status(400).send({ error: 'invalid_request' });
                        return;
                    }

                    const identity = await LocalIdentityDb.findOne({ where: { username: client_id } }).catch((e) => {
                        this.logger.error(`Error getting local identity: ${e}`);
                        return undefined;
                    });

                    if (!identity) {
                        res.status(400).send({ error: 'invalid_request' });
                        return;
                    }

                    const passwordValid = await this.bcryptCompare(client_secret, identity.passwordHash);

                    if (!passwordValid) {
                        res.status(400).send({ error: 'invalid_request' });
                        return;
                    }

                    jwt = await this.createJwt({
                        issuer,
                        payload: {
                            client_id,
                            scope: "openId"
                        },
                        subject: client_id,
                        audience: Configuration.OAuth2Audience,
                    });

                } else {
                    res.status(400).send({ error: 'invalid_request' });
                    return;
                }
                console.log(JSON.stringify(jwt));
                res.status(200).send({
                    access_token: jwt,
                    id_token: jwt,
                    token_type: 'Bearer',
                    expires_in: 36000,
                });
            }
        ]
    }
}