import { Inject, Injectable } from "@nestjs/common";
import { getDrizzleToken } from "@nestjs/drizzle";
import { type CrudResources, crudResources } from "@petshop/api-contract";
import { type CrudEngine, createCrudEngine } from "@petshop/crud/server";
import type { Database } from "@petshop/db";

import { type CrudContext, crudPolicies } from "./crud.policies";
import { crudTables } from "./crud.tables";

@Injectable()
export class CrudService {
	readonly engine: CrudEngine<CrudResources, CrudContext>;

	constructor(@Inject(getDrizzleToken()) db: Database) {
		this.engine = createCrudEngine({
			db,
			resources: crudResources,
			tables: crudTables,
			policies: crudPolicies,
		});
	}
}
