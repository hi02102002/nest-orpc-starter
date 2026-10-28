import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import {
	type ErrorComponentProps,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { Button, Flex, Result, Typography } from "antd";
import { House, RotateCcw } from "lucide-react";
import { type ReactNode, useEffect } from "react";

function Centered({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-white">
			{children}
		</div>
	);
}

function HomeButton() {
	const navigate = useNavigate();
	return (
		<Button
			type="primary"
			icon={<House size={16} />}
			onClick={() => navigate({ to: "/" })}
		>
			Về trang chủ
		</Button>
	);
}

export function NotFoundPage() {
	return (
		<Centered>
			<Result
				status="404"
				title="404"
				subTitle="Trang bạn tìm không tồn tại hoặc đã bị di chuyển."
				extra={<HomeButton />}
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
				extra={
					<Flex justify="center" gap="small" wrap>
						<Button
							icon={<RotateCcw size={16} />}
							onClick={() => router.invalidate()}
						>
							Thử lại
						</Button>
						<HomeButton />
					</Flex>
				}
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
