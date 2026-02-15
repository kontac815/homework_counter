import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import LoginForm from "@/app/login/login-form";

export default async function LoginPage() {
  const session = await getAuthSession();
  if (session?.user) {
    redirect("/tv");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-white px-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold">先生ログイン</h2>
        <p className="mt-2 text-sm text-slate-600">提出物ポイント管理にログインします。</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
