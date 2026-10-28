import { Controller } from "@nestjs/common";
import { Implement } from "@orpc/nest";
import { contract } from "@petshop/api-contract";

import { authed } from "@/lib/orpc/procedures";

@Controller()
export class PrivateDataController {
	@Implement(contract.privateData)
	privateData() {
		return authed.privateData.handler(({ context }) => {
			const { email, id, image, name } = context.session.user;

			return {
				message: "This is private",
				user: { email, id, image: image ?? null, name },
			};
		});
	}
}
