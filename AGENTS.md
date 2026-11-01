# Horus — notas para agentes

Projeto migrado da Lovable para desenvolvimento direto (Claude Code). Banco: Supabase próprio; hospedagem: Cloudflare Workers.
- Mudanças de banco: crie um novo arquivo em `drizzle/migrations/` e regenere `supabase/horus-setup.sql` apenas para instalações novas.
- IA: provedor compatível com OpenAI configurado por `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` (padrão Gemini) em `src/lib/ai/responses.server.ts`.
- Rode `npx tsc --noEmit`, `npx vitest run` e `npx vite build` antes de publicar.

- Keep `/portal` as an authenticated layout with an unconditional Outlet and separate index, camera, and finance leaf routes so all portal pages share their own header.
- Scope portal queries by authenticated user ID and explicit cliente_usuarios links, retaining database RLS as the security boundary, so private data and query caches stay isolated between accounts.
- Keep ticket AI calls in authenticated server functions with request-local Responses helpers; use user-scoped RLS reads before privileged summary writes so client ownership is verified.
- Store AI summaries in a staff-only companion table rather than client-readable ticket rows, because row-level policies cannot hide a single column.
- Persist terminal AI credit/access blocks in the private AI state table and do not automatically retry them, so reloads cannot replay denied work.
- Keep service-order forms shared between orders, client and ticket views; database triggers validate assignments and atomically record completion in the client timeline and linked ticket to prevent partial updates.
- Route all WhatsApp sends and inbound normalization through the provider module; Meta-specific credentials, Graph calls and signature checks stay server-only so a future adapter cannot bypass the neutral boundary.
- Persist inbound messages and bot jobs before acknowledgement; transactional action application and ticket-reply outbox prevent duplicate business actions, while uncertain sends and interrupted AI claims require review rather than automatic replay.
- Treat phone matching as routing, not authentication; WhatsApp AI may use linked client data internally but must not disclose private camera, billing or ticket details to an unverified sender.
