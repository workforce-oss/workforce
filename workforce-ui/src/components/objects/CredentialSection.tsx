import { shallow } from "zustand/shallow";
import { MetaState, metaStore } from "../../state/store.meta";
import { ObjectSection } from "./ObjectSection";

const metaSelector = (state: MetaState) => ({
	credentials: state.credentials,
});

export const CredentialSection = () => {

	const { credentials } = metaStore(metaSelector, shallow);

	return (<ObjectSection objects={credentials}></ObjectSection>);
};
