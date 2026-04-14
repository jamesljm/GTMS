"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const { login, loginWithMicrosoft } = useAuthStore();
  const router = useRouter();

  // Handle Microsoft redirect response on page load
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
      // Page will redirect — no code runs after this
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Microsoft sign-in failed");
      setMsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="ed@gtms.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>

          {process.env.NEXT_PUBLIC_MS_CLIENT_ID && (
            <div className="mt-6">
              <Separator />
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleMicrosoftLogin}
                  disabled={msLoading || loading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21" fill="none">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                  </svg>
                  {msLoading ? "Signing in..." : "Sign in with Microsoft"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
