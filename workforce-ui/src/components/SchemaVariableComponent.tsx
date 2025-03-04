import { useEffect, useRef, useState } from "react";
import { classNames } from "../util/util";
import { VariableSchemaElement } from "workforce-core/model";

export const SchemaVariableComponent = (props: {
	variableName: string;
	variable: VariableSchemaElement;
	currentValue?: any;
	readOnly: boolean;
	onChange: (name: string, newValue: string | number | boolean) => void;
	onResize: (e) => void;
}) => {
	let defaultInputValue: string | number | string[];
	const textareaRef = useRef(null);
	const [textAreaHeight, setTextAreaHeight] = useState();
	const [sensitiveDataVisible, setSensitiveDataVisible] = useState(false);

	useEffect(() => {
		if (!textareaRef) {
			return;
		}
		if (textareaRef.current && textareaRef.current.clientHeight !== textAreaHeight) {
			setTextAreaHeight(textareaRef.current.clientHeight);
			props.onResize(textareaRef.current);
		}
	}, [textareaRef, props.onResize, textAreaHeight, setTextAreaHeight]);

	if (props.currentValue && (props.variable.type === "string" || props.variable.type === "number")) {
		defaultInputValue = props.currentValue as string | number;
	} else if (
		props.variable.default !== undefined &&
		props.variable.default !== null &&
		(typeof props.variable.default === "string" || typeof props.variable.default === "number")
	) {
		defaultInputValue = props.variable.default;
	}
	let defaultChecked: boolean;
	if (props.currentValue && props.variable.type === "boolean") {
		defaultChecked = props.currentValue as boolean;
	} else if (
		props.variable.default !== undefined &&
		props.variable.default !== null &&
		typeof props.variable.default === "boolean"
	) {
		defaultChecked = props.variable.default;
	}
	return (
		<div className="w-full" key={props.variableName}>
			<div className={"text-sm truncate"}>
				<div className={"flex flex-row flex-start items-center mt-3"}>
					{props.variable.type === "boolean" ? (
						<input
							type="checkbox"
							disabled={props.readOnly}
							defaultChecked={defaultChecked}
							onChange={props.readOnly ? null : (e) => props.onChange(props.variableName, e.target.checked)}
							className="flex checkbox text-left mr-2"
						/>
					) : null}
					{props.variableName}
					<span className="text-red-600">{props.variable.required ? " *" : ""}</span>
				</div>
			</div>
			{(props.variable.type === "string" || props.variable.type === "array") && props.variable.options ? (
				<select
					disabled={props.readOnly}
					defaultValue={defaultInputValue}
					onChange={props.readOnly ? null : (e) => props.onChange(props.variableName, e.target.value)}
					className="nodrag block w-full pr-12 form-select dark:bg-gray-900 dark:border-gray-600 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				>
					{props.variable.options.map((option) => {
						return (
							<option value={option} key={option}>
								{option}
							</option>
						);
					})}
				</select>
			) : null}
			{props.variable.type === "string" && !props.variable.options ? (
				props.variable.multiline ? (
					<textarea
						disabled={props.readOnly}
						ref={textareaRef}
						defaultValue={defaultInputValue}
						onChange={props.readOnly ? null : (e) => props.onChange(props.variableName, e.target.value)}
						className="nodrag nowheel block w-full pr-12 form-input dark:bg-gray-900 dark:border-gray-600 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
					/>
				) : (
					<div className="relative">
						<input
							disabled={props.readOnly}
							type="text"
							defaultValue={defaultInputValue}
							onChange={props.readOnly ? null : (e) => props.onChange(props.variableName, e.target.value)}
							className={classNames(
								"nodrag block w-full pr-12 form-input dark:bg-gray-900 dark:border-gray-600 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
								!sensitiveDataVisible && props.variable.sensitive ? "password" : ""
							)}
						/>
						{props.variable.sensitive ? (
							<button
								className="absolute inset-y-0 right-0 items-center px-4 text-gray-600"
								onClick={() => {
									setSensitiveDataVisible(!sensitiveDataVisible);
								}}
							>
								{sensitiveDataVisible ? (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth={1.5}
										stroke="currentColor"
										className="w-5 h-5"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
										/>
									</svg>
								) : (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth={1.5}
										stroke="currentColor"
										className="w-5 h-5"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
										/>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
										/>
									</svg>
								)}
							</button>
						) : null}
					</div>
				)
			) : null}
			{props.variable.type === "number" ? (
				<input
					type="number"
					disabled={props.readOnly}
					defaultValue={defaultInputValue}
					onChange={props.readOnly ? null : (e) => props.onChange(props.variableName, e.target.value)}
					className="nodrag block w-full pr-12 form-input dark:bg-gray-900 dark:border-gray-600 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				/>
			) : null}
		</div>
	);
};
