import { randomUUID } from "crypto";
import { Logger } from "../../logging/logger.js";
import { ToolCall } from "../base/model.js";
import { Channel } from "../channel/base.js";
import { Resource } from "../resource/base.js";
import { Tool } from "../tool/base.js";
import { Tracker } from "../tracker/base.js";
import { TicketData, TrackerConfig } from "../tracker/model.js";
import { Task } from "./base.js";
import { BrokerManager } from "../../manager/broker_manager.js";
import { parseUncleanArray } from "../../util/json.js";
import { ToolConfig } from "../tool/model.js";

export class TaskOutputManager {
  static logger = Logger.getInstance("TaskOutputManager");

  public static async writeObjectOutputs(
    task: Task,
    result: ToolCall,
    argument: string,
    taskExecutionId: string,
    workerId: string,
    sessionId?: string
  ): Promise<void> {
    this.logger.debug(`writeObjectOutputs() argument=${argument}`);
    this.logger.debug(`writeObjectOutputs() task.config.outputs=${JSON.stringify(task.config.outputs)}`);
    this.logger.debug(`writeObjectOutputs() task.config.defaultChannel=${task.config.defaultChannel}`);
    this.logger.debug(`writeObjectOutputs() task.config.tools=${JSON.stringify(task.config.tools)}`);
    this.logger.debug(`writeObjectOutputs() task.config.inputs=${JSON.stringify(task.config.inputs)}`);


    //We do toolRefs first to prevent conflicts with task outputs
    for (const toolRef of task.config.tools ?? []) {
      if (toolRef.output) {
        const resource = BrokerManager.resourceBroker.getObject(toolRef.output);
        if (resource && resource.topLevelObjectKey() === argument) {
          await this.writeResourceOutputs(
            task,
            result,
            argument,
            resource,
            taskExecutionId,
            sessionId ?? taskExecutionId,
            true
          ).catch((err: Error) => {
            this.logger.error(`writeObjectOutputs() tool resource outputs error=${err.message}`);
          });
          return;
        }
      }
    }

    for (const output of task.config?.outputs ?? []) {
      const resource = BrokerManager.resourceBroker.getObject(output);
      if (resource && resource.topLevelObjectKey() === argument) {
        await this.writeResourceOutputs(
          task,
          result,
          argument,
          resource,
          taskExecutionId,
          sessionId ?? taskExecutionId
        ).catch((err: Error) => {
          this.logger.error(`writeObjectOutputs() task resource outputs error=${err.message}`);
        });
        return;
      }
      const channel = BrokerManager.channelBroker.getObject(output);
      if (channel) {
        this.logger.debug(`writeObjectOutputs() channel=${channel.config.name}, topLevelObjectKey=${channel.topLevelObjectKey()}`);
      }
      if (channel && channel.topLevelObjectKey() === argument) {
        await this.writeChannelOutputs(
          task,
          result,
          argument,
          channel,
          taskExecutionId,
          workerId
        ).catch((err: Error) => {
          this.logger.error(`writeObjectOutputs() task channel outputs error=${err.message}`);
        });
        return;
      }
      const tracker = BrokerManager.trackerBroker.getObject(output);
      if (tracker && tracker.topLevelObjectKey() === argument) {
        await this.writeTrackerOutputs(
          task,
          result,
          argument,
          tracker
        ).catch((err: Error) => {
          this.logger.error(`writeObjectOutputs() task tracker outputs error=${err.message}`);
        });
        return;
      }
    }

    // Lastly just check all channel inputs
    if (task.config.defaultChannel) {
      const channel = BrokerManager.channelBroker.getObject(task.config.defaultChannel);
      if (channel) {
        this.logger.debug(`writeObjectOutputs() channel=${channel.config.name}, topLevelObjectKey=${channel.topLevelObjectKey()}`);
      }
      if (channel && channel.topLevelObjectKey() === argument) {
        await this.writeChannelOutputs(
          task,
          result,
          argument,
          channel,
          taskExecutionId,
          workerId
        ).catch((err: Error) => {
          this.logger.error(`writeObjectOutputs() default channel outputs error=${err.message}`);
        });
        return;
      }
      BrokerManager.channelBroker.releaseSession(task.config.defaultChannel, taskExecutionId).catch((err: Error) => {
        this.logger.error(`writeObjectOutputs() default channel release error=${err.message}`);
      });
    } else {
      for (const [key, value] of Object.entries(task.config.inputs ?? [])) {
        this.logger.debug(`writeObjectOutputs() searching inputs: key=${key}, value=${JSON.stringify(value)}`);
        if (Array.isArray(value)) {
          for (const input of value) {
            this.logger.debug(`writeObjectOutputs() ${key} isArray, input=${input}`);
            const channel = BrokerManager.channelBroker.getObject(input);
            if (channel) {
              this.logger.debug(`writeObjectOutputs() channel=${channel.config.name}, topLevelObjectKey=${channel.topLevelObjectKey()}`);
            }

            if (channel && channel.topLevelObjectKey() === argument) {
              await this.writeChannelOutputs(
                task,
                result,
                argument,
                channel,
                taskExecutionId,
                workerId
              ).catch((err: Error) => {
                this.logger.error(`writeObjectOutputs() input channel outputs error=${err.message}`);
              });
              return;
            }
            BrokerManager.channelBroker.releaseSession(input, taskExecutionId).catch((err: Error) => {
              this.logger.error(`writeObjectOutputs() input channel release error=${err.message}`);
            });
          }
        } else {
          this.logger.debug(`writeObjectOutputs() ${key} is not an array, value=${value}`);
          const channel = BrokerManager.channelBroker.getObject(value);
          if (channel) {
            this.logger.debug(`writeObjectOutputs() channel=${channel.config.name}, topLevelObjectKey=${channel.topLevelObjectKey()}`);
          }
          if (channel && channel.topLevelObjectKey() === argument) {
            await this.writeChannelOutputs(
              task,
              result,
              argument,
              channel,
              taskExecutionId,
              workerId
            ).catch((err: Error) => {
              this.logger.error(`writeObjectOutputs() input channel outputs error=${err.message}`);
            });

            return;
          }
        }
      }
    }
  }

