import { contract } from "@app/api-contract";
import { Controller, Get } from "@nestjs/common";
import { Implement } from "@orpc/nest";

import { pub } from "@/lib/orpc/procedures";

@Controller()
export class HealthController {
	@Get()
	health() {
		return "OK";
	}

	@Implement(contract.healthCheck)
	healthCheck() {
		return pub.healthCheck.handler(() => "OK");
	}
}
