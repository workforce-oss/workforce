export interface AuthData {
    header?: string
    headerValue?: string
    cert?: string
    key?: string
    ca?: string
    authType?: string
    authorizationUrl?: string
    tokenUrl?: string
    state?: string
    scope?: string
    expiresIn?: number
    issuedAt?: number
    refreshToken?: string
}
