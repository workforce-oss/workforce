import { shallow } from "zustand/shallow";
import { DocumentRepositoryState, documentRepositoryStore } from "../../state/store.documentation";
import { useEffect } from "react";
import { DocumentRepositoryComponent } from "./DocumentRepository";
import { DocumentRepositoryAddComponent } from "./DocumentRepositoryAddComponent";
import { ContextState, contextStore } from "../../state/store.context";

const selector = (state: DocumentRepositoryState) => ({
    documentRepositories: state.documentRepositories,
    error: state.error,
    message: state.message,
    clearMessage: state.clearMessage,
    clearError: state.clearError,
    hydrate: state.hydrate,
});

const contextSelector = (state: ContextState) => ({
    currentOrg: state.currentOrg,
});


export const DocumentRepositoryListComponent = () => {
    const { documentRepositories, hydrate, error, message, clearError, clearMessage } = documentRepositoryStore(selector, shallow);
    const { currentOrg } = contextStore(contextSelector, shallow);
    
    useEffect(() => {
        hydrate(currentOrg?.id);
    }, [hydrate, currentOrg]);
    
    useEffect(() => {
        if (error) {
            alert(error);
            clearError();
        } else if (message) {
            alert(message);
            clearMessage();
        }
    }, [error, message, clearError, clearMessage]);
    return (
        <div style={{ padding: 20, maxWidth: 720 }}>
            {documentRepositories.map((documentRepository) => {
                return <DocumentRepositoryComponent key={documentRepository.name} config={documentRepository} />;
            })}
            <DocumentRepositoryAddComponent key={"add"} />
        </div>
    );
}