import { Tracker } from "../base.js";
import { GithubBoardTracker } from "../impl/github_board/github_board_tracker.js";
import { MockTracker } from "../impl/mock/mock_tracker.js";
import { TrelloTracker } from "../impl/trello/trello_tracker.js";
import { TrackerConfig } from "../model.js";

export class TrackerFactory {
    static create(config: TrackerConfig, onFailure: (objectId: string, error: string) => void): Tracker<TrackerConfig> {
        switch (config.type) {
            case "mock-tracker":
                return new MockTracker(config);
            case "github-board-tracker":
                return new GithubBoardTracker(config, onFailure);
            case "trello-tracker":
                return new TrelloTracker(config, onFailure);
            default:
                throw new Error(`TrackerFactory.create() unknown tracker type ${config.type as string}`);
        }
    }
}