import eye from "@/assets/horus-eye.png";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img src={eye} alt="" width={40} height={40} className="h-9 w-9 object-contain" />
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-xl font-bold tracking-[0.18em] text-foreground">HORUS</div>
          <div className="mt-0.5 text-[0.6rem] font-semibold tracking-[0.2em] text-primary">
            videomonitoramento
          </div>
        </div>
      )}
    </div>
  );
}
