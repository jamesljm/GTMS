"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">GTMS</CardTitle>
          <CardDescription>Geohan Task Management System</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm mb-4">
              {error}
            </div>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleMicrosoftLogin}
            disabled={msLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            {msLoading ? "Signing in..." : "Sign in with Microsoft"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
