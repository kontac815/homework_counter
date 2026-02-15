import { redirect } from "next/navigation";
import TodayClient from "@/app/today/today-client";
import { getAuthSession } from "@/lib/auth";
import { todayYmdInTokyo } from "@/lib/time";

export default async function TodayPage() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/login");
  }

  return <TodayClient today={todayYmdInTokyo()} />;
}
