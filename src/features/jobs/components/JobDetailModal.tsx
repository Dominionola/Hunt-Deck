"use client";

import {
  RiBriefcaseLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiExternalLinkLine,
  RiMapPinLine,
  RiSparklingLine,
} from "@remixicon/react";
import { Chip } from "@/components/base/badges/chip";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/base/modal/modal";
import { CompatibilityRating } from "@/components/application/compatibility-rating/compatibility-rating";
import type { JobCardData } from "./JobCard";
import { CompanyContactsCard } from "./CompanyContactsCard";

interface JobDetailModalProps {
  job: JobCardData | null;
  onClose: () => void;
  onTailor: (job: JobCardData) => void;
}

export function JobDetailModal({ job, onClose, onTailor }: JobDetailModalProps) {
  const matchingSkills = job?.matchingSkills ?? [];
  const missingSkills = job?.missingSkills ?? [];

  return (
    <Modal
      isOpen={job !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="lg"
    >
      {job ? (
        <>
          <ModalHeader
            icon={RiBriefcaseLine}
            title={job.title}
            description={
              <span className="inline-flex flex-wrap items-center gap-2">
                <span>{job.company}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <RiMapPinLine className="size-3.5" aria-hidden="true" />
                  {job.location || "Remote"}
                </span>
                <span>·</span>
                <span>{job.atsPlatform} Board</span>
              </span>
            }
          />

          <ModalBody className="space-y-6">
            <CompatibilityRating
              variant="breakdown"
              score={job.fitScore}
              label="ATS match compatibility"
              unrankedLabel="Not scored"
              explanation="Weighted across skills (40%), experience (30%), title alignment (20%), and location (10%)."
              factors={
                job.fitBreakdown
                  ? [
                      { label: "Skills", value: job.fitBreakdown.skillsScore, weight: "40%" },
                      { label: "Experience", value: job.fitBreakdown.experienceScore, weight: "30%" },
                      { label: "Title", value: job.fitBreakdown.titleScore, weight: "20%" },
                      { label: "Location", value: job.fitBreakdown.locationScore, weight: "10%" },
                    ]
                  : undefined
              }
            />

            <div className="space-y-4">
              <h3 className="text-caption-1-semibold uppercase tracking-wider text-text-secondary">
                Keyword Gap Analysis
              </h3>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-caption-1-semibold text-status-lime-text">
                  <RiCheckLine className="size-4" aria-hidden="true" />
                  <span>Found in your resume ({matchingSkills.length})</span>
                </p>
                {matchingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {matchingSkills.map((skill) => (
                      <Chip key={skill} variant="caption" color="lime">
                        {skill}
                      </Chip>
                    ))}
                  </div>
                ) : (
                  <p className="text-body-2-regular text-text-tertiary">
                    No matched resume skills recorded for this posting yet.
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-caption-1-semibold text-status-yellow-text">
                  <RiErrorWarningLine className="size-4" aria-hidden="true" />
                  <span>Missing keywords to review ({missingSkills.length})</span>
                </p>
                {missingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {missingSkills.map((skill) => (
                      <Chip key={skill} variant="caption" color="yellow">
                        + {skill}
                      </Chip>
                    ))}
                  </div>
                ) : (
                  <p className="text-body-2-regular text-text-tertiary">
                    No missing keywords flagged.
                  </p>
                )}
              </div>
            </div>

            <CompanyContactsCard companyName={job.company} roleTitle={job.title} />
          </ModalBody>

          <ModalFooter className="sm:justify-between">
            <ButtonLink
              href={job.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="ghost"
              trailingIcon={RiExternalLinkLine}
              className="min-h-11"
            >
              View Original Posting
            </ButtonLink>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <Button type="button" variant="secondary" className="min-h-11" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                leadingIcon={RiSparklingLine}
                className="min-h-11"
                onClick={() => {
                  onClose();
                  onTailor(job);
                }}
              >
                Tailor Application
              </Button>
            </div>
          </ModalFooter>
        </>
      ) : null}
    </Modal>
  );
}
