import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { App, Button, Card, Form, Input, Space, Typography } from "antd";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

const signInSchema = z.object({
	email: z.email("Invalid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignInValues = z.infer<typeof signInSchema>;

export default function SignInForm({
	onSwitchToSignUp,
}: {
	onSwitchToSignUp: () => void;
}) {
	const { message } = App.useApp();
	const navigate = useNavigate({
		from: "/",
	});
	const { isPending } = authClient.useSession();

	const {
		control,
		handleSubmit,
		formState: { isSubmitting, isValid },
	} = useForm<SignInValues>({
		defaultValues: {
			email: "",
			password: "",
		},
		mode: "onChange",
		resolver: zodResolver(signInSchema),
	});

	const onSubmit = async (value: SignInValues) => {
		await authClient.signIn.email(
			{
				email: value.email,
				password: value.password,
			},
			{
				onSuccess: () => {
					navigate({
						to: "/dashboard",
					});
					message.success("Sign in successful");
				},
				onError: (error) => {
					message.error(error.error.message || error.error.statusText);
				},
			},
		);
	};

	if (isPending) {
		return <Loader />;
	}

	return (
		<Card className="auth-card">
			<Space orientation="vertical" size="large" style={{ width: "100%" }}>
				<div>
					<Typography.Title level={2} style={{ marginBottom: 4 }}>
						Welcome back
					</Typography.Title>
					<Typography.Text type="secondary">
						Sign in to manage your petshop.
					</Typography.Text>
				</div>
				<form onSubmit={handleSubmit(onSubmit)}>
					<Form component={false} layout="vertical">
						<Controller
							control={control}
							name="email"
							render={({ field, fieldState }) => (
								<Form.Item
									label="Email"
									htmlFor={field.name}
									validateStatus={fieldState.error ? "error" : undefined}
									help={fieldState.error?.message}
								>
									<Input
										{...field}
										autoComplete="email"
										id={field.name}
										type="email"
									/>
								</Form.Item>
							)}
						/>
						<Controller
							control={control}
							name="password"
							render={({ field, fieldState }) => (
								<Form.Item
									label="Password"
									htmlFor={field.name}
									validateStatus={fieldState.error ? "error" : undefined}
									help={fieldState.error?.message}
								>
									<Input.Password
										{...field}
										autoComplete="current-password"
										id={field.name}
									/>
								</Form.Item>
							)}
						/>

						<Button
							block
							type="primary"
							htmlType="submit"
							disabled={!isValid}
							loading={isSubmitting}
						>
							Sign in
						</Button>
					</Form>
				</form>

				<div style={{ textAlign: "center" }}>
					<Button type="link" onClick={onSwitchToSignUp}>
						Need an account? Sign up
					</Button>
				</div>
			</Space>
		</Card>
	);
}
