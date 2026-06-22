import { IaLocalLabScreen } from "@/components/admin/IaLocalLabScreen";

export const dynamic = "force-dynamic";

/** Lab IA — solo canUseAiLab (no requiere superadmin). */
export default function IaLocalLabPage() {
  return <IaLocalLabScreen />;
}
