import { Logger } from "../../logging/logger.js";
import { BrokerManager } from "../../manager/broker_manager.js";
import { Task } from "./base.js";

export class TaskInputMapper {

  public static async mapResourceInputs(
    task: Task,
    inputs: Record<string, string>,
  ): Promise<void> {
    Logger.getInstance("TaskInputMapper").debug(`Mapping resource inputs for task ${task.config.name}`);
    Logger.getInstance("TaskInputMapper").debug(`Task config: ${JSON.stringify(task.config)}`);

    for (const [inputName, inputVals] of Object.entries(task.config.inputs ?? {}) || []) {
      const inputValues = Array.isArray(inputVals) ? inputVals : [inputVals];
      Logger.getInstance("TaskInputMapper").debug(
        `Mapping resource input ${inputName} for task ${task.config.name}`
      );
      let resource = undefined;
      for (const id of inputValues) {
        resource = BrokerManager.resourceBroker.getObject(id);
        if (resource) {
          break;
        }
      }

      if (resource) {
        Logger.getInstance("TaskInputMapper").debug(
          `Resource ${resource.config.name} found for input ${inputName} for task ${task.config.name}`
        );
        const latest = await resource.latestVersion();
        if (latest?.objectNames && latest.objectNames.length > 0) {
          Logger.getInstance("TaskInputMapper").debug(
            `Latest version ${latest.versionId} found for resource ${resource.config.name} for input ${inputName} for task ${task.config.name}`
          );
          const latestObject = await resource.fetchObject(
            latest,
            latest.objectNames[0]
          );
          if (latestObject) {
            Logger.getInstance("TaskInputMapper").debug(
              `Latest Object: ${JSON.stringify(latestObject, null, 2)}`);
            Logger.getInstance("TaskInputMapper").debug(
              `Latest object ${latestObject.name} found for resource ${resource.config.name} for input ${inputName} for task ${task.config.name}`
            );
            inputs[inputName] = latestObject.content;
            // add "." separated names based on keys of latest object
            if (latestObject.name) {
              inputs[`${inputName}.name`] = latestObject.name;
            }
            if (latestObject.content) {
              inputs[`${inputName}.content`] = latestObject.content;
            }
            if (latestObject.metadata) {
              for (const [key, value] of Object.entries(latestObject.metadata)) {
                // check if value is a string
                if (typeof value === "string") {
                  inputs[`${inputName}.metadata.${key}`] = value;
                }
              }
            }
          } else {
            Logger.getInstance("TaskInputMapper").debug(
              `No latest object found for resource ${resource.config.name} for input ${inputName} for task ${task.config.name}`
            );
          }
        } else {
          Logger.getInstance("TaskInputMapper").debug(
            `No latest version found for resource ${resource.config.name} for input ${inputName} for task ${task.config.name}`
          );
        }
      } else {
        Logger.getInstance("TaskInputMapper").debug(
          `Resource not found for input ${inputName} for task ${task.config.name}`
        );
      }
    }
  }
}
