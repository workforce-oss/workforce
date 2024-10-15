import bodyParser from 'body-parser';
import { Buffer } from 'buffer';
import { createSecretKey } from 'crypto';
import express, { RequestHandler} from 'express';
import { SignJWT, generateKeyPair, exportJWK, KeyLike } from 'jose';
import { rest } from 'msw';
import nock from 'nock';
import sinon from 'sinon';

export const now = (Date.now() / 1000) | 0;
const day = 60 * 60 * 24;

interface CreateJWTOptions {
    payload?: { [key: string]: any };
    issuer?: string;
    subject?: string;
    audience?: string;
    jwksUri?: string;
    discoveryUri?: string;
    kid?: string;
    iat?: number;
    exp?: number;
    jwksSpy?: sinon.SinonSpy;
    discoverSpy?: sinon.SinonSpy;
    delay?: number;
    secret?: string;
}

let publicKey: KeyLike;
let privateKey: KeyLike;
const getKeys = async () => {
    if (!publicKey || !privateKey) {
        const { publicKey: pub, privateKey: priv } = await generateKeyPair('RS256');
        publicKey = pub;
        privateKey = priv;
    }
    return { publicKey, privateKey };
};

export const createJwt = async ({
    payload = {},
    issuer = 'https://localhost:3100/',
    subject = 'me',
    audience = 'https://api/',
    jwksUri = '/.well-known/jwks.json',
    discoveryUri = '/.well-known/openid-configuration',
    iat = now,
    exp = now + day,
    kid = 'kid',
    jwksSpy = sinon.spy(),
    discoverSpy = sinon.spy(),
    secret,
}: CreateJWTOptions = {}): Promise<string> => {
    const { publicKey, privateKey } = await getKeys();
    const publicJwk = await exportJWK(publicKey);
    nock(issuer)
        .persist()
        .get(jwksUri)
        .reply(200, (...args) => {
            jwksSpy(...args);
            return { keys: [{ kid, ...publicJwk }] };
        })
        .get(discoveryUri)
        .reply(200, (...args) => {
            discoverSpy(...args);
            return {
                issuer,
                jwks_uri: (issuer + jwksUri).replace('//.well-known', '/.well-known'),
            };
        });

    const secretKey = secret && createSecretKey(Buffer.from(secret));

    return new SignJWT(payload)
        .setProtectedHeader({
            alg: secretKey ? 'HS256' : 'RS256',
            typ: 'JWT',
            kid,
        })
        .setIssuer(issuer)
        .setSubject(subject)
        .setAudience(audience)
        .setIssuedAt(iat)
        .setExpirationTime(exp)
        .sign(secretKey || privateKey);
};

export const issuerHandlers = [
    rest.get(`https://localhost:3100/.well-known/jwks.json`, async (req, res, ctx) => {
        const { publicKey, privateKey } = await getKeys();
        const publicJwk = await exportJWK(publicKey);
        return res(ctx.status(200) ,ctx.json({ keys: [{ kid: 'kid', ...publicJwk }] }));
    }),
    rest.get(`https://localhost:3100/.well-known/openid-configuration`, (req, res, ctx) => {
        return res(ctx.json({
            issuer: 'https://localhost:3100/',
            jwks_uri: `https://localhost:3100/.well-known/jwks.json`,
            id_token_signing_alg_values_supported: ['RS256'],
        }));
    }),
    rest.post(`https://localhost:3100/token`, (req, res, ctx) => {
        return res(ctx.json(createJwt()));
    }),
]

export const expressIssueHandlers: Record<string, RequestHandler[]> = {
    config: [
        bodyParser.json(),
        async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            const { publicKey, privateKey } = await getKeys();
            const publicJwk = await exportJWK(publicKey);            
            res.status(200).send({ keys: [{ kid: 'kid', ...publicJwk }] });
        }
    ],
    discovery: [
        bodyParser.json(),
        async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.status(200).send({
                issuer: 'http://localhost:3000',
                jwks_uri: `http://localhost:3000/.well-known/jwks.json`,
                id_token_signing_alg_values_supported: ['RS256'],
                token_endpoint: 'http://localhost:3000/token',
            });
        }
    ],
    token: [
        bodyParser.json(),
        async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            const jwt = await createJwt({issuer: 'http://localhost:3000', payload: {client_id: 'workforce-engine'}});
            res.status(200).send({
                access_token: jwt,
                token_type: 'Bearer',
                expires_in: 3600,
            });
        }
    ]
}