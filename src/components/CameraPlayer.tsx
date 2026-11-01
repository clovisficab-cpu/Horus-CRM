import { useEffect, useRef, useState } from "react";
import { VideoOff, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export type CameraLike = {
  nome: string;
  local?: string | null;
  tipo_stream: string;
  stream_url: string | null;
  imagem_capa?: string | null;
  status: string;
};

function HlsVideo({ url, poster }: { url: string; poster?: string | null | undefined }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let hls: { destroy: () => void } | null = null;
    let cancelled = false;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.play().catch(() => {});
    } else {
      import("hls.js").then(({ default: Hls }) => {
        if (cancelled || !Hls.isSupported()) return;
        const h = new Hls({ lowLatencyMode: true });
        h.loadSource(url);
        h.attachMedia(video);
        h.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hls = h;
      });
    }
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [url]);
  return (
    <video
      ref={ref}
      muted
      autoPlay
      playsInline
      loop
      poster={poster ?? undefined}
      className="h-full w-full object-cover"
    />
  );
}

function RefreshingImage({ url, alt }: { url: string; alt: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(i);
  }, []);
  const src = tick === 0 ? url : `${url}${url.includes("?") ? "&" : "?"}_t=${tick}`;
  return <img src={src} alt={alt} className="h-full w-full object-cover" />;
}

export function CameraPlayer({ camera, className }: { camera: CameraLike; className?: string }) {
  const streamUrl = camera.status === "online" ? camera.stream_url : null;
  const indisponivel = !streamUrl;
  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden rounded-xl border border-border bg-navy-deep shadow-card",
        className,
      )}
    >
      {!streamUrl ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
          {camera.imagem_capa && (
            <img src={camera.imagem_capa} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
          )}
          {camera.status === "manutencao" ? <Wrench className="h-8 w-8 text-warning" /> : <VideoOff className="h-8 w-8" />}
          <span className="relative text-sm font-medium">
            {camera.status === "manutencao" ? "Em manutenção" : "Câmera offline"}
          </span>
        </div>
      ) : camera.tipo_stream === "hls" ? (
        <HlsVideo url={streamUrl} poster={camera.imagem_capa} />
      ) : camera.tipo_stream === "iframe" ? (
        <iframe src={streamUrl} title={camera.nome} className="h-full w-full" allow="autoplay; fullscreen" />
      ) : camera.tipo_stream === "imagem" ? (
        <RefreshingImage url={streamUrl} alt={camera.nome} />
      ) : (
        <img src={streamUrl} alt={camera.nome} className="h-full w-full object-cover" />
      )}

      {!indisponivel && (
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-live px-2 py-1 text-[0.65rem] font-bold tracking-wider text-destructive-foreground">
          <span className="h-1.5 w-1.5 animate-live rounded-full bg-destructive-foreground" />
          AO VIVO
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-deep/90 to-transparent p-3">
        <div className="text-sm font-semibold text-foreground">{camera.nome}</div>
        {camera.local && <div className="text-xs text-muted-foreground">{camera.local}</div>}
      </div>
    </div>
  );
}
