import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Card, Space, Typography } from "antd";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/dashboard")({
	component: RouteComponent,
});

function RouteComponent() {
	const { session } = Route.useRouteContext();
	const privateData = useQuery(orpc.privateData.queryOptions());

	return (
		<Space orientation="vertical" size="large" style={{ width: "100%" }}>
			<div>
				<Typography.Title>Dashboard</Typography.Title>
				<Typography.Text type="secondary">
					Welcome back, {session.data?.user.name}.
				</Typography.Text>
			</div>
			<Card title="Private API">
				<Typography.Text>
					{privateData.isLoading ? "Loading..." : privateData.data?.message}
				</Typography.Text>
			</Card>
		</Space>
	);
}
