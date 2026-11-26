export function syntheticResumePdf(suffix = "verification") {
  return pdfLines([`Synthetic Candidate - TypeScript Engineer - Example Test Company - ${suffix}`]);
}

export function syntheticOnboardingPdf() {
  return pdfLines([
    "Morgan Synthetic", "morgan@example.invalid", "+1 202 555 0147", "Lagos, Nigeria",
    "Skills: Python, SQL, Docker",
    "Experience", "Data Engineer | Example Test Labs | Feb 2022 - Present",
    "Built 12 test pipelines.",
    "Education", "Example College | Bachelor of Science in Computer Science | 2021",
    "Projects", "Synthetic Data Tool - Generates test datasets. Technologies: Python, SQL",
  ]);
}

function pdfLines(lines: string[]) {
  const stream = `BT /F1 12 Tf 50 750 Td 18 TL ${lines.map((line, i) => `${i ? "T* " : ""}(${line.replace(/[\\()]/g, "\\$&")}) Tj`).join(" ")} ET`;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
