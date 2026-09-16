import logoUrl from "@/assets/knowly-logo.png";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  alt?: string;
};

/** The universal Knowly brand mark (shared with the desktop app icons). */
export function Logo({ className, alt = "Knowly" }: LogoProps) {
  return (
    <img
      src={logoUrl}
      alt={alt}
      width={128}
      height={128}
      className={cn("size-9 shrink-0 rounded-lg object-contain", className)}
    />
  );
}

export default Logo;
