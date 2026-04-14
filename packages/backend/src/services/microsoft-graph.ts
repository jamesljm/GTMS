import { config } from '../config';
import { AppError } from '../middleware/error';

interface TokenCache {
  accessToken: string;
  expiresAt: number; // unix ms
}

let tokenCache: TokenCache | null = null;

export async function getClientCredentialsToken(): Promise<string> {
  if (!config.MS_CLIENT_ID || !config.MS_TENANT_ID || !config.MS_CLIENT_SECRET) {
    throw new AppError(503, 'Microsoft 365 integration is not configured (missing MS_CLIENT_ID, MS_TENANT_ID, or MS_CLIENT_SECRET)');
  }

  // Return cached token if still valid (with 5 min buffer)
  if (tokenCache && tokenCache.expiresAt > Date.now() + 5 * 60 * 1000) {
    return tokenCache.accessToken;
  }

  const url = `https://login.microsoftonline.com/${config.MS_TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: config.MS_CLIENT_ID,
    client_secret: config.MS_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Failed to get MS token:', res.status, text);
    let detail = '';
    try { detail = ': ' + JSON.parse(text).error_description; } catch { detail = ': ' + text.substring(0, 200); }
    throw new AppError(502, 'Failed to authenticate with Microsoft 365' + detail);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return tokenCache.accessToken;
}

export interface M365User {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
  jobTitle: string | null;
  department: string | null;
  mobilePhone: string | null;
}

export async function fetchM365Users(): Promise<M365User[]> {
  const token = await getClientCredentialsToken();
  const allUsers: M365User[] = [];

  let url: string | null = 'https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,jobTitle,department,mobilePhone&$top=999&$filter=accountEnabled eq true';

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('MS Graph API error:', res.status, text);
      throw new AppError(502, 'Failed to fetch users from Microsoft 365');
    }

    const data = await res.json() as { value: M365User[]; '@odata.nextLink'?: string };
    const users: M365User[] = (data.value || []).filter(
      (u: M365User) => u.mail || (u.userPrincipalName && u.userPrincipalName.includes('@'))
    );
    allUsers.push(...users);

    url = data['@odata.nextLink'] || null;
  }

  return allUsers;
}
