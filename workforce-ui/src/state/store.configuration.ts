import { AuthSession } from "workforce-ui-core";
import { create } from "zustand";

export type ConfigurationState = {
    auth: {
        session: AuthSession | undefined;
        userId: string;
    };
    config: {
        apiBaseUrl: string;
        authIssuerUri: string;
        clientId: string;
        apiBasePath: string;
    };

    setAuth: (auth: {
        session: AuthSession | undefined;
        userId: string;
    }) => void;
    setConfig: (config: {
        apiBasePath: string;
        apiBaseUrl: string;
        authIssuerUri: string;
        clientId: string;
    }) => void;
};


export const configurationStore = create<ConfigurationState>((set) => ({
    auth: {
        session: undefined,
        userId: "",
    },
    config: window.location.origin === "http://localhost:8084" ? {
        apiBasePath: "/workforce-api",
        apiBaseUrl: "http://localhost:8084",
        authIssuerUri: "http://localhost:8084/insecure",
        clientId: "workforce-ui",
    } : {
        apiBasePath: "/workforce-api",
        apiBaseUrl: window.location.origin,
        authIssuerUri: window.location.origin + "/auth/realms/workforce",
        clientId: "workforce-ui",
    },
    setAuth: (auth) => {
        set((state) => ({
            auth: auth,
        }));
    },
    setConfig: (config) => {
        set((state) => ({
            config
        }));
    }
}));
