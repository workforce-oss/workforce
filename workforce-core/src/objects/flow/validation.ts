import { VariablesSchema } from "../base/variables_schema.js";
import { VariableSchemaValidationError } from "../base/variables_schema_model.js";
import { TaskConfig } from "../task/model.js";
import { ToolConfig } from "../tool/model.js";
import { FlowConfig } from "./model.js";



export function validateFlowSchema(flow:
	FlowConfig): VariableSchemaValidationError[] {
	const errors: VariableSchemaValidationError[] = [];
	if (flow.tasks && flow.tasks.length > 0) {
		for (const task of flow.tasks) {
			errors.push(...VariablesSchema.validateBaseObject(task, "task"));
			errors.push(...validateTask(flow, task));
		}
	}
	if (flow.channels && flow.channels.length > 0) {
		for (const channel of flow.channels) {
			errors.push(...VariablesSchema.validateBaseObject(channel, "channel"));
		}
	}
	if (flow.documentation && flow.documentation.length > 0) {
		for (const documentation of flow.documentation) {
			errors.push(...VariablesSchema.validateBaseObject(documentation, "documentation"));
		}
	}
	if (flow.resources && flow.resources.length > 0) {
		for (const resource of flow.resources) {
			errors.push(...VariablesSchema.validateBaseObject(resource, "resource"));
		}
	}
	if (flow.tools && flow.tools.length > 0) {
		for (const tool of flow.tools) {
			errors.push(...VariablesSchema.validateBaseObject(tool, "tool"));
			errors.push(...validateTool(flow, tool));
		}
	}
	if (flow.trackers && flow.trackers.length > 0) {
		for (const tracker of flow.trackers) {
			errors.push(...VariablesSchema.validateBaseObject(tracker, "tracker"));
		}
	}
	return errors;
}

function validateTask(flow: FlowConfig, task: TaskConfig): VariableSchemaValidationError[] {
	const errors: VariableSchemaValidationError[] = [];
	for (const input of Object.values(task.inputs ?? [])) {
		const inputVals = []
		if (Array.isArray(input)) {
			inputVals.push(...input)
		} else {
			inputVals.push(input)
		}
		for (const val of inputVals) {
			if (!(flow.resources?.find(r => r.name === val || r.id == val) || flow.channels?.find(c => c.name === val || c.id === val) || flow.tasks?.find(t => t.name === val || t.id === val))) {
				errors.push({
					message: `Task ${task.name} has input ${val} which is not defined in the flow`,
				});
			}
		}
	}
	for (const documentation of task.documentation ?? []) {
		if (!flow.documentation?.find(d => d.name === documentation || d.id === documentation)) {
			errors.push({
				message: `Task ${task.name} has documentation ${documentation} which is not defined in the flow`,
			});
		}
	}
	for (const output of task.outputs ?? []) {
		if (!(flow.resources?.find(r => r.name === output || r.id == output) || flow.channels?.find(c => c.name === output || c.id === output) || flow.trackers?.find(t => t.name === output || t.id === output))) {
			errors.push({
				message: `Task ${task.name} has output ${output} which is not defined in the flow`,
			});
		}
	}
	for (const tool of task.tools ?? []) {
		if (!flow.tools?.find(t => t.name === tool.name || t.id === tool.id)) {
			errors.push({
				message: `Task ${task.name} has tool ${tool.name} which is not defined in the flow`,
			});
		}
	}
	for (const trigger of task.triggers ?? []) {
		if (!flow.channels?.find(c => c.name === trigger || c.id === trigger) && !flow.resources?.find(r => r.name === trigger || r.id === trigger)) {
			errors.push({
				message: `Task ${task.name} has trigger ${trigger} which is not defined in the flow`,
			});
		}
	}
	//TODO: Make subtasks implicit based on inputs
	for (const subtask of task.subtasks ?? []) {
		if (!flow.tasks?.find(t => t.name === subtask.name || t.id === subtask.id)) {
			errors.push({
				message: `Task ${task.name} has subtask ${subtask.name} which is not defined in the flow`,
			});
		}
	}
	if (task.tracker && !flow.trackers?.find(t => t.name === task.tracker || t.id === task.tracker)) {
		errors.push({
			message: `Task ${task.name} has tracker ${task.tracker} which is not defined in the flow`,
		});
	}

	return errors;
}

function validateTool(flow: FlowConfig, tool: ToolConfig) {
	const errors: VariableSchemaValidationError[] = [];
	if (tool.channel && !flow.channels?.find(c => c.name === tool.channel || c.id === tool.channel)) {
		errors.push({
			message: `Tool ${tool.name} has channel ${tool.channel} which is not defined in the flow`,
		});
	}
	return errors;
}
