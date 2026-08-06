import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full resize-y rounded-lg border border-input bg-white px-3 py-2.5 text-sm leading-6 shadow-[0_1px_2px_rgba(15,23,42,.04)] transition-[border-color,box-shadow,background-color] duration-150 outline-none placeholder:text-muted-foreground/80 hover:border-slate-300 focus-visible:border-violet-400 focus-visible:ring-3 focus-visible:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/10 md:text-sm dark:bg-input/20 dark:hover:border-white/20 dark:focus-visible:border-violet-400 dark:focus-visible:ring-violet-500/15 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
