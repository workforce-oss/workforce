export type ProspectStatus = "new" | "reviewed" | "invited" | "active";

export interface Prospect {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    status: ProspectStatus;
    role?: string;
    company?: string;
    customerNotes?: string;
    internalNotes?: string;
}