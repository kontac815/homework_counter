import { redirect } from "next/navigation";
import AdminClient from "@/app/admin/admin-client";
import { getAuthSession } from "@/lib/auth";
import { todayYmdInTokyo } from "@/lib/time";

export default async function AdminPage() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/login");
  }

  return <AdminClient today={todayYmdInTokyo()} userRole={session.user.role} />;
}
