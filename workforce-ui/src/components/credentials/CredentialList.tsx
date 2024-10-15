import { useEffect } from "react";
import { shallow } from "zustand/shallow";
import { CredentialState, credentialStore } from "../../state/store.credentials";
import { CredentialComponent } from "./Credential";
import { CredentialAddComponent } from "./CredentialAddComponent";
import { ContextState, contextStore } from "../../state/store.context";

const selector = (state: CredentialState) => ({
	credentials: state.credentials,
	hydrate: state.hydrate,
});

const contextSelector = (state: ContextState) => ({
	currentOrg: state.currentOrg,
});


export const CredentialListComponent = () => {
	const { credentials, hydrate } = credentialStore(selector, shallow);
	const { currentOrg } = contextStore(contextSelector, shallow);
	useEffect(() => {
		hydrate(currentOrg?.id);
	}, [hydrate, currentOrg]);
	return (
		<div style={{ padding: 20, maxWidth: 720 }}>
			{credentials.map((credential) => {
				return <CredentialComponent key={credential.name} config={credential} />;
			})}
			<CredentialAddComponent key={"add"} />
		</div>
	);
};
