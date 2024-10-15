import { shallow } from "zustand/shallow";
import { metaStore } from "../../state/store.meta";
import { ObjectSection } from "./ObjectSection";

const metaSelector = (state) => ({
	trackers: state.trackers,
});

export const TrackerSection = (props: { key: any }) => {
	const { key } = props;

	const { trackers } = metaStore(metaSelector, shallow);

	return <ObjectSection objects={trackers} key={key}></ObjectSection>;
};
