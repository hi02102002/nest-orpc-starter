declare module "prompts" {
	interface Choice {
		disabled?: boolean | string;
		title: string;
		value: unknown;
	}

	interface PromptObject {
		choices?: Choice[];
		initial?: boolean | number | string;
		message: string;
		name: string;
		type: "confirm" | "select" | "text";
		validate?: (value: string) => boolean | string;
	}

	interface Options {
		onCancel?: () => boolean | undefined;
	}

	type Answers = Record<string, unknown>;

	export default function prompts(
		questions: PromptObject | PromptObject[],
		options?: Options,
	): Promise<Answers>;
}
