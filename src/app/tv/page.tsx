import { redirect } from "next/navigation";
import TVClient from "@/app/tv/tv-client";
import { getAuthSession } from "@/lib/auth";

export default async function TVPage() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/login");
  }

  return <TVClient />;
}
