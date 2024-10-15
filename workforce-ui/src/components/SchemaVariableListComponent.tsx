import { BaseConfig, VariablesSchemaFactory } from "workforce-core/model";
import { SchemaVariableComponent } from "./SchemaVariableComponent";

export function SchemaVariableListComponent<TConfig extends BaseConfig>(props: {
	config: TConfig;
	readOnly: boolean;
	onPropertyChange: (name: string, newValue: string | number | boolean) => void;
	onResize: (e) => void;
	advanced?: boolean;
}) {
	const schema = VariablesSchemaFactory.for(props.config);
	return (
		<div className="flex flex-wrap max-w-xl justify-between items-center dark:text-white mt-1 px-5 py-2">
			{Array.from(schema).map(([key, value]) => {
				if (value.hidden || (props.advanced && !value.advanced) || (!props.advanced && value.advanced)) {
					return null;
				} else if (props.config.type !== "credential" && value.sensitive) {
					return null;
				} else if (props.config.type === "credential" && !value.sensitive) {
					return null;
				}
				return (
					<SchemaVariableComponent
						readOnly={props.readOnly}
						variableName={key}
						variable={value}
						currentValue={props.config.variables ? props.config.variables[key] : undefined}
						onChange={props.onPropertyChange}
						key={key}
						onResize={props.onResize}
					/>
				);
			})}
		</div>
	);
}
