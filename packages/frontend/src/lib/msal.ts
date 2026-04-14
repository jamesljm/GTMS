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
      redirectUri: typeof window !== "undefined" ? `${window.location.origin}/auth-redirect.html` : undefined,
    },
    cache: {
      cacheLocation: "sessionStorage",
    },
  };

  msalInstance = new PublicClientApplication(config);
  return msalInstance;
}

export async function msalLogin(): Promise<string> {
  const instance = getMsalInstance();
  await instance.initialize();

  const result = await instance.loginPopup({
    scopes: ["openid", "profile", "email"],
  });

  if (!result.idToken) {
    throw new Error("No ID token received from Microsoft");
  }

  return result.idToken;
}
