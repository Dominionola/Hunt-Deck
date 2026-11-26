import { resumeParsedDataSchema, type ResumeParsedData } from "@/lib/validations/resume";
import { resumeFailureMessage } from "@/lib/resumeFailure";

export async function pollResumeJob(jobId: string, onProgress: (progress: number) => void): Promise<{ resumeId: string; parsedData: ResumeParsedData }> {
  for (let attempt = 0; attempt < 150; attempt++) {
    const response = await fetch(`/api/resumes/status?jobId=${encodeURIComponent(jobId)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error("Unable to check resume processing status.");
    if (data.status === "failed") throw new Error(resumeFailureMessage(data.errorCode));
    if (data.status === "completed") {
      if (typeof data.resumeId !== "string") throw new Error("Resume result is unavailable.");
      return { resumeId: data.resumeId, parsedData: resumeParsedDataSchema.parse(data.parsedData) };
    }
    onProgress(typeof data.progress === "number" ? data.progress : 0);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Resume processing is taking longer than expected. Please check back later.");
}
