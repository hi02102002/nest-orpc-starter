import { Button, Flex, Typography } from "antd";

interface ButtonFilterProps<T extends string> {
	value: T | undefined;
	options: { value: T; label: string }[];
	onChange: (value: T | undefined) => void;
	allLabel?: string;
	label?: string;
}

export function ButtonFilter<T extends string>({
	value,
	options,
	onChange,
	allLabel = "Tất cả",
	label,
}: ButtonFilterProps<T>) {
	return (
		<Flex align="center" gap="small" wrap>
			{label && (
				<Typography.Text type="secondary" strong className="text-xs">
					{label}:
				</Typography.Text>
			)}
			<Button
				type={value === undefined ? "primary" : "default"}
				onClick={() => onChange(undefined)}
			>
				{allLabel}
			</Button>
			{options.map((option) => (
				<Button
					key={option.value}
					type={value === option.value ? "primary" : "default"}
					onClick={() => onChange(option.value)}
				>
					{option.label}
				</Button>
			))}
		</Flex>
	);
}
