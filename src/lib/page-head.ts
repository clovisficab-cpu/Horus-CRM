export function equipeHead(title: string, description: string) {
  return { meta: [
    { title: `${title} — Equipe Horus` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Equipe Horus` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] };
}