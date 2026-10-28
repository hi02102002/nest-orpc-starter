import { Controller } from "@nestjs/common";
import { Implement } from "@orpc/nest";
import { implement } from "@orpc/server";
import { contract } from "@petshop/api-contract";

@Controller()
export class ApiController {
	@Implement(contract.healthCheck)
	healthCheck() {
		return implement(contract.healthCheck).handler(() => "OK");
	}

	@Implement(contract.privateData)
	privateData() {
		return implement(contract.privateData).handler(({ context, errors }) => {
			if (!context.session?.user) {
				throw errors.UNAUTHORIZED();
			}

			const { email, id, image, name } = context.session.user;

			return {
				message: "This is private",
				user: { email, id, image: image ?? null, name },
			};
		});
	}
}
