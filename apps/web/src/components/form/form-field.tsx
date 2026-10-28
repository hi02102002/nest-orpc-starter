import { Form } from "antd";
import type { ReactNode } from "react";
import {
	type Control,
	Controller,
	type ControllerRenderProps,
	type FieldPath,
	type FieldValues,
} from "react-hook-form";

interface FormFieldProps<
	TValues extends FieldValues,
	TName extends FieldPath<TValues>,
	TOutput,
> {
	control: Control<TValues, unknown, TOutput>;
	name: TName;
	label: ReactNode;
	/** Shows the red asterisk. Must match the zod schema: true when the field can't be empty. */
	required?: boolean;
	/** Hint under the field; replaced by the validation error while there is one. */
	help?: ReactNode;
	extra?: ReactNode;
	children: (
		field: ControllerRenderProps<TValues, TName> & { id: string },
	) => ReactNode;
}

/** react-hook-form + antd Form.Item with label, asterisk, error and help in one place. Use inside `<Form component={false}>`. */
export function FormField<
	TValues extends FieldValues,
	TName extends FieldPath<TValues>,
	TOutput,
>({
	control,
	name,
	label,
	required,
	help,
	extra,
	children,
}: FormFieldProps<TValues, TName, TOutput>) {
	return (
		<Controller
			control={control}
			name={name}
			render={({ field, fieldState }) => (
				<Form.Item
					label={label}
					htmlFor={name}
					required={required}
					validateStatus={fieldState.error ? "error" : undefined}
					help={fieldState.error?.message ?? help}
					extra={extra}
				>
					{children({ ...field, id: name })}
				</Form.Item>
			)}
		/>
	);
}
