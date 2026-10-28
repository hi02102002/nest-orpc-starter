import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useDebounceFn } from "ahooks";
import type { TableProps } from "antd";
import {
	App,
	Avatar,
	Button,
	Card,
	Flex,
	Input,
	Popconfirm,
	Select,
	Space,
	Table,
	Tag,
	Typography,
} from "antd";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import dayjs from "@/lib/dayjs";
import { roleOptions, UserFormModal } from "./_components/user-form-modal";
import {
	type AdminUser,
	type AdminUsersSearch,
	adminUsersQueryOptions,
	useRemoveUser,
} from "./_hooks/use-admin-users";

const searchSchema = z.object({
	page: z.number().int().min(1).catch(1),
	pageSize: z.number().int().min(1).max(100).catch(10),
	search: z.string().optional().catch(undefined),
	searchField: z.enum(["email", "name"]).catch("email"),
	role: z.enum(["admin", "user"]).optional().catch(undefined),
	sortBy: z.enum(["createdAt", "name", "email"]).catch("createdAt"),
	sortDirection: z.enum(["asc", "desc"]).catch("desc"),
}) satisfies z.ZodType<AdminUsersSearch>;

export const Route = createFileRoute("/_authed/admin/users/")({
	validateSearch: searchSchema,
	component: RouteComponent,
});

const DATE_FORMAT = "DD/MM/YYYY HH:mm";

type ModalState = { open: false } | { open: true; user?: AdminUser };

function RouteComponent() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const { message } = App.useApp();
	const { data: session } = authClient.useSession();
	const currentUserId = session?.user.id;

	const { data, isFetching, error } = useQuery(adminUsersQueryOptions(search));
	const removeUser = useRemoveUser();
	const [modal, setModal] = useState<ModalState>({ open: false });
	const [searchText, setSearchText] = useState(search.search ?? "");

	const setSearch = (patch: Partial<AdminUsersSearch>) =>
		navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

	const { run: applySearch } = useDebounceFn(
		(value: string) => setSearch({ search: value || undefined, page: 1 }),
		{ wait: 300 },
	);

	const sortOrder = (field: AdminUsersSearch["sortBy"]) =>
		search.sortBy === field
			? search.sortDirection === "asc"
				? "ascend"
				: "descend"
			: null;

	const columns: TableProps<AdminUser>["columns"] = [
		{
			title: "Tên",
			dataIndex: "name",
			key: "name",
			sorter: true,
			sortOrder: sortOrder("name"),
			render: (_, user) => (
				<Space>
					<Avatar src={user.image ?? undefined} size="small">
						{user.name.charAt(0).toUpperCase()}
					</Avatar>
					<span>{user.name}</span>
					{user.id === currentUserId && <Tag>Bạn</Tag>}
				</Space>
			),
		},
		{
			title: "Email",
			dataIndex: "email",
			key: "email",
			sorter: true,
			sortOrder: sortOrder("email"),
		},
		{
			title: "Vai trò",
			dataIndex: "role",
			key: "role",
			render: (role: string | null | undefined) =>
				role === "admin" ? (
					<Tag color="gold">Quản trị viên</Tag>
				) : (
					<Tag>Người dùng</Tag>
				),
		},
		{
			title: "Ngày tạo",
			dataIndex: "createdAt",
			key: "createdAt",
			sorter: true,
			sortOrder: sortOrder("createdAt"),
			render: (value: Date | string) => dayjs(value).format(DATE_FORMAT),
		},
		{
			key: "actions",
			align: "right",
			render: (_, user) => (
				<Space>
					<Button
						size="small"
						icon={<Pencil size={14} />}
						onClick={() => setModal({ open: true, user })}
					>
						Sửa
					</Button>
					<Popconfirm
						title="Xoá người dùng?"
						description={`${user.email} sẽ bị xoá cùng mọi phiên đăng nhập.`}
						okText="Xoá"
						cancelText="Huỷ"
						okButtonProps={{ danger: true, loading: removeUser.isPending }}
						disabled={user.id === currentUserId}
						onConfirm={async () => {
							try {
								await removeUser.mutateAsync(user.id);
								message.success("Đã xoá người dùng");
								if (data?.users.length === 1 && search.page > 1) {
									setSearch({ page: search.page - 1 });
								}
							} catch (removeError) {
								message.error(
									removeError instanceof Error
										? removeError.message
										: "Không thể xoá người dùng",
								);
							}
						}}
					>
						<Button
							size="small"
							danger
							icon={<Trash2 size={14} />}
							disabled={user.id === currentUserId}
						>
							Xoá
						</Button>
					</Popconfirm>
				</Space>
			),
		},
	];

	const onTableChange: TableProps<AdminUser>["onChange"] = (
		pagination,
		_filters,
		sorter,
	) => {
		const sort = Array.isArray(sorter) ? sorter[0] : sorter;
		const field = sort?.order ? sort.columnKey : undefined;
		setSearch({
			page: pagination.current ?? 1,
			pageSize: pagination.pageSize ?? search.pageSize,
			sortBy:
				field === "name" || field === "email" || field === "createdAt"
					? field
					: "createdAt",
			sortDirection: sort?.order === "ascend" ? "asc" : "desc",
		});
	};

	return (
		<Card variant="outlined">
			<Flex vertical gap="middle">
				<Flex justify="space-between" align="center" wrap gap="middle">
					<Typography.Title level={4} className="m-0!">
						Quản lý người dùng
					</Typography.Title>
					<Button
						type="primary"
						icon={<Plus size={16} />}
						onClick={() => setModal({ open: true })}
					>
						Thêm người dùng
					</Button>
				</Flex>
				<Flex wrap gap="small">
					<Space.Compact className="w-full max-w-md">
						<Select
							value={search.searchField}
							onChange={(searchField) => setSearch({ searchField, page: 1 })}
							options={[
								{ value: "email", label: "Email" },
								{ value: "name", label: "Tên" },
							]}
							className="w-28"
						/>
						<Input
							allowClear
							placeholder={
								search.searchField === "email"
									? "Tìm theo email"
									: "Tìm theo tên"
							}
							value={searchText}
							onChange={(event) => {
								setSearchText(event.target.value);
								applySearch(event.target.value);
							}}
						/>
					</Space.Compact>
					<Select
						allowClear
						placeholder="Tất cả vai trò"
						value={search.role}
						onChange={(role) => setSearch({ role, page: 1 })}
						options={roleOptions}
						className="w-44"
					/>
				</Flex>

				{error && (
					<Typography.Text type="danger">{error.message}</Typography.Text>
				)}
				<Table<AdminUser>
					rowKey="id"
					columns={columns}
					dataSource={data?.users}
					loading={isFetching}
					onChange={onTableChange}
					scroll={{ x: "max-content" }}
					pagination={{
						current: search.page,
						pageSize: search.pageSize,
						total: data?.total ?? 0,
						showSizeChanger: true,
						showTotal: (total) => `${total} người dùng`,
					}}
					showSorterTooltip={false}
					size="small"
				/>
			</Flex>

			<UserFormModal
				open={modal.open}
				user={modal.open ? modal.user : undefined}
				isSelf={modal.open && modal.user?.id === currentUserId}
				onClose={() => setModal({ open: false })}
			/>
		</Card>
	);
}
