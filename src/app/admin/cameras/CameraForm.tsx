import type { Camera } from "@prisma/client";
import { CAMERA_STATUS, STREAM_TYPES } from "@/lib/constants";
import { Field, Select } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";

export default function CameraForm({ action, camera, customers }: { action: (fd: FormData) => Promise<void>; camera?: Partial<Camera>; customers: { id: string; name: string }[] }) {
  const c = camera ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {c.id && <input type="hidden" name="id" value={c.id} />}
      <Field label="Nome *"><input name="name" required defaultValue={c.name ?? ""} className="input" /></Field>
      <Field label="Cliente"><Select name="customerId" options={customers.map((x) => [x.id, x.name] as [string, string])} defaultValue={c.customerId} includeEmpty="— Horus (sem cliente) —" /></Field>
      <Field label="Local"><input name="location" defaultValue={c.location ?? ""} placeholder="ex.: Portaria principal" className="input" /></Field>
      <Field label="Status"><Select name="status" options={CAMERA_STATUS} defaultValue={c.status ?? "ONLINE"} /></Field>
      <Field label="Tipo de stream"><Select name="streamType" options={STREAM_TYPES} defaultValue={c.streamType ?? "HLS"} /></Field>
      <Field label="URL do stream"><input name="streamUrl" defaultValue={c.streamUrl ?? ""} placeholder="https://.../index.m3u8" className="input" /></Field>
      <Field label="Imagem de capa (URL)"><input name="thumbnail" defaultValue={c.thumbnail ?? ""} className="input" /></Field>
      <Field label="Marca / modelo"><input name="brand" defaultValue={c.brand ?? ""} className="input" /></Field>
      <Field label="IP / identificação no NVR"><input name="ipAddress" defaultValue={c.ipAddress ?? ""} className="input" /></Field>
      <Field label="Descrição"><input name="description" defaultValue={c.description ?? ""} className="input" /></Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="isPublic" defaultChecked={c.isPublic ?? false} /> Exibir na vitrine pública do site (câmeras ao vivo)
      </label>
      <p className="text-xs text-slate-500 sm:col-span-2">
        Câmeras IP usam RTSP, que navegadores não reproduzem. Converta para HLS/WebRTC com um servidor de mídia (ex.: MediaMTX ou go2rtc) e informe aqui a URL gerada.
      </p>
      <div><SubmitButton>Salvar</SubmitButton></div>
    </form>
  );
}