  public static async writeResourceOutputs(
    task: Task,
    result: ToolCall,
    argument: string,
    resource: Resource,
    taskExecutionId: string,
    sessionId?: string,
    isToolOutput = false,
  ): Promise<void> {
    this.logger.debug(`writeResourceOutputs() argument=${argument}`);
    let array = result.arguments[argument] as Record<string, unknown>[] | string;
    this.logger.debug(`writeResourceOutputs() array=${JSON.stringify(array)}`);

    if (!Array.isArray(array)) {
      try {
        array = parseUncleanArray(array) as Record<string, unknown>[];
      } catch (err) {
        this.logger.error(`writeResourceOutputs() error=`, err);
        throw new Error(
          `Task ${task.config.name} returned an invalid object for resource ${resource.config.name}.`
        );
      }
    }

    const valid = await resource.validateObject(array, isToolOutput);
    if (!valid) {
      throw new Error(
        `Task ${task.config.name} resource ${resource.config.name} failed validation.`
      );
    }
    for (const object of array) {
      let content: string | undefined = undefined;
      if (object.function_name) {
        content = await this.getOutputForFunctionName(
          task,
          object.function_name as string,
          sessionId
        ).catch((err: Error) => {
          this.logger.error(`writeResourceOutputs() error=${err.message}`);
          return undefined;
        });
      } else {
        content = object.content as string;
      }
      if (!content) {
        throw new Error(
          `Task ${task.config.name} returned an invalid object for resource ${resource.config.name}, no content.`
        );
      }
      await BrokerManager.resourceBroker.write({
        resourceId: resource.config.id!,
        requestId: randomUUID(),
        message: object.message as string,
        data: object,
      });
    }
  }

  public static async writeTrackerOutputs(
    task: Task,
    result: ToolCall,
    argument: string,
    tracker: Tracker<TrackerConfig>
  ): Promise<void> {
    this.logger.debug(`writeTrackerOutputs() argument=${argument}`);

    let tickets = result.arguments[argument];
    if (tickets) {

      if (!Array.isArray(tickets)) {
        try {
          tickets = parseUncleanArray(tickets as string);
        } catch (err) {
          this.logger.error(`writeTrackerOutputs() error=`, err);
          throw new Error(
            `Task ${task.config.name} returned an invalid object for tracker ${tracker.config.name}.`
          );
        }
      }

      const valid = await tracker.validateObject(tickets);
      if (!valid) {
        throw new Error(
          `Task ${task.config.name} returned an invalid object for tracker ${tracker.config.name}.`
        );
      }

      for (const ticket of tickets as Record<string, unknown>[]) {
        BrokerManager.trackerBroker.create({
          input: ticket as unknown as TicketData,
          trackerId: tracker.config.id!,
          requestId: randomUUID(),
        }).catch((err: Error) => {
          this.logger.error(`writeTrackerOutputs() error=${err.message}`);
        });
      }
    }
  }

  public static async writeChannelOutputs(
    task: Task,
    result: ToolCall,
    argument: string,
    channel: Channel,
    taskExecutionId: string,
    workerId: string
  ): Promise<void> {
    this.logger.debug(`writeChannelOutputs() taskExecutionId=${taskExecutionId} argument=${argument}`);
    const obj = result.arguments[argument] as Record<string, unknown> | undefined;
    if (!obj) {
      throw new Error(
        `Task ${task.config.name} returned an invalid object for channel ${channel.config.name}.`
      );
    }
    const valid = await channel.validateObject(obj);
    if (!valid) {
      throw new Error(
        `Task ${task.config.name} returned an invalid object for channel ${channel.config.name}.`
      );
    }

    await BrokerManager.channelBroker.message({
      channelId: channel.config.id!,
      messageId: randomUUID(),
      message: obj.message as string,
      completionFunction: obj.completionFunction as Record<string, unknown> | undefined,
      senderId: task.config.id!,
      taskExecutionId: taskExecutionId,
      timestamp: Date.now(),
      workerId: workerId,
      messageType: "message",
    });

    await BrokerManager.channelBroker.message({
      channelId: channel.config.id!,
      messageId: randomUUID(),
      message: "",
      completionFunction: obj.completionFunction as Record<string, unknown> | undefined,
      senderId: task.config.id!,
      taskExecutionId: taskExecutionId,
      timestamp: Date.now(),
      workerId: workerId,
      messageType: "message",
      final: true,
    });

    await BrokerManager.channelBroker.releaseSession(channel.config.id!, taskExecutionId);
  }

  private static async getToolForFunctionName(task: Task, function_name: string): Promise<Tool<ToolConfig> | undefined> {
    for (const toolReference of task.config.tools ?? []) {
      const tool = BrokerManager.toolBroker.getObject(toolReference.id!);
      if (tool) {
        const hasFunction = await tool.hasFunction(function_name);
        if (hasFunction) {
          return tool;
        }
      }
    }
    return undefined;
  }

  private static async getOutputForFunctionName(task: Task, function_name: string, sessionId?: string): Promise<string | undefined> {
    const tool = await this.getToolForFunctionName(task, function_name);
    if (tool) {
      return await tool.getTaskOutput(sessionId)
    }
    return undefined;

  }
}
