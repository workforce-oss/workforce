export const workforceComponentTypes = [
    "workforce-engine",
    "workforce-rest-api",
    "workforce-async-api",
    "workforce-secrets-api",
    "all"
] as const;

export type WorkforceComponent = typeof workforceComponentTypes[number];