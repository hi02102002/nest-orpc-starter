import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Card, Space, Typography } from "antd";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const healthCheck = useQuery(orpc.healthCheck.queryOptions());

	return (
		<Space orientation="vertical" size="large" style={{ width: "100%" }}>
			<div>
				<Typography.Title>
					Petshop operations, without the clutter.
				</Typography.Title>
				<Typography.Paragraph type="secondary">
					A NestJS and oRPC foundation with a shared contract and an Ant Design
					interface.
				</Typography.Paragraph>
			</div>
			<Card title="API status">
				<Space>
					<span
						aria-hidden="true"
						style={{
							width: 9,
							height: 9,
							borderRadius: "50%",
							background: healthCheck.data ? "#52c41a" : "#ff4d4f",
						}}
					/>
					<Typography.Text>
						{healthCheck.isLoading
							? "Checking connection..."
							: healthCheck.data
								? "NestJS API connected"
								: "API disconnected"}
					</Typography.Text>
				</Space>
			</Card>
		</Space>
	);
}
