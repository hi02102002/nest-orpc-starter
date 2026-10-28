import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { App, Button, Card, Form, Input, Space, Typography } from "antd";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

export default function SignUpForm({
	onSwitchToSignIn,
}: {
	onSwitchToSignIn: () => void;
}) {
	const { message } = App.useApp();
	const navigate = useNavigate({
		from: "/",
	});
	const { isPending } = authClient.useSession();

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
			name: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signUp.email(
				{
					email: value.email,
					password: value.password,
					name: value.name,
				},
				{
					onSuccess: () => {
						navigate({
							to: "/dashboard",
						});
						message.success("Account created");
					},
					onError: (error) => {
						message.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "Name must be at least 2 characters"),
				email: z.email("Invalid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
			}),
		},
	});

	if (isPending) {
		return <Loader />;
	}

	return (
		<Card className="auth-card">
			<Space orientation="vertical" size="large" style={{ width: "100%" }}>
				<div>
					<Typography.Title level={2} style={{ marginBottom: 4 }}>
						Create account
					</Typography.Title>
					<Typography.Text type="secondary">
						Start managing your petshop workspace.
					</Typography.Text>
				</div>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<Form component={false} layout="vertical">
						<form.Field name="name">
							{(field) => {
								const error = field.state.meta.errors[0];
								const help =
									error && typeof error === "object" && "message" in error
										? String(error.message)
										: error
											? String(error)
											: undefined;

								return (
									<Form.Item
										label="Name"
										validateStatus={help ? "error" : undefined}
										help={help}
									>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
									</Form.Item>
								);
							}}
						</form.Field>
						<form.Field name="email">
							{(field) => {
								const error = field.state.meta.errors[0];
								const help =
									error && typeof error === "object" && "message" in error
										? String(error.message)
										: error
											? String(error)
											: undefined;

								return (
									<Form.Item
										label="Email"
										validateStatus={help ? "error" : undefined}
										help={help}
									>
										<Input
											id={field.name}
											name={field.name}
											type="email"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
									</Form.Item>
								);
							}}
						</form.Field>
						<form.Field name="password">
							{(field) => {
								const error = field.state.meta.errors[0];
								const help =
									error && typeof error === "object" && "message" in error
										? String(error.message)
										: error
											? String(error)
											: undefined;

								return (
									<Form.Item
										label="Password"
										validateStatus={help ? "error" : undefined}
										help={help}
									>
										<Input.Password
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
									</Form.Item>
								);
							}}
						</form.Field>

						<form.Subscribe
							selector={(state) => ({
								canSubmit: state.canSubmit,
								isSubmitting: state.isSubmitting,
							})}
						>
							{({ canSubmit, isSubmitting }) => (
								<Button
									block
									type="primary"
									htmlType="submit"
									disabled={!canSubmit}
									loading={isSubmitting}
								>
									Create account
								</Button>
							)}
						</form.Subscribe>
					</Form>
				</form>

				<div style={{ textAlign: "center" }}>
					<Button type="link" onClick={onSwitchToSignIn}>
						Already have an account? Sign in
					</Button>
				</div>
			</Space>
		</Card>
	);
}
