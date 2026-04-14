import { PublicClientApplication, Configuration } from "@azure/msal-browser";

let msalInstance: PublicClientApplication | null = null;

function getMsalInstance(): PublicClientApplication {
  if (msalInstance) return msalInstance;

  const clientId = process.env.NEXT_PUBLIC_MS_CLIENT_ID;
  const tenantId = process.env.NEXT_PUBLIC_MS_TENANT_ID;

  if (!clientId || !tenantId) {
    throw new Error("Microsoft SSO is not configured");
  }

  const config: Configuration = {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      redirectUri: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
    },
    cache: {
      cacheLocation: "sessionStorage",
    },
  };

  msalInstance = new PublicClientApplication(config);
  return msalInstance;
}

/** Redirect the full page to Microsoft login */
export async function msalRedirectLogin(): Promise<void> {
  const instance = getMsalInstance();
  await instance.initialize();
  await instance.loginRedirect({
    scopes: ["openid", "profile", "email"],
  });
}

/** Call on page load to handle the redirect response. Returns idToken if present. */
export async function handleMsalRedirect(): Promise<string | null> {
  const instance = getMsalInstance();
  await instance.initialize();
  const result = await instance.handleRedirectPromise();
  return result?.idToken ?? null;
}
