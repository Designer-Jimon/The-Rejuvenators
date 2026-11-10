import { ImageIcon } from "lucide-react";
import { CHURCH_LOGO_PATH } from "@/lib/branding";
import { cn } from "@/lib/utils";

export function Logo({
  src = CHURCH_LOGO_PATH,
  alt = "",
  className,
  iconClassName,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-gradient text-cream",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-contain" />
      ) : (
        <ImageIcon
          className={cn("h-5 w-5", iconClassName)}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
