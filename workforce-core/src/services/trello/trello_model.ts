export interface Card {
    id: string;
    name: string;
    desc: string;
    url: string;
    closed: boolean;
    idList: string;
    idLabels: string[];
}

export interface Label {
    id: string;
    name: string;
    color: string;
}

export interface List {
    id: string;
    name: string;
    closed: boolean;
    idBoard: string;
}

export interface TrelloWebhook {
    id: string;
    description: string;
    idModel: string;
    callbackURL: string;
    active: boolean;
    consecutiveFailures: number;
    firstConsecutiveFailDate: string;
}

export interface TrelloBoard {
    id: string;
    name: string;
}

export interface TrelloEvent {
    action: {
        id: string;
        idMemberCreator: string;
        data: Record<string, unknown> & {
            card?: Card;
            list?: List;
            board?: TrelloBoard;
            labels?: Label[];
        };
        type: TrelloActionType;
    }
}

export type TrelloActionType = typeof trelloActionTypes[number];

export const trelloActionTypes = [
    // "Included" actions
    "acceptEnterpriseJoinRequest",
    "addAttachmentToCard",
    "addChecklistToCard",
    "addMemberToBoard",
    "addMemberToCard",
    "addMemberToOrganization",
    "addOrganizationToEnterprise",
    "addToEnterprisePluginWhitelist",
    "addToOrganizationBoard",
    "commentCard",
    "convertToCardFromCheckItem",
    "copyBoard",
    "copyCard",
    "copyCommentCard",
    "createBoard",
    "createCard",
    "createList",
    "createOrganization",
    "deleteBoardInvitation",
    "deleteCard",
    "deleteOrganizationInvitation",
    "disableEnterprisePluginWhitelist",
    "disablePlugin",
    "disablePowerUp",
    "emailCard",
    "enableEnterprisePluginWhitelist",
    "enablePlugin",
    "enablePowerUp",
    "makeAdminOfBoard",
    "makeNormalMemberOfBoard",
    "makeNormalMemberOfOrganization",
    "makeObserverOfBoard",
    "memberJoinedTrello",
    "moveCardFromBoard",
    "moveCardToBoard",
    "moveListFromBoard",
    "moveListToBoard",
    "removeChecklistFromCard",
    "removeFromEnterprisePluginWhitelist",
    "removeFromOrganizationBoard",
    "removeMemberFromCard",
    "removeOrganizationFromEnterprise",
    "unconfirmedBoardInvitation",
    "unconfirmedOrganizationInvitation",
    "updateBoard",
    "updateCard",
    "updateCheckItemStateOnCard",
    "updateChecklist",
    "updateList",
    "updateMember",
    "updateOrganization",

    // "Excluded" actions
    "addAdminToBoard",
    "addAdminToOrganization",
    "addLabelToCard",
    "copyChecklist",
    "createBoardInvitation",
    "createBoardPreference",
    "createCheckItem",
    "createLabel",
    "createOrganizationInvitation",
    "deleteAttachmentFromCard",
    "deleteCheckItem",
    "deleteComment",
    "deleteLabel",
    "makeAdminOfOrganization",
    "removeAdminFromBoard",
    "removeAdminFromOrganization",
    "removeLabelFromCard",
    "removeMemberFromBoard",
    "removeMemberFromOrganization",
    "updateCheckItem",
    "updateComment",
    "updateLabel",
    "voteOnCard"
] as const;