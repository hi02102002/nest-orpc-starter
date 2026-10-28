import { Spin } from "antd";

export default function Loader() {
	return (
		<div className="grid min-h-screen place-items-center bg-white">
			<Spin size="medium" />
		</div>
	);
}
