import { Controller, Get } from "@nestjs/common";
import { Implement } from "@orpc/nest";
import { implement } from "@orpc/server";
import { contract } from "@petshop/api-contract";

@Controller()
export class HealthController {
	@Get()
	health() {
		return "OK";
	}

	@Implement(contract.healthCheck)
	healthCheck() {
		return implement(contract.healthCheck).handler(() => "OK");
	}
}
