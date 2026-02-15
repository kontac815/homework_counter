"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      loginId,
      password,
      redirect: false
    });

    setLoading(false);

    if (!result || result.error) {
      setError("ログインIDまたはパスワードが正しくありません。");
      return;
    }

    router.push("/tv");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="loginId">
          ログインID
        </label>
        <input
          id="loginId"
          type="text"
          value={loginId}
          onChange={(event) => setLoginId(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          required
          autoComplete="username"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="password">
          パスワード
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          required
          autoComplete="current-password"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {loading ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}
