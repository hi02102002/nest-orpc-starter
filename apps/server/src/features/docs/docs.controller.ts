import { contract } from "@app/api-contract";
import { Controller, Get } from "@nestjs/common";
import { OpenAPIGenerator } from "@orpc/openapi";

const generator = new OpenAPIGenerator();

@Controller()
export class DocsController {
	@Get("api/openapi.json")
	getOpenAPISpec() {
		return generator.generate(contract, {
			version: "3.1.0",
			base: {
				info: {
					title: "API",
					version: "1.0.0",
				},
				servers: [{ url: "/" }],
			},
		});
	}
}
