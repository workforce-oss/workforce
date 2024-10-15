import { randomUUID } from "crypto";
import { Subscription } from "rxjs";
import { Logger } from "../../logging/logger.js";
import { BrokerManager } from "../../manager/broker_manager.js";
import { ChannelMessageDataKey, ChannelMessageEvent } from "../channel/model.js";
import { TicketEvent } from "../tracker/model.js";
import { Task } from "./base.js";

export class TaskSubscriptionManager {
  static logger = Logger.getInstance("TaskSubscriptionManager");

  public static async trackerSubscription(
    task: Task,
    trackerId: string,
    callback: (args: {
      taskId: string,
      users: string[],
      taskExecutionId: string,
      inputs: Record<string, string>
    }) => Promise<void>
  ): Promise<Subscription> {
    const trackerSubscription = await BrokerManager.trackerBroker.subscribe(
      trackerId,
      (ticketEvent: TicketEvent) => {
        if (
          ticketEvent.trackerId !== task.config.tracker ||
          !task.config.tracker
        ) {
          return;
        }
        if (
          ticketEvent.data.status !== "ready" &&
          ticketEvent.data.status !== "open"
        ) {
          return;
        }
        BrokerManager.trackerBroker.update({
          trackerId: task.config.tracker,
          ticketId: ticketEvent.ticketId,
          ticketUpdateId: randomUUID(),
          data: {
            name: ticketEvent.data.name,
            status: "in-progress",
            comments: [`Task ${task.config.name} started.`],
          },
        }).then(() => {
          const inputs: Record<string, string> = {};
          inputs["ticket.id"] = ticketEvent.ticketId;
          inputs["ticket.name"] = ticketEvent.data.name;
          inputs["ticket.description"] = ticketEvent.data.description ?? "";

          const users = ticketEvent.data.assignee ? [ticketEvent.data.assignee] : [];

          callback({ taskId: task.config.id!, users, taskExecutionId: randomUUID(), inputs })
            .catch(async (error: Error) => {
              if (!task.config.tracker) {
                return;
              }
              await BrokerManager.trackerBroker.update({
                trackerId: task.config.tracker,
                ticketId: ticketEvent.ticketId,
                ticketUpdateId: randomUUID(),
                data: {
                  name: ticketEvent.data.name,
                  status: "failed",
                  comments: [
                    `Task ${task.config.name} failed with error: ${error.message}`,
                  ],
                },
              });
              this.logger.error(
                `Task ${task.config.name} failed with error: ${error.message}`
              );
            });
        }).catch((error: Error) => {
          this.logger.error(
            `Task ${task.config.name} failed with error: ${error.message}`
          );
        });
      });
    return trackerSubscription;
  }

  public static async channelSubscription(
    task: Task,
    channelId: string,
    callback: (args: {
      taskId: string,
      users: string[],
      taskExecutionId: string,
      inputs: Record<string, string>
    }) => Promise<void>
  ): Promise<Subscription | undefined> {
    this.logger.debug(
      `Task ${task.config.name} has a trigger for channel ${channelId}.`
    );
    try {
      const input = (Object.entries(task.config.inputs ?? {}) || []).find(
        (input) => {
          // check if it is an array
          if (Array.isArray(input[1])) {
            return input[1].includes(channelId);
          }
          return input[1] === channelId
        }
      )?.[0];

      if (!input) {
        this.logger.warn(
          `Task ${task.config.name} has an input channel ${channelId} that is not mapped to an input.`
        );
      } else {
        this.logger.debug(
          `Task ${task.config.name} has an input channel ${channelId} mapped to input ${input}.`
        );
      }
      const channelSubscription = await BrokerManager.channelBroker.subscribe(
        channelId,
        async (messageEvent: ChannelMessageEvent) => {
          if (messageEvent.taskExecutionId) {
            this.logger.debug(
              `Task ${task.config.name} received a message on channel ${channelId} for task execution ${messageEvent.taskExecutionId}. Ignoring.`
            );
            return;
          }
          if (!messageEvent.message) {
            this.logger.warn(
              `Task ${task.config.name} received a message on channel ${channelId} without a message.`
            );
            return;
          }
          this.logger.debug(
            `Task ${task.config.name} received a message on channel ${channelId}.`
          );

          const taskExecutionId = randomUUID();

          const inputValues: Record<string, string> = {};
          if (input) {
            inputValues[input] = messageEvent.message;
          }
          if (messageEvent.channelMessageData) {
            inputValues[ChannelMessageDataKey] = JSON.stringify(messageEvent.channelMessageData);
          }
          if (messageEvent.image) {
            inputValues.image = messageEvent.image;
          }

          await callback({ taskId: task.config.id!, users: messageEvent.users, taskExecutionId, inputs: inputValues }).catch(
            (error: Error) => {
              this.logger.error(
                `Task ${task.config.name} failed with error: ${error.message}`
              );
            }
          );
        }
      );
      this.logger.debug(`Task ${task.config.name} subscribed to channel ${channelId}.`);
      return channelSubscription;
    } catch (error) {
      this.logger.error(
        `Task ${task.config.name} failed with error: ${error as Error}`
      );
    }
  }

  public static async resourceSubscription(
    task: Task,
    resourceId: string,
    callback: (args: {
      taskId: string,
      users: string[],
      taskExecutionId: string,
      inputs: Record<string, string>
    }) => Promise<void>
  ): Promise<Subscription | undefined> {
    this.logger.debug(
      `Task ${task.config.name} has a trigger for resource ${resourceId}.`
    );
    try {
      const subscription = await BrokerManager.resourceBroker.subscribe(
        resourceId,
        (resourceVersion) => {
          this.logger.debug(
            `Task ${task.config.name} received a resource update on resource ${resourceId}.`
          );
          const metadataUsers = resourceVersion.metadata.users as string[] | undefined;
          callback({ taskId: task.config.id!, users: metadataUsers ?? [], taskExecutionId: randomUUID(), inputs: {} }).catch(
            (error: Error) => {
              this.logger.error(
                `Task ${task.config.name} failed with error: ${error.message}`
              );
            }
          );
        }
      );
      return subscription;
    } catch (error) {
      this.logger.error(
        `Task ${task.config.name} failed with error: ${error as Error}`
      );
    }
  }
}
