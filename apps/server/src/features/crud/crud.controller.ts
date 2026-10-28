import { contract } from "@app/api-contract";
import { Controller, Inject } from "@nestjs/common";
import { Implement } from "@orpc/nest";
import { useLogger } from "evlog/nestjs";

import { authed } from "@/lib/orpc/procedures";

import { CrudService } from "./crud.service";

function logCrud(operation: string, resource: string, count?: number) {
	useLogger().set({ crud: { operation, resource, count } });
}

@Controller()
export class CrudController {
	// Explicit token: tsx (esbuild) does not emit decorator metadata in dev.
	constructor(@Inject(CrudService) private readonly crudService: CrudService) {}

	@Implement(contract.crud.list)
	list() {
		return authed.crud.list.handler(async ({ input, context }) => {
			const result = await this.crudService.engine.list(input, context);
			logCrud("list", input.resource, result.items.length);
			return result;
		});
	}

	@Implement(contract.crud.get)
	get() {
		return authed.crud.get.handler(({ input, context }) => {
			logCrud("get", input.resource);
			return this.crudService.engine.get(input, context);
		});
	}

	@Implement(contract.crud.create)
	create() {
		return authed.crud.create.handler(({ input, context }) => {
			logCrud("create", input.resource);
			return this.crudService.engine.create(input, context);
		});
	}

	@Implement(contract.crud.update)
	update() {
		return authed.crud.update.handler(({ input, context }) => {
			logCrud("update", input.resource);
			return this.crudService.engine.update(input, context);
		});
	}

	@Implement(contract.crud.delete)
	delete() {
		return authed.crud.delete.handler(({ input, context }) => {
			logCrud("delete", input.resource);
			return this.crudService.engine.delete(input, context);
		});
	}

	@Implement(contract.crud.restore)
	restore() {
		return authed.crud.restore.handler(({ input, context }) => {
			logCrud("restore", input.resource);
			return this.crudService.engine.restore(input, context);
		});
	}

	@Implement(contract.crud.createMany)
	createMany() {
		return authed.crud.createMany.handler(async ({ input, context }) => {
			const result = await this.crudService.engine.createMany(input, context);
			logCrud("createMany", input.resource, result.items.length);
			return result;
		});
	}

	@Implement(contract.crud.updateMany)
	updateMany() {
		return authed.crud.updateMany.handler(async ({ input, context }) => {
			const result = await this.crudService.engine.updateMany(input, context);
			logCrud("updateMany", input.resource, result.ids.length);
			return result;
		});
	}

	@Implement(contract.crud.deleteMany)
	deleteMany() {
		return authed.crud.deleteMany.handler(async ({ input, context }) => {
			const result = await this.crudService.engine.deleteMany(input, context);
			logCrud("deleteMany", input.resource, result.ids.length);
			return result;
		});
	}
}
