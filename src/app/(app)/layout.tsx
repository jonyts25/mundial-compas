import { PushNotificationPrompt } from "@/components/push/PushNotificationPrompt";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex-1 bg-zinc-950 text-zinc-100">
      <div className="mx-auto min-h-full w-full max-w-lg pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
      <PushNotificationPrompt />
    </div>
  );
}
