import data from "@/data/roles/esco-en.json";
import { roleCatalogSchema } from "@/lib/validations/roleCatalog";
import { RoleCatalog } from "./catalogIndex";
export { RoleCatalog } from "./catalogIndex";
let catalog: RoleCatalog | undefined;
export function getRoleCatalog() { return catalog ??= new RoleCatalog(roleCatalogSchema.parse(data)); }
