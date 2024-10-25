import { WorkforceAPIClient } from "workforce-api-client";
import { Skill } from "workforce-core/model";
import { temporal } from "zundo";
import { create, StateCreator } from "zustand";

export type SkillState = {
    message: string | undefined;
    error: string | undefined;
    skills: Skill[];
    addSkill: (skill: Skill) => void;
    removeSkill: (skill: Skill) => void;
    updateSkill: (skill: Skill) => void;
    hydrate: (orgId: string) => void;
}

export const skillStore = create<SkillState>()(
    temporal((set, get: () => SkillState) => ({
        message: undefined,
        error: undefined,
        skills: [],
        addSkill: (skill: Skill) => {
            WorkforceAPIClient.SkillAPI
                .create(skill, { orgId: skill.orgId })
                .then((response: Skill | string[]) => {
                    if (Array.isArray(response)) {
                        set({
                            error: response.join("\n"),
                        });
                        return;
                    }
                    set({
                        skills: [...get().skills, skill],
                    });
                })
                .catch((e) => {
                    console.error(e);
                    set({
                        error: e.message,
                    });
                });
        },
        removeSkill: (skill: Skill) => {
            WorkforceAPIClient.SkillAPI
                .delete(skill.id, { orgId: skill.orgId })
                .then(() => {
                    console.log(`deleteSkill() deleted skill ${skill.name}`);
                    set({
                        skills: get().skills.filter((s) => s.id !== skill.id),
                    });
                })
                .catch((e) => {
                    console.error(e);
                    set({
                        error: e.message,
                    });
                });
        },
        updateSkill: (skill: Skill) => {
            WorkforceAPIClient.SkillAPI
                .update(skill, skill.id, { orgId: skill.orgId })
                .then((response: Skill | string[]) => {
                    if (Array.isArray(response)) {
                        set({
                            error: response.join("\n"),
                        });
                        return;
                    }
                    set({
                        skills: get().skills.map((s) => (s.id === skill.id ? skill : s)),
                    });
                })
                .catch((e) => {
                    console.error(e);
                    set({
                        error: e.message,
                    });
                });
        },
        hydrate: (orgId: string) => {
            WorkforceAPIClient.SkillAPI
                .list({
                    orgId,
                })
                .then((skills: Skill[]) => {
                    set({
                        skills: skills,
                    });
                })
                .catch((e) => {
                    console.error(e);
                    set({
                        error: e.message,
                    });
                });
        },
    })) as StateCreator<SkillState, [], [never, unknown][]>
)