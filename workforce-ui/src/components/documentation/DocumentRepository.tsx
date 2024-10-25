import { shallow } from "zustand/shallow";
import { DocumentRepositoryState, documentRepositoryStore } from "../../state/store.documentation";
import { CredentialConfig, DocumentRepositoryConfig, DocumentRepositoryType, documentRepositoryTypes } from "workforce-core/model";
import { useEffect, useMemo, useState } from "react";
import { CredentialState, credentialStore } from "../../state/store.credentials";
import { Accordion, AccordionDetails, AccordionSummary, Grid, IconButton, List, ListItem, MenuItem, TextField, Typography } from "@mui/material";
import { Delete, ExpandMore, FileUploadOutlined, Save } from "@mui/icons-material";
import { SchemaVariableListComponent } from "../SchemaVariableListComponent";
import { WorkforceAPIClient } from "workforce-api-client";
import { ContextState, contextStore } from "../../state/store.context";

const selector = (state: DocumentRepositoryState) => ({
    documents: state.documents,
    hydrateDocuments: state.hydrateDocuments,
    updateDocumentRepository: state.updateDocumentRepository,
    removeDocumentRepository: state.removeDocumentRepository,
    uploadDocument: state.uploadDocument,
    deleteDocument: state.deleteDocument,
});

const credentialSelector = (state: CredentialState) => ({
    credentials: state.credentials,
    hydrateCredentials: state.hydrate,
});

const contextSelector = (state: ContextState) => ({
    currentOrg: state.currentOrg,
});

export const DocumentRepositoryComponent = (props: { config: DocumentRepositoryConfig }) => {
    const { config } = props;
    const { credentials, hydrateCredentials } = credentialStore(credentialSelector, shallow);
    const { documents, hydrateDocuments, updateDocumentRepository, removeDocumentRepository, uploadDocument, deleteDocument } = documentRepositoryStore(selector, shallow);
    const { currentOrg } = contextStore(contextSelector, shallow);
    const [expanded, setExpanded] = useState(false);
    const [details, setDetails] = useState<DocumentRepositoryConfig>(config);
    const [credentialList, setCredentialList] = useState<CredentialConfig[]>([]);    

    useEffect(() => {
        if (!expanded) {
            return;
        }
        WorkforceAPIClient.DocumentRepositoryAPI
            .get(config.id, { orgId: currentOrg.id })
            .then((config) => {
                setDetails(config);
                hydrateDocuments(config);
            })
    }, [config, hydrateDocuments, expanded]);

    useMemo(() => {
        hydrateCredentials(currentOrg?.id);
    }, [config, expanded, currentOrg]);

    useEffect(() => {
        setCredentialList(credentials.filter((credential) => documentRepositoryTypes.includes(credential.type as DocumentRepositoryType)));
    }, [credentials, currentOrg]);



    return (
        <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <b>{config.name}</b>
                    </Grid>

                    <Grid item xs={4}>
                        <Typography color="text.secondary">{config.type}</Typography>
                    </Grid>
                    <Grid item xs={2}>
                        {expanded && (
                            <IconButton
                                onClick={() => {
                                    updateDocumentRepository({...details});
                                }}
                            >
                                <Save />
                            </IconButton>
                        )}
                    </Grid>
                    <Grid item xs={2}>
                        {/** Delete Btton */}
                        <IconButton
                            onClick={() => {
                                removeDocumentRepository(config);
                            }}
                        >
                            <Delete />
                        </IconButton>
                    </Grid>
                </Grid>
            </AccordionSummary>
            <AccordionDetails>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography color="text.secondary">{config.id}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            label="Integration"
                            select
                            style={{
                                minWidth: 235,
                            }}
                            value={details.credential ?? ""}
                            onChange={(e) => {
                                setDetails({
                                    ...details,
                                    credential: e.target.value as string,
                                });
                            }}
                        >
                            {credentialList.map((credential) => (
                                <MenuItem key={credential?.name} value={credential?.name}>
                                    {credential?.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12}>
                        <SchemaVariableListComponent
                            config={details}
                            objectType="document_repository"
                            onPropertyChange={(name, newValue) => {
                                setDetails({
                                    ...details,
                                    variables: {
                                        ...details.variables,
                                        [name]: newValue,
                                    },
                                });
                            }}
                            onResize={(e) => { }}
                            readOnly={false}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <b>Documents</b>
                    </Grid>
                    {config.type === "internal-document-repository" && (
                        <Grid item xs={12}>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        variant="standard"
                                        type="text"
                                        InputProps={{
                                            endAdornment: (
                                                <IconButton
                                                    component="label"
                                                >
                                                    <FileUploadOutlined />
                                                    <input
                                                        style={{ display: "none" }}
                                                        type="file"
                                                        hidden
                                                        onChange={(e) => {
                                                            const formData = new FormData();
                                                            formData.append("files", e.target.files![0]);
                                                            uploadDocument(config, formData);
                                                        }}
                                                        name="[file]"
                                                    />
                                                </IconButton>
                                            )
                                        }}
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <List
                            dense
                            style={{
                                maxHeight: 200,
                                overflow: "auto",
                            }}
                        >
                            {documents.filter(document => document.repositoryId === config.id!).map((document) => {
                                return (

                                    <ListItem
                                        key={document.id}
                                        style={{
                                            borderBottom: "1px solid #e0e0e0",
                                        }}
                                    >
                                        <Grid container spacing={2}>
                                            <Grid item xs={8}>
                                                <Typography color="text.secondary">{document.name}</Typography>
                                            </Grid>
                                            <Grid item xs={2}>
                                                <Typography color="text.secondary">{document.status}</Typography>
                                            </Grid>
                                            <Grid item xs={2}>
                                                <IconButton
                                                    style={{
                                                        float: "right",
                                                        padding: 0,
                                                    }}
                                                    onClick={() => {
                                                        deleteDocument(config.id, document.id);
                                                    }}
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </Grid>
                                        </Grid>
                                    </ListItem>

                                );
                            })}
                        </List>
                    </Grid>

                </Grid>
            </AccordionDetails>
        </Accordion>
    );


}