import { cn } from "@/lib/utils";

const LICENSE_URL = "https://creativecommons.org/licenses/by-nc-sa/4.0/";

export function CopyrightNotice({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      © {new Date().getFullYear()} Frederic Liam De Guzman. Knowly’s original materials are licensed
      under{" "}
      <a
        href={LICENSE_URL}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        CC BY-NC-SA 4.0
      </a>
      . Third-party materials are subject to their own licenses.
    </p>
  );
}
