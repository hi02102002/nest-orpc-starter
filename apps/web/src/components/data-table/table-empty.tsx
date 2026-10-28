import { Button, Empty } from "antd";
import { FilterX } from "lucide-react";

interface TableEmptyProps {
	/** Lowercase entity name for the message, e.g. "người dùng". */
	entity: string;
	/** True while a filter is applied: offers "Bỏ lọc" instead of the plain empty message. */
	filtered?: boolean;
	onResetFilters?: () => void;
}

/** `locale.emptyText` for list tables. Pass `dataSource={data ?? []}` so antd renders it under the loading spinner too. */
export function TableEmpty({
	entity,
	filtered,
	onResetFilters,
}: TableEmptyProps) {
	if (filtered) {
		return (
			<Empty
				image={Empty.PRESENTED_IMAGE_SIMPLE}
				description={`Không tìm thấy ${entity} phù hợp`}
			>
				{onResetFilters && (
					<Button icon={<FilterX size={16} />} onClick={onResetFilters}>
						Bỏ lọc
					</Button>
				)}
			</Empty>
		);
	}

	return (
		<Empty
			image={Empty.PRESENTED_IMAGE_SIMPLE}
			description={`Chưa có ${entity}`}
		/>
	);
}
