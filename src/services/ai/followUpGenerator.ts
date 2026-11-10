/**
 * Hunt Deck — Application Follow-Up Content Generator
 * 
 * Implements PRD Module 13.3.2:
 *  - Follow-Up #1: Value-Add Check-In (<= 120 words with recent company news or technical hook)
 *  - Follow-Up #2: Graceful Final Touch (< 70 words, zero pressure)
 *  - Post-Interview Thank-You Note (personalized to conversation topics)
 *  - Multi-channel delivery: Email (with Subject), LinkedIn InMail (<= 300 chars), and mailto: URL
 */

export interface FollowUpGenerationContext {
  candidateName: string;
  candidateEmail?: string;
  companyName: string;
  roleTitle: string;
  contactName?: string;
  appliedDate?: string;
  recentCompanyNews?: string;
  technicalInsightHook?: string;
  portfolioUrl?: string;
  interviewTopicsDiscussed?: string[];
  interviewerRole?: string;
}

export interface GeneratedFollowUpDraft {
  type: "FOLLOW_UP_1" | "FOLLOW_UP_2" | "POST_INTERVIEW_THANK_YOU";
  subject: string;
  emailBody: string;
  inMailDraft: string;
  wordCount: number;
  characterCount: number;
  inMailCharacterCount: number;
  mailtoUrl: string;
}

/**
 * Generates Follow-Up #1: The Value-Add Check-In (<= 120 words)
 */
export function generateFollowUp1ValueAdd(
  context: FollowUpGenerationContext
): GeneratedFollowUpDraft {
  const recipient = context.contactName ? context.contactName.split(" ")[0] : "Team";
  const subject = `Following up: ${context.candidateName} — ${context.roleTitle}`;

  const valueHook = context.recentCompanyNews
    ? `I recently caught your team's update on ${context.recentCompanyNews} and was impressed by the execution.`
    : context.technicalInsightHook
    ? `Thinking through ${context.companyName}'s scaling roadmap, I put together some initial architectural thoughts around ${context.technicalInsightHook}.`
    : `Following up on my submission, I wanted to share a recent case study on distributed streaming systems that directly parallels ${context.companyName}'s core architecture.`;

  const portfolioRef = context.portfolioUrl
    ? ` (I documented a related open-source implementation here: ${context.portfolioUrl})`
    : "";

  const emailBody = `Hi ${recipient},

Hope your week is off to a great start.

I submitted my application for the ${context.roleTitle} role recently and wanted to share one quick thought. ${valueHook}${portfolioRef}

I'd welcome the opportunity to dive deeper with the team whenever timing aligns. No rush at all on your end.

Best regards,
${context.candidateName}`.trim();

  const words = emailBody.split(/\s+/).filter(Boolean);

  // InMail draft: strictly <= 300 characters
  const inMailRaw = `Hi ${recipient}, following up on my ${context.roleTitle} application. ${valueHook.split(".")[0]}. Would love to connect briefly if timing aligns! Best, ${context.candidateName}`;
  const inMailDraft = inMailRaw.length > 298 ? inMailRaw.substring(0, 295) + "..." : inMailRaw;

  const mailtoUrl = `mailto:${context.candidateEmail || ""}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(emailBody)}`;

  return {
    type: "FOLLOW_UP_1",
    subject,
    emailBody,
    inMailDraft,
    wordCount: words.length,
    characterCount: emailBody.length,
    inMailCharacterCount: inMailDraft.length,
    mailtoUrl,
  };
}

/**
 * Generates Follow-Up #2: The Graceful Final Touch (< 70 words, zero pressure)
 */
export function generateFollowUp2Graceful(
  context: FollowUpGenerationContext
): GeneratedFollowUpDraft {
  const recipient = context.contactName ? context.contactName.split(" ")[0] : "Team";
  const subject = `Closing the loop: ${context.candidateName} — ${context.roleTitle}`;

  const emailBody = `Hi ${recipient},

Hope you're having a productive week.

I know how busy hiring cycles get, so I wanted to send one last quick note regarding the ${context.roleTitle} role. If the team has already moved forward with another candidate, no problem at all.

I remain a huge admirer of what ${context.companyName} is building and would love to stay in touch for future opportunities.

Warmly,
${context.candidateName}`.trim();

  const words = emailBody.split(/\s+/).filter(Boolean);

  // InMail draft: strictly <= 300 characters
  const inMailRaw = `Hi ${recipient}, closing the loop on my ${context.roleTitle} application. If the role has moved forward, no problem at all! Still a big fan of ${context.companyName} and would love to stay connected for future opportunities. Best, ${context.candidateName}`;
  const inMailDraft = inMailRaw.length > 298 ? inMailRaw.substring(0, 295) + "..." : inMailRaw;

  const mailtoUrl = `mailto:${context.candidateEmail || ""}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(emailBody)}`;

  return {
    type: "FOLLOW_UP_2",
    subject,
    emailBody,
    inMailDraft,
    wordCount: words.length,
    characterCount: emailBody.length,
    inMailCharacterCount: inMailDraft.length,
    mailtoUrl,
  };
}

/**
 * Generates Post-Interview Thank-You Note (personalized to conversation topics)
 */
export function generatePostInterviewThankYou(
  context: FollowUpGenerationContext
): GeneratedFollowUpDraft {
  const recipient = context.contactName ? context.contactName.split(" ")[0] : "there";
  const subject = `Thank you — ${context.candidateName} / ${context.roleTitle} interview`;

  const discussionPoint =
    context.interviewTopicsDiscussed && context.interviewTopicsDiscussed.length > 0
      ? `I especially enjoyed our discussion regarding ${context.interviewTopicsDiscussed.join(" and ")}; it gave me fantastic insight into the challenges your engineering team tackles.`
      : `I really enjoyed hearing more about ${context.companyName}'s technical priorities and team culture.`;

  const emailBody = `Hi ${recipient},

Thank you for taking the time to speak with me today about the ${context.roleTitle} role.

${discussionPoint} Our conversation further confirmed my enthusiasm for the opportunity and the impact I could contribute to your roadmap.

Please let me know if there are any additional materials or code samples I can provide as your team evaluates next steps.

Best regards,
${context.candidateName}`.trim();

  const words = emailBody.split(/\s+/).filter(Boolean);

  // InMail draft: strictly <= 300 characters
  const inMailRaw = `Hi ${recipient}, thank you for taking the time to speak today! Loved our discussion around ${discussionPoint.split(";")[0].replace("I especially enjoyed our discussion regarding ", "")}. Excited about the ${context.roleTitle} role and happy to provide any extra details. Best, ${context.candidateName}`;
  const inMailDraft = inMailRaw.length > 298 ? inMailRaw.substring(0, 295) + "..." : inMailRaw;

  const mailtoUrl = `mailto:${context.candidateEmail || ""}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(emailBody)}`;

  return {
    type: "POST_INTERVIEW_THANK_YOU",
    subject,
    emailBody,
    inMailDraft,
    wordCount: words.length,
    characterCount: emailBody.length,
    inMailCharacterCount: inMailDraft.length,
    mailtoUrl,
  };
}

