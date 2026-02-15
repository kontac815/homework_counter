import { redirect } from "next/navigation";
import LeaderboardClient from "@/app/leaderboard/leaderboard-client";
import { getAuthSession } from "@/lib/auth";

export default async function LeaderboardPage() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/login");
  }

  return <LeaderboardClient />;
}
