import { shallow } from "zustand/shallow";
import { CredentialState, credentialStore } from "../../state/store.credentials";
import { DocumentRepositoryState, documentRepositoryStore } from "../../state/store.documentation";
import { CredentialConfig, DocumentRepositoryConfig,  DocumentRepositoryType, documentRepositoryTypes } from "workforce-core/model";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, Grid, IconButton, MenuItem, TextField, Typography } from "@mui/material";
import { AddCard, Cancel, Save } from "@mui/icons-material";
import { SchemaVariableListComponent } from "../SchemaVariableListComponent";
import { ContextState, contextStore } from "../../state/store.context";

const selector = (state: DocumentRepositoryState) => ({
    addDocumentRepository: state.addDocumentRepository,
});

const credentialSelector = (state: CredentialState) => ({
    credentials: state.credentials,
    hydrateCredentials: state.hydrate,
});

const contextSelector = (state: ContextState) => ({
    currentOrg: state.currentOrg,
});

export const DocumentRepositoryAddComponent = () => {
    const { addDocumentRepository } = documentRepositoryStore(selector, shallow);
    const { credentials, hydrateCredentials } = credentialStore(credentialSelector, shallow);
    const [credentialList, setCredentialList] = useState<CredentialConfig[]>([]);

    const { currentOrg } = contextStore(contextSelector, shallow);

    const [editting, setEditting] = useState(false);
    const [details, setDetails] = useState<DocumentRepositoryConfig>({
        name: "",
        orgId: currentOrg.id,
        description: "",
        subtype: "internal-document-repository",
        type: "document_repository",
        variables: {
            model: "text-embedding-3-small"
        },
    });

    useMemo(() => {
        hydrateCredentials(currentOrg?.id);
    }, [currentOrg]);

    useEffect(() => {
        setCredentialList(credentials.filter((credential) => documentRepositoryTypes.includes(credential.subtype as DocumentRepositoryType)));
    }, [credentials]);

    return editting ? (
        <Card
            style={{
                maxWidth: 800,
            }}
        >
            <CardContent
                style={{
                    padding: 8,
                }}
            >
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <TextField
                            label="Name"
                            onChange={(e) => {
                                setDetails({ ...details, name: e.target.value });
                            }}
                            value={details.name}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <div className="flex flex-row justify-between items-center">
                            <TextField
                                label="Document Repository Type"
                                select
                                style={{
                                    minWidth: 235,
                                }}
                                value={details.subtype}
                                onChange={(e) => {
                                    setDetails({
                                        ...details,
                                        subtype: e.target.value as DocumentRepositoryType,
                                    });
                                }}
                            >
                                {[...new Set(documentRepositoryTypes)].map((subtype) => (
                                    <MenuItem value={subtype} key={subtype}>{subtype}</MenuItem>
                                ))}
                            </TextField>

                            <div className="flex-grow"></div>
                            <IconButton
                                onClick={() => {
                                    addDocumentRepository({
                                        ...details,
                                    });
                                    setEditting(false);
                                }}
                            >
                                <Save />
                            </IconButton>
                            <IconButton
                                onClick={() => {
                                    setEditting(false);
                                }}
                            >
                                <Cancel />
                            </IconButton>
                        </div>
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            label="Description"
                            onChange={(e) => {
                                setDetails({ ...details, description: e.target.value });
                            }}
                            value={details.description}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            select
                            label="Integration"
                            style={{
                                minWidth: 235,
                            }}
                            onChange={(e) => {
                                setDetails({ ...details, credential: e.target.value });
                            }}
                            value={details.credential}
                        >
                            {credentialList.map((credential) => (
                                <MenuItem key={credential.id} value={credential.name}>
                                    {credential.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12}>
						<SchemaVariableListComponent
							config={details}
							onPropertyChange={(name, newValue) => {
								setDetails({
									...details,
									variables: {
										...details.variables,
										[name]: newValue,
									},
								});
							}}
							onResize={(e) => {}}
							readOnly={false}
						/>
					</Grid>
                </Grid>
            </CardContent>
        </Card>
    ) : (
        <div
			className="flex flex-row justify-between items-center"
			style={{
				maxWidth: 800,
				paddingLeft: "16px",
				paddingTop: "8px",
				paddingRight: "8px",
			}}
		>
			<Typography variant="h6" component="div">
				Add Repository
			</Typography>
			<IconButton
				onClick={() => {
					setDetails({
						name: "",
						orgId: currentOrg.id,
						subtype: "internal-document-repository",
						description: "",
						type: "document_repository",
						variables: {
                            model: "text-embedding-3-small"
                        },
					});
					setEditting(true);
				}}
			>
				<AddCard />
			</IconButton>
		</div>
    )
}