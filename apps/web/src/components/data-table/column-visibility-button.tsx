import { Button, Checkbox, Divider, Flex, Popover, Typography } from "antd";
import { Eye, EyeOff } from "lucide-react";
import type { ReactNode } from "react";

import type { ColumnVisibility } from "./use-column-visibility";

interface ColumnVisibilityButtonProps {
	visibility: ColumnVisibility;
	extra?: ReactNode;
}

export function ColumnVisibilityButton({
	visibility: { options, hidden, setHidden },
	extra,
}: ColumnVisibilityButtonProps) {
	const hiddenCount = options.filter((option) =>
		hidden.includes(option.key),
	).length;

	const content = (
		<Flex vertical className="min-w-48">
			{extra && (
				<>
					{extra}
					<Divider className="my-2!" />
				</>
			)}
			<Checkbox.Group
				value={hidden}
				onChange={(keys) => setHidden(keys as string[])}
				className="flex-col! gap-2"
				options={options.map((option) => ({
					value: option.key,
					label: option.label,
				}))}
			/>
			{hiddenCount > 0 && (
				<>
					<Divider className="my-2!" />
					<Typography.Link onClick={() => setHidden([])}>
						Hiện tất cả cột
					</Typography.Link>
				</>
			)}
		</Flex>
	);

	return (
		<Popover content={content} trigger="click" placement="bottomRight">
			<Button icon={hiddenCount > 0 ? <EyeOff size={16} /> : <Eye size={16} />}>
				Ẩn cột ({hiddenCount})
			</Button>
		</Popover>
	);
}
