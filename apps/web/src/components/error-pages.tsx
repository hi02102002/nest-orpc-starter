import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import {
	type ErrorComponentProps,
	Link,
	useRouter,
} from "@tanstack/react-router";
import { Button, Result, Typography } from "antd";
import { type ReactNode, useEffect } from "react";

function Centered({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-white">
			{children}
		</div>
	);
}

const homeButton = (
	<Link to="/">
		<Button type="primary">Về trang chủ</Button>
	</Link>
);

export function NotFoundPage() {
	return (
		<Centered>
			<Result
				status="404"
				title="404"
				subTitle="Trang bạn tìm không tồn tại hoặc đã bị di chuyển."
				extra={homeButton}
			/>
		</Centered>
	);
}

export function ErrorPage({ error }: ErrorComponentProps) {
	const router = useRouter();
	const queryErrorResetBoundary = useQueryErrorResetBoundary();

	useEffect(() => {
		queryErrorResetBoundary.reset();
	}, [queryErrorResetBoundary]);

	return (
		<Centered>
			<Result
				status="500"
				title="500"
				subTitle="Đã có lỗi xảy ra. Vui lòng thử lại sau."
				extra={[
					<Button key="retry" onClick={() => router.invalidate()}>
						Thử lại
					</Button>,
					<span key="home">{homeButton}</span>,
				]}
			>
				{import.meta.env.DEV && (
					<Typography.Paragraph type="danger" className="mb-0! font-mono">
						{error instanceof Error ? error.message : String(error)}
					</Typography.Paragraph>
				)}
			</Result>
		</Centered>
	);
}
