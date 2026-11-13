import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { z } from "zod";

const exportSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  targetRoleTitle: z.string().optional(),
  skills: z.array(z.string()).optional(),
  tailoredRoles: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      startDate: z.string(),
      endDate: z.string().optional(),
      isCurrent: z.boolean().optional(),
      bullets: z.array(
        z.union([
          z.string(),
          z.object({
            rewrittenBullet: z.string(),
          }),
        ])
      ),
    })
  ),
  format: z.enum(["html", "text", "markdown"]).default("html"),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const json = await request.json();
    const parsed = exportSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid resume export payload.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      fullName,
      email,
      phone,
      location,
      summary,
      targetRoleTitle,
      skills = [],
      tailoredRoles = [],
      format,
    } = parsed.data;

    // Normalize bullets to string[]
    const normalizedRoles = tailoredRoles.map((role) => ({
      ...role,
      bullets: role.bullets.map((b) => (typeof b === "string" ? b : b.rewrittenBullet)),
    }));

    const sanitizedBaseName = fullName.toLowerCase().replace(/[^a-z0-9]/g, "-");

    if (format === "text") {
      // 1. Plain Text Format (Single-column, universally parseable by legacy ATS)
      const lines: string[] = [];
      lines.push(fullName.toUpperCase());
      const contactBits = [location, phone, email].filter(Boolean);
      if (contactBits.length > 0) lines.push(contactBits.join(" | "));
      if (targetRoleTitle) lines.push(`TARGET ROLE: ${targetRoleTitle.toUpperCase()}`);
      lines.push("--------------------------------------------------");

      if (summary) {
        lines.push("\nPROFESSIONAL SUMMARY\n");
        lines.push(summary);
      }

      if (skills.length > 0) {
        lines.push("\nTECHNICAL SKILLS\n");
        lines.push(skills.join(", "));
      }

      if (normalizedRoles.length > 0) {
        lines.push("\nPROFESSIONAL EXPERIENCE\n");
        for (const role of normalizedRoles) {
          const dateRange = `${role.startDate} - ${role.isCurrent ? "Present" : role.endDate || "Present"}`;
          lines.push(`${role.title.toUpperCase()} | ${role.company}`);
          lines.push(dateRange);
          for (const b of role.bullets) {
            lines.push(`* ${b}`);
          }
          lines.push("");
        }
      }

      const textBody = lines.join("\n");
      return new NextResponse(textBody, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${sanitizedBaseName}-ats-resume.txt"`,
        },
      });
    }

    if (format === "markdown") {
      // 2. Markdown Format
      const lines: string[] = [];
      lines.push(`# ${fullName}\n`);
      const contactBits = [location, phone, email].filter(Boolean);
      if (contactBits.length > 0) lines.push(`**${contactBits.join(" • ")}**\n`);
      if (targetRoleTitle) lines.push(`*Target Role: ${targetRoleTitle}*\n`);

      if (summary) {
        lines.push(`## Professional Summary\n\n${summary}\n`);
      }

      if (skills.length > 0) {
        lines.push(`## Technical Skills\n\n${skills.join(", ")}\n`);
      }

      if (normalizedRoles.length > 0) {
        lines.push(`## Work Experience\n`);
        for (const role of normalizedRoles) {
          const dateRange = `${role.startDate} – ${role.isCurrent ? "Present" : role.endDate || "Present"}`;
          lines.push(`### ${role.title} — ${role.company}`);
          lines.push(`*${dateRange}*\n`);
          for (const b of role.bullets) {
            lines.push(`- ${b}`);
          }
          lines.push("");
        }
      }

      const mdBody = lines.join("\n");
      return new NextResponse(mdBody, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${sanitizedBaseName}-ats-resume.md"`,
        },
      });
    }

    // 3. Default: Pure ATS Single-Column HTML (with print layout)
    const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${fullName} — ATS Resume</title>
  <style>
    body {
      font-family: Arial, Calibri, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #000000;
      background: #FFFFFF;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
    }
    h1 {
      font-size: 20pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0 0 6px 0;
      text-align: center;
      letter-spacing: 0.5px;
    }
    .contact-line {
      text-align: center;
      font-size: 10pt;
      color: #222222;
      margin-bottom: 18px;
      border-bottom: 2px solid #000000;
      padding-bottom: 12px;
    }
    .target-title {
      text-align: center;
      font-size: 10pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #333333;
      margin-bottom: 4px;
    }
    h2 {
      font-size: 12pt;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 1px solid #000000;
      margin: 18px 0 8px 0;
      padding-bottom: 2px;
      letter-spacing: 0.5px;
    }
    .role-header {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      margin-top: 10px;
      font-size: 11pt;
    }
    .role-company {
      font-weight: normal;
      font-style: italic;
    }
    ul {
      margin: 6px 0 12px 18px;
      padding: 0;
    }
    li {
      margin-bottom: 4px;
      text-align: justify;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
        max-width: none;
      }
    }
  </style>
</head>
<body>
  <h1>${fullName}</h1>
  ${targetRoleTitle ? `<div class="target-title">Target Role: ${targetRoleTitle}</div>` : ""}
  <div class="contact-line">
    ${[location, phone, email].filter(Boolean).join(" &bull; ")}
  </div>

  ${summary ? `<h2>Professional Summary</h2><p>${summary}</p>` : ""}

  ${
    skills.length > 0
      ? `<h2>Technical Proficiencies</h2><p>${skills.join(", ")}</p>`
      : ""
  }

  ${
    normalizedRoles.length > 0
      ? `<h2>Professional Experience</h2>
    ${normalizedRoles
      .map(
        (role) => `
      <div class="role-header">
        <span><strong>${role.title}</strong>, <span class="role-company">${role.company}</span></span>
        <span>${role.startDate} – ${role.isCurrent ? "Present" : role.endDate || "Present"}</span>
      </div>
      <ul>
        ${role.bullets.map((b) => `<li>${b}</li>`).join("")}
      </ul>`
      )
      .join("")}`
      : ""
  }
</body>
</html>`;

    return new NextResponse(htmlBody, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${sanitizedBaseName}-ats-resume.html"`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to export resume.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

