"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [msLoading, setMsLoading] = useState(false);
  const { loginWithMicrosoft } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_MS_CLIENT_ID) return;

    let cancelled = false;
    (async () => {
      try {
        const { handleMsalRedirect } = await import("@/lib/msal");
        const idToken = await handleMsalRedirect();
        if (idToken && !cancelled) {
          setMsLoading(true);
          await loginWithMicrosoft(idToken);
          router.push("/dashboard");
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.response?.data?.error || err.message || "Microsoft sign-in failed");
          setMsLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [loginWithMicrosoft, router]);

  const handleMicrosoftLogin = async () => {
    setError("");
    setMsLoading(true);
    try {
      const { msalRedirectLogin } = await import("@/lib/msal");
      await msalRedirectLogin();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Microsoft sign-in failed");
      setMsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      {/* subtle ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,hsl(var(--primary)/0.07),transparent_70%)]" />

      <div className="login-rise relative w-full max-w-[26rem]">
        <div className="rounded-2xl border border-border/70 bg-card p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_40px_-12px_rgba(0,0,0,0.12)] sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <p className="mb-1.5 text-sm font-medium text-primary">Welcome back</p>
            <h1 className="font-display text-[1.75rem] font-bold leading-tight tracking-tight text-foreground">
              Sign in to GTMS
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Use your Geohan Microsoft account to continue.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="login-rise mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive"
            >
              <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
                <path d="M10 6v5M10 14h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={msLoading}
            className="group relative flex h-[3.25rem] w-full items-center justify-center gap-3 overflow-hidden rounded-xl border border-input bg-background px-4 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            {/* hover sheen */}
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

            {msLoading ? (
              <>
                <span className="login-spin h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-primary" />
                <span>Signing you in…</span>
              </>
            ) : (
              <>
                <svg className="h-[18px] w-[18px]" viewBox="0 0 21 21" fill="none" aria-hidden>
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                <span>Sign in with Microsoft</span>
              </>
            )}
          </button>

        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/80">
          © {new Date().getFullYear()} Geohan Corporation · All rights reserved
        </p>
      </div>
    </div>
  );
}
