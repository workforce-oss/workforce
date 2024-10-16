import { VariablesSchema } from "../../base/variables_schema.js";
import { GithubBoardTrackerMetadata } from "../impl/github_board/github_board_tracker_metadata.js";
import { MockTrackerMetadata } from "../impl/mock/mock_tracker_metadata.js";
import { TrelloTrackerMetadata } from "../impl/trello/trello_tracker_metadata.js";
import { TrackerConfig } from "../model.js";

export class TrackerConfigFactory {
    static variablesSchemaFor(config: TrackerConfig): VariablesSchema {
        switch (config.subtype) {
            case "mock":
                return MockTrackerMetadata.variablesSchema();
            case "github-board-tracker":
                return GithubBoardTrackerMetadata.variablesSchema();
            case "trello-tracker":
                return TrelloTrackerMetadata.variablesSchema();
            default:
                throw new Error(`TrackerFactory.variablesSchemaFor() unknown tracker type ${config.type}`);
        }
    }

    static defaultConfigFor(orgId: string, subtype: string): TrackerConfig {
        switch (subtype) {
            case "mock":
                return MockTrackerMetadata.defaultConfig(orgId);
            case "github-board-tracker":
                return GithubBoardTrackerMetadata.defaultConfig(orgId);
            case "trello-tracker":
                return TrelloTrackerMetadata.defaultConfig(orgId);
            default:
                throw new Error(`TrackerFactory.defaultConfigFor() unknown tracker type ${subtype}`);
        }
    }
}