import { zodResolver } from "@hookform/resolvers/zod";
import { type FieldValues, type UseFormProps, useForm } from "react-hook-form";
import type z from "zod";

export function useZodForm<
	TInput extends FieldValues,
	TOutput extends FieldValues,
>(
	schema: z.ZodType<TOutput, TInput>,
	props?: Omit<UseFormProps<TInput, unknown, TOutput>, "resolver">,
) {
	return useForm<TInput, unknown, TOutput>({
		...props,
		resolver: zodResolver(schema),
	});
}
