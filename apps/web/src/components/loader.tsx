import { Spin } from "antd";

export default function Loader() {
	return (
		<div className="grid min-h-[50vh] place-items-center">
			<Spin size="large" description="Loading" />
		</div>
	);
}
