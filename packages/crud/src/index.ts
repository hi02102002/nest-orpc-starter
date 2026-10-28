export {
	type CrudContract,
	createCrudContract,
	crudErrors,
} from "./contract";
export {
	type AnyResource,
	type AnyResources,
	defineResource,
	defineResources,
	type RelationConfig,
	type ResourceConfig,
	type SoftDeleteConfig,
} from "./define";
export type * from "./types";
export { MAX_RELATION_DEPTH } from "./types";
