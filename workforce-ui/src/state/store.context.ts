import { create } from "zustand";

export type ContextState = {
    currentOrg?: OrgData | undefined;
    orgs: OrgData[];
    addOrgs: (orgs: OrgData[]) => void;
    selectOrg: (orgId: string) => void;
    removeOrg: (orgId: string) => void;
}

export type OrgData = {
    id: string;
    name: string;
    description: string;
    roles: string[];
}

export const contextStore = create<ContextState>((set, get) => ({
    currentOrg: undefined,
    orgs: [],
    addOrgs: (orgs: OrgData[]) => {
        if (!get().currentOrg) {
            set((state) => ({
                currentOrg: orgs[0],
                orgs: orgs,
            }));
        } else {
            set((state) => ({
                orgs: orgs,
            }));
        }
    },
    selectOrg: (orgId: string) => set((state) => ({
        currentOrg: state.orgs.find((org) => org.id === orgId),
    })),
    removeOrg: (orgId: string) => set((state) => ({
        currentOrg: state.currentOrg?.id === orgId ? undefined : state.currentOrg,
        orgs: state.orgs.filter((org) => org.id !== orgId),
    })),
}));