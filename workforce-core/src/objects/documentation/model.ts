import { BaseConfig } from "../base/model.js";

export const documentationTypes = ["default-documentation"] as const;
export type DocumentationType = typeof documentationTypes[number];

export interface DocumentationConfig extends BaseConfig {
    type: DocumentationType;

    /**
     * The document repository to use for the documentation.
     * When using the API, this is name, but internally it gets converted to id.
     */
    repository?: string;

    /**
     * The list of documents from the repository to use.
     * If this is empty, then all documents are used.
     * When using the API, these are names, but internally they get converted to ids.
     */
    documents?: string[];
}

export const retrievalScopeTypes = ["repository", "document", "section", "chunk"] as const;
export type RetrievalScopeType = typeof retrievalScopeTypes[number];
export const tokenFillStrategyTypes = ["default", "chunk_first", "fill_section", "fill_document"] as const;
export type TokenFillStrategyType = typeof tokenFillStrategyTypes[number];