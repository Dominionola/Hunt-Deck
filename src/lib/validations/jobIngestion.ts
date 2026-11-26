import { z } from "zod";

export const ingestionSourceSchema = z.object({
  platform: z.enum(["GREENHOUSE", "LEVER", "ASHBY"]),
  board: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/),
}).strict();
export const ingestionRequestSchema = z.object({
  sources: z.array(ingestionSourceSchema).min(1).max(5),
}).strict().transform(({ sources }) => ({ sources: [...new Map(sources.map((s) => [`${s.platform}:${s.board}`, s])).values()]
  .sort((a, b) => `${a.platform}:${a.board}`.localeCompare(`${b.platform}:${b.board}`)) }));
export const ingestionJobSchema = z.object({
  userId: z.string().min(1).max(100), sources: z.array(ingestionSourceSchema).min(1).max(5),
  scheduleId: z.string().uuid().optional(),
}).strict();
export const ingestionStatusQuerySchema = z.object({ jobId: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export const ingestionCountsSchema = z.object({ fetched: z.number().int().nonnegative(), selected: z.number().int().nonnegative(),
  saved: z.number().int().nonnegative(), failed: z.number().int().nonnegative(), embedded: z.number().int().nonnegative(),
  sourcesFailed: z.number().int().nonnegative(), incompleteSources: z.number().int().nonnegative().optional() });
export const ingestionCheckpointSchema = z.object({
  version: z.literal(1), sourceIndex: z.number().int().min(0).max(5),
  offset: z.number().int().min(0).max(1000).multipleOf(200),
  counts: ingestionCountsSchema, progress: z.number().int().min(0).max(99),
  observation: z.object({ runId: z.string().uuid(), generation: z.number().int().positive() }).strict().optional(),
}).strict();
export type IngestionSource = z.infer<typeof ingestionSourceSchema>;
export type IngestionJob = z.infer<typeof ingestionJobSchema>;
export type IngestionCounts = z.infer<typeof ingestionCountsSchema>;
