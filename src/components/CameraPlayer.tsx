"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  streamType: string;
  streamUrl: string | null;
  thumbnail?: string | null;
  status?: string;
  title?: string;
  autoPlay?: boolean;
};

/** Player de câmera: HLS (hls.js), MJPEG, iframe (ex.: player do NVR/YouTube) ou snapshot atualizado */
export default function CameraPlayer({ streamType, streamUrl, thumbnail, status = "ONLINE", title, autoPlay = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (streamType !== "HLS" || !streamUrl || status !== "ONLINE") return;
    const video = videoRef.current;
    if (!video) return;
    let hls: import("hls.js").default | null = null;
    setError(null);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl; // Safari / iOS
    } else {
      import("hls.js").then(({ default: Hls }) => {
        if (!Hls.isSupported()) {
          setError("Navegador sem suporte a HLS");
          return;
        }
        hls = new Hls({ liveDurationInfinity: true });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) setError("Não foi possível carregar o vídeo");
        });
      });
    }
    return () => hls?.destroy();
  }, [streamType, streamUrl, status]);

  useEffect(() => {
    if (streamType !== "IMAGE") return;
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, [streamType]);

  const overlay = (msg: string) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-horus-950/80 text-center text-sm text-slate-200">
      <span className="text-3xl">📷</span>
      {msg}
    </div>
  );

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      {status === "ONLINE" && streamUrl && streamType === "HLS" && (
        <video ref={videoRef} className="h-full w-full object-contain" muted autoPlay={autoPlay} playsInline controls poster={thumbnail ?? undefined} />
      )}
      {status === "ONLINE" && streamUrl && streamType === "MJPEG" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={streamUrl} alt={title ?? "Câmera"} className="h-full w-full object-contain" onError={() => setError("Falha no stream MJPEG")} />
      )}
      {status === "ONLINE" && streamUrl && streamType === "IMAGE" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`${streamUrl}${streamUrl.includes("?") ? "&" : "?"}t=${tick}`} alt={title ?? "Câmera"} className="h-full w-full object-contain" />
      )}
      {status === "ONLINE" && streamUrl && streamType === "IFRAME" && (
        <iframe src={streamUrl} title={title ?? "Câmera"} className="h-full w-full" allow="autoplay; fullscreen" allowFullScreen />
      )}

      {status === "OFFLINE" && overlay("Câmera offline no momento")}
      {status === "MAINTENANCE" && overlay("Câmera em manutenção")}
      {status === "ONLINE" && !streamUrl && overlay("Stream não configurado")}
      {error && overlay(error)}

      {status === "ONLINE" && streamUrl && (
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> ao vivo
        </span>
      )}
      {title && <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{title}</span>}
    </div>
  );
}
