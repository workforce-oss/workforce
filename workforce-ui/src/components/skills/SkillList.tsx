import { useEffect } from "react";
import { SkillState, skillStore } from "../../state/store.skills";
import { shallow } from "zustand/shallow";
import { SkillComponent } from "./Skill";
import { SkillAddComponent } from "./SkillAddComponent";
import { ContextState, contextStore } from "../../state/store.context";

const selector = (state: SkillState ) => ({
    skills: state.skills,
    hydrate: state.hydrate,
});

const contextSelector = (state: ContextState) => ({
    currentOrg: state.currentOrg,
});

export const SKillListComponent = () => {
    const { skills, hydrate } = skillStore(selector, shallow);
    const { currentOrg } = contextStore(contextSelector, shallow);
    useEffect(() => {
        hydrate(currentOrg?.id);
    }, [hydrate, currentOrg]);
    return (
        <div style={{ padding: 20, maxWidth: 720 }}>
            {skills.map((skill) => {
                return <SkillComponent key={skill.id} skill={skill} />;
            })}
            <SkillAddComponent key={"add"} />
        </div>
    );
};