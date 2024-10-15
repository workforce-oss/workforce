import { INTEGER, JSON, STRING, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, Table } from "sequelize-typescript";
import { jsonParse, jsonStringify } from "../../util/json.js";
import { BaseModel } from "../base/db.js";
import { FlowDb } from "../flow/db.js";
import { Subtask, TaskConfig, TaskType, ToolReference } from "./model.js";

@Table({
  tableName: "tasks",
  indexes: [
    {
      unique: true,
      fields: ["flowId", "name"],
    },
  ],
})
export class TaskDb extends BaseModel {
  @ForeignKey(() => FlowDb)
  @Column({
    type: UUID,
    allowNull: false,
    unique: "flowName",
  })
  declare flowId: string;

  @BelongsTo(() => FlowDb)
  declare flow: Awaited<FlowDb>;

  @Column({
    type: STRING,
    allowNull: true,
  })
  declare defaultChannel?: string | null;

  @Column({
    type: JSON,
    allowNull: true,
  })
  declare requiredSkills?: string[] | null;

  @Column({
    type: UUID,
    allowNull: true,
  })
  declare trackerId?: string | null;

  @Column({
    type: JSON,
    allowNull: true,
  })
  declare documentation?: string[] | null;

  @Column({
    type: JSON,
    allowNull: true,
  })
  declare tools?: string | null;


  @Column({
    type: JSON,
    allowNull: true,
  })
  declare triggers?: string[] | null;

  @Column({
    type: JSON,
    allowNull: true,
  })
  declare inputs?: string | null;

  @Column({
    type: JSON,
    allowNull: true,
  })
  declare subtasks?: string | null;

  @Column({
    type: JSON,
    allowNull: true,
  })
  declare outputs?: string[] | null;

  @Column({
    type: INTEGER,
    allowNull: true,
    get() {
      const value = this.getDataValue("costLimit") as number | null | undefined;
      if (value === null || value === undefined || value === 0) {
        return null;
      }
      return value / 100;
    },
    set(value: number | null | undefined) {
      if (value === null || value === undefined) {
        this.setDataValue("costLimit", null);
      } else {
        this.setDataValue("costLimit", Math.floor(value * 100));
      }
    }
  })
  declare costLimit?: number | null;

  public toModel(): TaskConfig & { flow?: { id: string, name: string, description: string } } {
    const base = super.toModel();
    const trackerId = this.trackerId;
    const requiredSkills = this.requiredSkills;
    const documentation = this.documentation;
    const toolReferences = jsonParse(this.tools);
    const triggerIds = this.triggers;
    const inputs = jsonParse(this.inputs);
    const subtasks = jsonParse(this.subtasks)
    const outputs = this.outputs;
    const config: TaskConfig = {
      ...base,
      subtype: this.subtype as TaskType,
      flowId: this.flowId,
    };

    if (this.defaultChannel) {
      config.defaultChannel = this.defaultChannel;
    }

    if (trackerId) {
      config.tracker = trackerId;
    }

    if (requiredSkills) {
      config.requiredSkills = requiredSkills;
    }

    if (documentation) {
      config.documentation = documentation;
    }

    if (toolReferences) {
      config.tools = toolReferences as ToolReference[];
    }

    if (triggerIds) {
      config.triggers = triggerIds;
    }

    if (inputs) {
      config.inputs = inputs as Record<string, string | string[]>;
    }

    if (subtasks) {
      config.subtasks = subtasks as Subtask[];
    }

    if (outputs) {
      config.outputs = outputs;
    }

    if (this.flow) {
      return {
        ...config,
        flow: {
          id: this.flow.id,
          name: this.flow.name,
          description: this.flow.description,
        },
      };
    }

    return config;
  }

  public loadModel(model: TaskConfig): TaskDb {
    super.loadModel(model);
    if (model.flowId) {
      this.flowId = model.flowId;
    }

    if (model.tracker) {
      this.trackerId = model.tracker;
    } else {
      this.trackerId = null;
    }

    if (model.requiredSkills) {
      this.requiredSkills = model.requiredSkills;
    } else {
      this.requiredSkills = null;
    }

    if (model.documentation) {
      this.documentation = model.documentation;
    } else {
      this.documentation = null;
    }

    if (model.tools) {
      this.tools = jsonStringify(model.tools);
    } else {
      this.tools = null;
    }

    if (model.triggers) {
      this.triggers = model.triggers;
    } else {
      this.triggers = null;
    }

    if (model.inputs) {
      this.inputs = jsonStringify(model.inputs);
    } else {
      this.inputs = null;
    }

    if (model.outputs) {
      this.outputs = model.outputs;
    } else {
      this.outputs = null;
    }

    if (model.subtasks) {
      this.subtasks = jsonStringify(model.subtasks);
    } else {
      this.subtasks = null;
    }

    if (model.defaultChannel) {
      this.defaultChannel = model.defaultChannel;
    } else {
      this.defaultChannel = null;
    }
    return this;
  }
}
