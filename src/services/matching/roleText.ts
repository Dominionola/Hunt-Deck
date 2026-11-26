export const normalizeRoleTitle = (title: string) => title.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
/** A comma can be part of a job title. */
export const parseRoleChoices = (value: string) => [...new Map(value.split(";")
  .map((title) => title.trim().replace(/\s+/g, " ")).filter(Boolean)
  .map((title) => [normalizeRoleTitle(title), title])).values()];
export const normalizeCatalogText = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
  .replace(/&/g, " and ").replace(/[^\p{L}\p{N}+#]+/gu, " ").replace(/\s+/g, " ").trim();
