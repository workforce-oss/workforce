import { BaseConfig } from "../base/model.js";

export interface TicketUpdateRequest {
    trackerId: string;
    ticketId: string;
    ticketUpdateId: string;
    data: TicketData;
}

export interface TicketEvent {
    trackerId: string;
    ticketId: string;
    ticketEventId: string;
    data: TicketData;
}

export interface TicketRequest {
    id: string;
    type: string;
    trackerId: string;
    status: TicketRequestStatus;
    timestamp: number;
    data?: TicketData;
}

export interface Ticket {
    id: string;
    trackerId: string;
    ticketId: string;
    status: TicketStatus;
    data: TicketData;
}

export type TicketRequestStatus = 'started' | 'complete' | 'error';

export type TicketStatus = 'open' | 'ready' | 'in-progress' | 'completed' | 'closed' | 'failed' | 'archived' | 'deleted' | 'unknown';

export interface TicketData {
    name: string;
    status: TicketStatus;
    url?: string;
    description?: string;
    priority?: string;
    assignee?: string;
    reporter?: string;
    labels?: string[];
    attachments?: string[];
    comments?: string[];
    dueDate?: string;
    startDate?: string;
    endDate?: string;
    estimatedTime?: string;
    loggedTime?: string;
    remainingTime?: string;
    watchers?: string[];
    links?: string[];
    customFields?: Record<string, unknown>;
}

export interface TicketCreateRequest {
    trackerId: string;
    requestId: string;
    input: TicketData;
}

export type TrackerType = typeof trackerTypes[number];

export const trackerTypes = [
    "mock-tracker",
    "github-board-tracker",
    "trello-tracker"
] as const

export interface TrackerConfig extends BaseConfig {
    type: TrackerType;
    webhooksEnabled?: boolean;
    pollingInterval?: number;
}