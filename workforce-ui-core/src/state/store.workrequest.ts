import { create } from "zustand";
import { WorkRequestData } from "workforce-core/model";

export type WorkRequestDataState = {
    workRequests: WorkRequestData[];
    selectedWorkRequest: WorkRequestData | undefined;
    addWorkRequestData: (workRequest: WorkRequestData) => void;
    removeWorkRequestData: (id: string) => void;
    selectWorkRequestData: (id: string) => void;
    updateWorkRequestData: (workRequestData: WorkRequestData) => void;
}

export const workRequestDataStore = create<WorkRequestDataState>()(
    (set, get: () => WorkRequestDataState) => ({
        workRequests: [],
        selectedWorkRequest: undefined,
        addWorkRequestData: (workRequest: WorkRequestData) => {
            if (get().workRequests.find((s) => s.id === workRequest.id)) {
                get().updateWorkRequestData(workRequest);
                return;
            }
            set({
                workRequests: [...get().workRequests, workRequest],
            });
        },
        removeWorkRequestData: (id: string) => {
            set({
                workRequests: get().workRequests.filter((s) => s.id !== id),
            });
        },
        selectWorkRequestData: (id: string) => {
            const workRequest = get().workRequests.find((s) => s.id === id);
            if (!workRequest) {
                return;
            }
            set({
                selectedWorkRequest: workRequest,
            });
        },
        updateWorkRequestData: (workRequestData: WorkRequestData) => {
            let workRequest = get().workRequests.find((s) => s.id === workRequestData.id);
            if (!workRequest) {
                console.log(`Adding new work request ${workRequestData.id}`)
                set({
                    workRequests: [...get().workRequests, workRequestData],
                });
                return;
            } else {
                console.log(`Updating work request ${workRequestData.id}`)
                set({
                    workRequests: get().workRequests.map((s) => {
                        if (s.id === workRequestData.id) {
                            return workRequestData;
                        }
                        return s;
                    }),
                });
            }
            
            if (workRequestData.id === get().selectedWorkRequest?.id) {
                console.log(`Updating selected work request ${workRequestData.id}`)
                set({
                    selectedWorkRequest: workRequestData,
                });
            }
        },
    })
)