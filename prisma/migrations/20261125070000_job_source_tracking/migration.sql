-- CreateTable
CREATE TABLE "job_sources" (
    "id" TEXT NOT NULL,
    "platform" "AtsPlatform" NOT NULL,
    "board" TEXT NOT NULL,
    "generation" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "job_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_source_runs" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "generation" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'collecting',
    "nextOffset" INTEGER NOT NULL DEFAULT 0,
    "invalidCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(6),

    CONSTRAINT "job_source_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_source_observations" (
    "runId" TEXT NOT NULL,
    "pass" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,

    CONSTRAINT "job_source_observations_pkey" PRIMARY KEY ("runId","pass","externalId")
);

-- CreateTable
CREATE TABLE "job_source_records" (
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "lastGeneration" INTEGER NOT NULL,
    "closedAt" TIMESTAMPTZ(6),

    CONSTRAINT "job_source_records_pkey" PRIMARY KEY ("sourceId","externalId")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_sources_platform_board_key" ON "job_sources"("platform", "board");

-- CreateIndex
CREATE INDEX "job_source_runs_sourceId_state_idx" ON "job_source_runs"("sourceId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "job_source_runs_sourceId_generation_key" ON "job_source_runs"("sourceId", "generation");

-- CreateIndex
CREATE INDEX "job_source_records_jobId_idx" ON "job_source_records"("jobId");

-- AddForeignKey
ALTER TABLE "job_source_runs" ADD CONSTRAINT "job_source_runs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "job_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_source_observations" ADD CONSTRAINT "job_source_observations_runId_fkey" FOREIGN KEY ("runId") REFERENCES "job_source_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_source_records" ADD CONSTRAINT "job_source_records_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "job_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_source_records" ADD CONSTRAINT "job_source_records_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job_postings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "job_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_source_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_source_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_source_observations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "job_sources", "job_source_runs", "job_source_records", "job_source_observations" FROM PUBLIC, anon, authenticated;

CREATE TABLE "job_source_schedules" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "platform" "AtsPlatform" NOT NULL,
  "board" TEXT NOT NULL,
  "approvedBy" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "nextRunAt" TIMESTAMPTZ(6) NOT NULL CHECK ("nextRunAt" = date_trunc('milliseconds', "nextRunAt")),
  "intervalHours" INTEGER NOT NULL DEFAULT 24 CHECK ("intervalHours" BETWEEN 24 AND 168),
  "reviewedAt" TIMESTAMPTZ(6) NOT NULL,
  UNIQUE ("platform", "board")
);
CREATE INDEX "job_source_schedules_enabled_nextRunAt_idx" ON "job_source_schedules" ("enabled", "nextRunAt");
ALTER TABLE "job_source_schedules" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "job_source_schedules" FROM PUBLIC, anon, authenticated;
