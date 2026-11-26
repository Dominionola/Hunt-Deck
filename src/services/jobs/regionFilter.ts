import { Prisma } from "@prisma/client";
import type { RegionScope } from "@/lib/validations/job";

const US_PATTERN = "(^|[^a-zA-Z])(us|usa|u\\.s\\.|united states|north america|san francisco|new york|nyc|seattle|austin|boston|washington|dc)([^a-zA-Z]|$)";
const EMEA_PATTERN = "(^|[^a-zA-Z])(emea|europe|eu|uk|united kingdom|london|berlin|paris|amsterdam|africa|nigeria|lagos|port harcourt|kenya)([^a-zA-Z]|$)";

/**
 * Returns a raw SQL predicate for personalized pgvector job queries.
 */
export function buildRegionSqlClause(scope?: RegionScope): Prisma.Sql | null {
  if (!scope || scope === "ANY") return null;

  if (scope === "WORLDWIDE") {
    return Prisma.sql`(j."remoteType" = 'REMOTE_ONLY' AND (j.location IS NULL OR j.location ~* '^(remote|anywhere|worldwide|global)$' OR j.location !~* ${US_PATTERN}))`;
  }

  if (scope === "US") {
    return Prisma.sql`(j.location ~* ${US_PATTERN})`;
  }

  // EMEA: explicitly EMEA/Europe/Africa or unrestricted remote, excluding US-locked roles.
  return Prisma.sql`((j.location ~* ${EMEA_PATTERN} OR (j."remoteType" = 'REMOTE_ONLY' AND (j.location IS NULL OR j.location ~* '^(remote|anywhere|worldwide|global)$'))) AND (j.location IS NULL OR j.location !~* ${US_PATTERN}))`;
}

/**
 * Returns a Prisma `where` condition for chronological Recent listings queries.
 */
export function buildRegionPrismaWhere(scope?: RegionScope): Prisma.JobPostingWhereInput | null {
  if (!scope || scope === "ANY") return null;

  const usExcluded: Prisma.JobPostingWhereInput[] = [
    { location: { contains: "(US)", mode: "insensitive" } },
    { location: { contains: "United States", mode: "insensitive" } },
    { location: { contains: "USA", mode: "insensitive" } },
    { location: { contains: "US Only", mode: "insensitive" } },
  ];

  if (scope === "WORLDWIDE") {
    return {
      AND: [
        { remoteType: "REMOTE_ONLY" },
        { NOT: usExcluded },
      ],
    };
  }

  if (scope === "US") {
    return {
      OR: [
        { location: { contains: "(US)", mode: "insensitive" } },
        { location: { contains: "United States", mode: "insensitive" } },
        { location: { contains: "USA", mode: "insensitive" } },
        { location: { contains: "San Francisco", mode: "insensitive" } },
        { location: { contains: "New York", mode: "insensitive" } },
        { location: { contains: "DC", mode: "insensitive" } },
      ],
    };
  }

  return {
    AND: [
      {
        OR: [
          { location: { contains: "EMEA", mode: "insensitive" } },
          { location: { contains: "Europe", mode: "insensitive" } },
          { location: { contains: "UK", mode: "insensitive" } },
          { location: { contains: "London", mode: "insensitive" } },
          { location: { contains: "Nigeria", mode: "insensitive" } },
          { location: { contains: "Africa", mode: "insensitive" } },
          { remoteType: "REMOTE_ONLY" },
        ],
      },
      { NOT: usExcluded },
    ],
  };
}
