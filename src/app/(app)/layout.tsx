import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { PushNotificationPrompt } from "@/components/push/PushNotificationPrompt";
import { PushSilenciadosProvider } from "@/components/push/PushSilenciadosProvider";
import { fetchPushPartidosSilenciadosIds } from "@/lib/push/partido-silenciado";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const silenciados = user
    ? await fetchPushPartidosSilenciadosIds(supabase, user.id)
    : [];

  return (
    <PushSilenciadosProvider initialIds={silenciados}>
      <PageViewTracker />
      <div className="min-h-full flex-1 bg-zinc-950 text-zinc-100">
        <div className="mx-auto min-h-full w-full max-w-lg pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
        <PushNotificationPrompt />
      </div>
    </PushSilenciadosProvider>
  );
}
