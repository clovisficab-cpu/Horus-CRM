import { createFileRoute } from '@tanstack/react-router';
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth';

export const Route = createFileRoute('/api/public/whatsapp/processar')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { processarPendentes } = await import('@/lib/whatsapp/bot.server');
        await processarPendentes();
        return Response.json({ ok: true });
      },
    },
  },
});
