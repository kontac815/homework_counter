import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { todayYmdInTokyo } from "@/lib/time";
import ScanClient from "@/app/scan/scan-client";

export default async function ScanPage() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/login");
  }

  return <ScanClient today={todayYmdInTokyo()} userRole={session.user.role} />;
}
