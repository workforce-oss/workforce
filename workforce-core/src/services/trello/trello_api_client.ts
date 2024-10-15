import { Logger } from "../../logging/logger.js";
import { Card, Label, List, TrelloBoard, TrelloWebhook } from "./trello_model.js";

export class TrelloApiClient {
    token: string;
    key: string;
    baseUrl = "https://api.trello.com/1";
    logger: Logger = Logger.getInstance("TrelloApiClient");

    static listCache: Map<string, List[]> = new Map<string, List[]>();
    static labelCache: Map<string, Label[]> = new Map<string, Label[]>();
    static boardCache?: TrelloBoard[];

    constructor(token: string, key: string) {
        this.token = token;
        this.key = key;
    }


    async listBoards(args?: {bypassCache?: boolean}): Promise<TrelloBoard[]> {
        const { bypassCache } = args ?? {};
        if (!bypassCache && TrelloApiClient.boardCache) {
            return Promise.resolve(TrelloApiClient.boardCache);
        }

        const boards = await this.doRequest({method: "GET", path: "/members/me/boards", queryParams: {}}).catch((e: Error) => {
            this.logger.error(`Error getting boards: ${e}`);
            return [];
        }) as TrelloBoard[];
        TrelloApiClient.boardCache = boards;
        return boards;
    }

    createLabel(args: {name: string, color: string, boardId: string, bypassCache?: boolean}): Promise<unknown> {
        const { name, color, boardId } = args;
        return this.doRequest({method: "POST", path: `/boards/${boardId}/labels`, queryParams: { name, color }});
    }

    async getLabels(args: {boardId: string, bypassCache?: boolean}): Promise<Label[]> {
        const { boardId, bypassCache } = args;
        if (!bypassCache && TrelloApiClient.labelCache.has(boardId)) {
            return Promise.resolve(TrelloApiClient.labelCache.get(boardId) ?? []);
        }
        const labels = await this.doRequest({method: "GET", path: `/boards/${boardId}/labels`, queryParams: {}}).catch((e) => {
            console.error(e);
            return [];
        }) as Label[];
        TrelloApiClient.labelCache.set(boardId, labels);
        return labels;
    }

    getCard(args: {cardId: string, bypassCache?: boolean}): Promise<Card> {
        const { cardId } = args;
        return this.doRequest({method: "GET", path: `/cards/${cardId}`, queryParams: {}}) as Promise<Card>;
    }

    createCard(args: {name: string, desc: string, listId: string, labels: string[], bypassCache?: boolean}): Promise<unknown> {
        const { name, desc, listId, labels } = args;
        return this.doRequest({method: "POST", path: `/cards`, queryParams: { name, desc, idList: listId, idLabels: labels.join(',') }});
    }

    updateCard(args: {id: string, name: string, desc: string, listId: string, labels?: string[], bypassCache?: boolean}): Promise<unknown> {
        const { id, name, desc, listId, labels } = args;
        let idLabels = '';
        if (labels) {
            idLabels = labels.join(',');
        }
        return this.doRequest({method: "PUT", path: `/cards/${id}`, queryParams: { name, desc, idList: listId, idLabels: idLabels }});
    }

    createList(args: {name: string, boardId: string, bypassCache?: boolean}): Promise<unknown> {
        const { name, boardId } = args;
        return this.doRequest({method: "POST", path: `/boards/${boardId}/lists`, queryParams: { name }});
    }

    async getLists(args: {boardId: string, bypassCache?: boolean}): Promise<List[]> {
        const { boardId, bypassCache } = args;
        if (!bypassCache && TrelloApiClient.listCache.has(boardId)) {
            return Promise.resolve(TrelloApiClient.listCache.get(boardId) ?? []);
        }
        const lists = await this.doRequest({method: "GET", path: `/boards/${boardId}/lists`, queryParams: {}}).catch((e) => {
            console.error(e);
            return [];
        }) as List[];
        TrelloApiClient.listCache.set(boardId, lists);
        return lists;
    }

    getCards(args: {listId: string, bypassCache?: boolean}): Promise<Card[]> {
        const { listId } = args;
        return this.doRequest({method: "GET", path: `/lists/${listId}/cards`, queryParams: {}}) as Promise<Card[]>;
    }

    addWebhook(args: {callbackUrl: string, idModel: string}): Promise<TrelloWebhook> {
        const { callbackUrl, idModel } = args;
        return this.doRequest({method: "POST", path: `/webhooks`, queryParams: { callbackURL: callbackUrl, idModel: idModel} }) as Promise<TrelloWebhook>;
    }

    deleteWebhook(args: {webhookId: string}): Promise<Record<string, unknown>> {
        const { webhookId } = args;
        return this.doRequest({method: "DELETE", path: `/webhooks/${webhookId}`, queryParams: {}}) as Promise<Record<string, unknown>>;
    }

    async doRequest(args: { method: string, path: string, queryParams: Record<string, unknown>} ): Promise<unknown> {
        const { method, path, queryParams } = args;
        if (!this.token || !this.key) {
            this.logger.error("Token or key not set");
            return Promise.reject(new Error("Token or key not set"));
        }
        this.logger.debug("Requesting " + this.baseUrl + path + `?key=${this.key}&token=${this.token}` + this.objectToQueryString(queryParams));
        const response = await fetch(this.baseUrl + path + `?key=${this.key}&token=${this.token}` + this.objectToQueryString(queryParams), {
            method: method,
        }).catch((e) => {
            console.error(e);
            throw e;
        });
        if (response.ok) {
            const json = await response.json() as unknown;
            this.logger.debug("Response: " + JSON.stringify(json, null, 2));
            return json;
        } else {
            this.logger.error("Response: " + JSON.stringify(response, null, 2));
            throw new Error(response.statusText);
        }

    }

    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, no-prototype-builtins, @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument */
    objectToQueryString(obj: any): string {
        let str = "&";
        for (const key in obj) {
            if (!obj.hasOwnProperty(key)) {
                continue;
            } else if (obj[key] === undefined || obj[key] === null || obj[key] === "") {
                continue;
            }

            if (str != "") {
                str += "&";
            }
            str += key + "=" + encodeURIComponent(obj[key]);
        }
        if (str.endsWith("&")) {
            str = str.substring(0, str.length - 1);
        }

        return str;
    }


}