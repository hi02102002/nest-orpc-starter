import { Button, Flex, Typography } from "antd";
import { FilterX } from "lucide-react";
import type { ReactNode } from "react";

interface ListPageProps {
	title: string;
	actions?: ReactNode;
	filters?: ReactNode;
	onResetFilters?: () => void;
	filtersActive?: boolean;
	children: ReactNode;
}

export function ListPage({
	title,
	actions,
	filters,
	onResetFilters,
	filtersActive = false,
	children,
}: ListPageProps) {
	return (
		<Flex vertical gap="middle">
			<Typography.Title level={4} className="m-0!">
				{title}
			</Typography.Title>
			{actions && (
				<Flex justify="flex-end" gap="small" wrap>
					{actions}
				</Flex>
			)}
			{filters && (
				<Flex justify="flex-end" align="center" gap="small" wrap>
					{onResetFilters && filtersActive && (
						<Button icon={<FilterX size={16} />} onClick={onResetFilters}>
							Bỏ lọc
						</Button>
					)}
					{filters}
				</Flex>
			)}
			{children}
		</Flex>
	);
}
