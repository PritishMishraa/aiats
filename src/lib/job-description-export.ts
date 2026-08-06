import type { JobSpec } from "@/ai/schemas";

function cleanItems(items: string[]) {
  return items.filter(Boolean).map((item) => `- ${item}`);
}

export function jobDescriptionMarkdown(spec: JobSpec) {
  const location = [spec.location.city, spec.location.country].filter(Boolean).join(", ") || "Flexible";
  const details = [spec.department, spec.employmentType.replaceAll("_", " "), spec.workplaceType, location]
    .filter(Boolean)
    .join(" | ");
  const sections = [
    `# ${spec.title}`,
    details,
    "",
    "## About the role",
    spec.summary,
    "",
    "## What you'll do",
    ...cleanItems(spec.responsibilities),
    "",
    "## What we're looking for",
    ...cleanItems(spec.requiredQualifications),
  ];

  if (spec.preferredQualifications.length) {
    sections.push("", "## Nice to have", ...cleanItems(spec.preferredQualifications));
  }

  return `${sections.join("\n").trim()}\n`;
}
