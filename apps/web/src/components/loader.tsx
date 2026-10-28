import { Spin } from "antd";

export default function Loader() {
	return (
		<div className="loader-wrap">
			<Spin size="large" description="Loading" />
		</div>
	);
}
