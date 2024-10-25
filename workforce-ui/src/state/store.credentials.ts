import { WorkforceAPIClient } from "workforce-api-client";
import { CredentialConfig } from "workforce-core/model";
import { temporal } from "zundo";
import { create, StateCreator } from "zustand";

export type CredentialState = {
    message: string | undefined;
    error: string | undefined;
    credentials: CredentialConfig[];
    addCredential: (credential: CredentialConfig) => void;
    removeCredential: (credential: CredentialConfig) => void;
    updateCredential: (credential: CredentialConfig) => void;
    hydrate: (orgId: string) => void;
    getDetails: (credential: CredentialConfig) => Promise<CredentialConfig | undefined>;
};

export const credentialStore = create<CredentialState>()(
    temporal((set) => ({
        message: undefined,
        error: undefined,
        credentials: [],
        addCredential: (credential: CredentialConfig) => {
            WorkforceAPIClient.CredentialAPI
                .create(credential, {orgId: credential.orgId})
                .then((c) => {
                    if (!Array.isArray(c)) {
                        set((state) => ({
                            message: `Credential ${c.name} created`,
                            credentials: [...state.credentials, credential],
                        }));
                    } else {
                        set((state) => ({
                            error: `Error creating credential ${credential.name}: ${JSON.stringify(c)}`,
                        }));
                    }
                }).catch((e) => {
                    console.error(e);
                    set((state) => ({
                        error: `Error creating credential ${credential.name}: ${e}`,
                    }));
                });
        },
        removeCredential: (credential: CredentialConfig) => {
            WorkforceAPIClient.CredentialAPI
                .delete(credential.id, {orgId: credential.orgId})
                .then((c) => {
                    if (!Array.isArray(c)) {
                        set((state) => ({
                            credentials: state.credentials.filter((c) => c.id !== credential.id),
                        }));
                    } else {
                        set((state) => ({
                            error: `Error deleting credential ${credential.name}: ${JSON.stringify(c)}`,
                        }));
                    }
                }).catch((e) => {
                    console.error(e);
                    set((state) => ({
                        error: `Error deleting credential ${credential.name}: ${e}`,
                    }));
                });
        },
        updateCredential: (credential: CredentialConfig) => {
            WorkforceAPIClient.CredentialAPI
                .update(credential, credential.id, {orgId: credential.orgId})
                .then((c) => {
                    if (!Array.isArray(c)) {
                        set((state) => ({
                            message: `Credential ${c.name} updated`,
                            credentials: state.credentials.map((c) => {
                                if (c.id === credential.id) {
                                    return credential;
                                }
                                return c;
                            }),
                        }));
                    } else {
                        set((state) => ({
                            error: `Error updating credential ${credential.name}: ${JSON.stringify(c)}`,
                        }));
                    }
                }).catch((e) => {
                    console.error(e);
                    set((state) => ({
                        error: `Error updating credential ${credential.name}: ${e}`,
                    }));
                });
        },
        hydrate: (orgId: string) => {
            WorkforceAPIClient.CredentialAPI
            .list({
                orgId,
            }).then((c) => {
                if (Array.isArray(c)) {
                    set((state) => ({
                        credentials: c,
                    }));
                } else {
                    set((state) => ({
                        error: `Error hydrating credentials: ${JSON.stringify(c)}`,
                    }));
                }
            }).catch((e) => {
                console.error(e);
                set((state) => ({
                    error: `Error hydrating credentials: ${e}`,
                }));
            });
        },
        getDetails: (credential: CredentialConfig) => {
            return WorkforceAPIClient.CredentialAPI.get(credential.id, {orgId: credential.orgId});
        },
    })) as StateCreator<CredentialState, [], [never, unknown][]>
);
