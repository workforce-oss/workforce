import { DocumentationConfig, DocumentRepositoryConfig } from "workforce-core/model";
import { CustomNodeData } from "../../nodes/nodeData";
import { CustomColors } from "../../util/util";
import { GenericNode } from "./GenericNode";
import { DocumentRepositoryState, documentRepositoryStore } from "../../state/store.documentation";
import { shallow } from "zustand/shallow";
import { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { RFState } from "../../state/store.flow";
import { flowStates, metaStore } from "../../state/store.meta";
import { ContextState, contextStore } from "../../state/store.context";

const selector = (state: RFState) => ({
    updateNodeData: state.updateNodeData,
    updateNodeVariables: state.updateNodeVariables,
    updateNodeCredential: state.updateNodeCredential,
    addInputToTask: state.addInputToTask,
    removeInputFromTask: state.removeInputFromTask,
    updateInputForTask: state.updateInputForTask,
    nodes: state.nodes,
})

const metaSelector = (state) => ({
    selectedFlow: state.selectedFlow,
});

const documentRepositorySelector = (state: DocumentRepositoryState) => ({
    documentRepositories: state.documentRepositories,
    documents: state.documents,
    hydrate: state.hydrate,
    hydrateDocuments: state.hydrateDocuments,
})

const contextSelector = (state: ContextState) => ({
    currentOrg: state.currentOrg,
});


export const DocumentationNode = ({ data, selected }: { data: CustomNodeData<DocumentationConfig>, selected: boolean }) => {
    const { selectedFlow } = metaStore(metaSelector, shallow);
    const { updateNodeData, updateNodeVariables, updateNodeCredential, nodes } = flowStates.get(
        selectedFlow.id
    )(selector, shallow);
    const { documentRepositories, documents, hydrate, hydrateDocuments } = documentRepositoryStore(documentRepositorySelector, shallow);
    const [selectedRepository, setSelectedRepository] = useState<DocumentRepositoryConfig>(null);
    const { currentOrg } = contextStore(contextSelector, shallow);

    useMemo(() => {
        hydrate(currentOrg?.id);
    }, [hydrate, currentOrg]);

    useEffect(() => {
        if (!selectedRepository && documentRepositories.length > 0) {
            setSelectedRepository(documentRepositories[0]);
            const newData = _.cloneDeep(data);
            newData.config.repository = documentRepositories[0].name;
            updateNodeData(data.config.id, newData);
        } else if (selectedRepository) {
            const newData = _.cloneDeep(data);
            newData.config.repository = selectedRepository.name;
            updateNodeData(data.config.id, newData);
        }
    }, [documentRepositories, selectedRepository, setSelectedRepository]);

    useEffect(() => {
        if (selectedRepository) {
            hydrateDocuments(selectedRepository);
        }
    }, [selectedRepository, hydrateDocuments]);


    return (
        <GenericNode data={data} selected={selected} children={""} headerColor={CustomColors.documentRepository}
            additionalConfiguration={
                (<div style={{
                    padding: 20
                }}>
                    <div className="w-full">
                        <div className={"text-sm truncate"}>
                            <div className={"flex flex-row flex-start items-center mt-3"}>Repository</div>
                        </div>
                        <select
                            defaultValue={selectedRepository?.name ?? ""}
                            onChange={(e) => {
                                const repository = documentRepositories.find((repo) => repo.name === e.target.value);
                                setSelectedRepository(repository);
                                const newData = _.cloneDeep(data);
                                newData.config.repository = repository.name;
                                updateNodeData(data.config.id, newData);


                            }}
                            className="nodrag block w-full pr-12 form-select dark:bg-gray-900 dark:border-gray-600 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                            {documentRepositories.map((option: DocumentRepositoryConfig) => {
                                return (
                                    <option value={option.name} key={option.id}>
                                        {option.name}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    <div className="w-full">
                        <div className={"text-sm truncate"}>
                            <div className={"flex flex-row flex-start items-center mt-3"}>Documents</div>
                        </div>
                        {documents.map((document) => {
                            return (
                                <div key={document.id} className="flex flex-row flex-start items-center mt-3">
                                    <input type="checkbox" className="flex checkbox text-left mr-2"
                                        defaultChecked={data.config.documents?.includes(document.name)}
                                        onChange={(e) => {
                                            const newData = _.cloneDeep(data);
                                            if (!newData.config.documents) {
                                                newData.config.documents = [];
                                            }
                                            if (e.target.checked) {
                                                newData.config.documents.push(document.name);
                                            } else {
                                                newData.config.documents = newData.config.documents.filter((name) => name !== document.name);
                                            }
                                            updateNodeData(data.config.id, newData);
                                        }}
                                    />
                                    <div className="text-sm truncate">{document.name}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>)
            }
        />
    )
}