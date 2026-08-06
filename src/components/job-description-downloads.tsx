import { FileText } from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";

export function JobDescriptionDownloads({ jobId }: { jobId: string }) {
  return (
    <div aria-label="Download job description">
      <a
        href={`/api/jobs/${jobId}/export`}
        className={buttonVariants({ variant: "outline", className: "h-10 gap-2 px-3" })}
        title="Download as Markdown"
      >
        <FileText aria-hidden="true" /> Markdown
      </a>
    </div>
  );
}
