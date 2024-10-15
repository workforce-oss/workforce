import { createHmac } from "crypto";
import { TrelloApiClient } from "./trello_api_client.js";
import { Card, TrelloWebhook } from "./trello_model.js";
import { WebhookEvent } from "../../manager/webhook_route_manager.js";
import { Logger } from "../../logging/logger.js";

export class TrelloService {
    apiClient: TrelloApiClient;
    private secret: string;
    private webhooks: Map<string, TrelloWebhook> = new Map<string, TrelloWebhook>();
    logger: Logger = Logger.getInstance("TrelloService");

    constructor(token: string, key: string, secret: string) {
        this.apiClient = new TrelloApiClient(token, key);
        this.secret = secret;
    }

    verifyTrelloWebhook(event: WebhookEvent, objectId: string): boolean {
        const signature = event.headers["x-trello-webhook"];
        if (!signature) {
            this.logger.error(`No signature found in event ${JSON.stringify(event)}`); // TODO: remove `event
            return false;
        }
        const webhook = this.webhooks.get(objectId);
        if (!webhook) {
            this.logger.error(`No webhook found for object ${objectId}`);
            return false;
        }
        const computedSignature = this.computeTrelloWebhookSignature(webhook, event.body);
        this.logger.debug(`Computed signature ${computedSignature} for webhook ${JSON.stringify(webhook)}`);
        this.logger.debug(`Received signature ${JSON.stringify(signature)} for webhook ${JSON.stringify(webhook)}`);
        return signature === computedSignature;
    }

    async destroy() {
        for (const webhook of this.webhooks.values()) {
            await this.apiClient.deleteWebhook({webhookId: webhook.id});
        }
        this.webhooks.clear();
    }

    computeTrelloWebhookSignature(webhook: TrelloWebhook, body: unknown): string {
        const hmac = createHmac("sha1", this.secret);
        const content = JSON.stringify(body) + webhook.callbackURL;
        hmac.update(content);
        return hmac.digest("base64");
    }

    async addWebhook(boardName: string, callbackUrl: string, objectId: string): Promise<TrelloWebhook> {
        const boardId = await this.getBoardId(boardName);
        if (!boardId) {
            throw new Error(`Board ${boardName} not found`);
        }
        const webhook = await this.apiClient.addWebhook({idModel: boardId, callbackUrl});
        this.webhooks.set(objectId, webhook);
        return webhook;
    }

    async getCard(boardName: string, cardId: string): Promise<Card> {
        const boardId = await this.getBoardId(boardName);
        if (!boardId) {
            throw new Error(`Board ${boardName} not found`);
        }
        return this.apiClient.getCard({cardId});
    }

    async cardHasLabel(boardName: string, labelName: string, card: Card): Promise<boolean> {
        const boardId = await this.getBoardId(boardName);
        if (!boardId) {
            throw new Error(`Board ${boardName} not found`);
        }
        const labelIds = await this.getLabelIds(boardId, [labelName]);
        return card.idLabels.some(labelId => labelIds.includes(labelId));
    }

    async cardInColumn(boardName: string, columnName: string, card: Card): Promise<boolean> {
        const boardId = await this.getBoardId(boardName);
        if (!boardId) {
            throw new Error(`Board ${boardName} not found`);
        }
        const listId = await this.getListId(boardId, columnName);
        return card.idList === listId;
    }


    async createCard(name: string, description: string, boardName: string, column: string, labels: string[]): Promise<Card> {
        const boardId = await this.getBoardId(boardName);
        if (!boardId) {
            throw new Error(`Board ${boardName} not found`);
        }
        const listId = await this.getListId(boardId, column);
        if (!listId) {
            throw new Error(`List ${column} not found on board ${boardId}`);
        }
        const labelIds = await this.getLabelIds(boardId, labels);
        return this.apiClient.createCard({name, desc: description, listId, labels: labelIds}) as Promise<Card>;
    }

    async updateCard(id: string, name: string, description: string, boardName: string, column: string, labels?: string[]): Promise<Card> {
        const boardId = await this.getBoardId(boardName);
        if (!boardId) {
            throw new Error(`Board ${boardName} not found`);
        }

        const listId = await this.getListId(boardId, column);
        if (!listId) {
            throw new Error(`List ${column} not found on board ${boardId}`);            
        }
        const labelIds = [];
        if (labels) {
            labelIds.push(...await this.getLabelIds(boardId, labels));
        }
        return this.apiClient.updateCard({id, name, desc: description, listId, labels: labelIds}) as Promise<Card>;
    }

    private async getCardsForLabel(boardId: string, column: string, label: string): Promise<Card[]> {
        const listId = await this.getListId(boardId, column);
        if (!listId) {
            throw new Error(`List ${column} not found on board ${boardId}`);            
        }
        const labelIds = await this.getLabelIds(boardId, [label]);
        const cards = await this.apiClient.getCards({listId});
        return cards.filter(c => c.idLabels.findIndex((l) => l === labelIds[0]) !== -1);
    }

    private async getListId(boardId: string, column: string): Promise<string | undefined> {
        let list = await this.apiClient.getLists({boardId});
        let foundList = list.find(l => l.name === column);
        let listId = foundList?.id;
        if (!listId) {
            await this.apiClient.createList({name: column, boardId});
            list = await this.apiClient.getLists({boardId});
            foundList = list.find(l => l.name === column);
            listId = foundList?.id;
        }
        return listId;
    }

    private async getLabelIds(boardId: string, labels: string[]): Promise<string[]> {
        let labelIds = (await this.apiClient.getLabels({boardId})).filter(l => labels.includes(l.name)).map(l => l.id);
        if (labelIds.length !== labels.length) {
            // retry one time with cache bypass
            labelIds = (await this.apiClient.getLabels({boardId, bypassCache: true})).filter(l => labels.includes(l.name)).map(l => l.id);
        }
        
        if (labelIds.length !== labels.length) {
            for (const label of labels) {
                if (!labelIds.includes(label)) {
                    await this.apiClient.createLabel({name: label, color: "green", boardId});
                }
            }
            labelIds = (await this.apiClient.getLabels({boardId})).filter(l => labels.includes(l.name)).map(l => l.id);
        }
        return labelIds;
    }

    private async getBoardId(boardName: string): Promise<string | undefined> {
        const boards = await this.apiClient.listBoards();
        const board = boards.find(b => b.name === boardName);
        return board?.id;
    }
}