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
  assignedLicenses?: Array<{ skuId: string }>;
}

// Fetch the tenant's SKU table once → returns a Map<skuId, skuPartNumber>.
export async function fetchM365LicenseMap(): Promise<Map<string, string>> {
  if (!config.MS_CLIENT_ID || !config.MS_TENANT_ID || !config.MS_CLIENT_SECRET) {
    return new Map();
  }
  try {
    const token = await getClientCredentialsToken();
    const res = await fetch(
      'https://graph.microsoft.com/v1.0/subscribedSkus?$select=skuId,skuPartNumber',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      console.error('Failed to fetch subscribedSkus:', res.status, await res.text());
      return new Map();
    }
    const data = await res.json() as { value: Array<{ skuId: string; skuPartNumber: string }> };
    return new Map(data.value.map(s => [s.skuId, s.skuPartNumber]));
  } catch (err) {
    console.error('fetchM365LicenseMap failed:', err);
    return new Map();
  }
}

export async function fetchM365Users(): Promise<M365User[]> {
  const token = await getClientCredentialsToken();
  const allUsers: M365User[] = [];

  let url: string | null = 'https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,jobTitle,department,mobilePhone,assignedLicenses&$top=999&$filter=accountEnabled eq true';

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('MS Graph API error:', res.status, text);
      let detail = '';
      try { const e = JSON.parse(text); detail = ': ' + (e.error?.message || text.substring(0, 200)); } catch { detail = ': ' + text.substring(0, 200); }
      throw new AppError(502, 'Failed to fetch users from Microsoft 365' + detail);
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

// Fetch a single M365 user by Microsoft Object ID — used during SSO login to sync dept/title
export async function fetchM365User(microsoftId: string): Promise<M365User | null> {
  if (!config.MS_CLIENT_ID || !config.MS_TENANT_ID || !config.MS_CLIENT_SECRET) {
    return null;
  }
  try {
    const token = await getClientCredentialsToken();
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${microsoftId}?$select=id,displayName,mail,userPrincipalName,jobTitle,department,mobilePhone`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    return await res.json() as M365User;
  } catch (err) {
    console.error('fetchM365User failed:', err);
    return null;
  }
}

export interface SendMailOptions {
  senderMicrosoftId: string;
  toRecipients: string[];
  subject: string;
  htmlBody: string;
}

export async function sendMail(toEmail: string, subject: string, htmlBody: string): Promise<{ success: boolean; error?: string }> {
  if (!config.M365_SENDER_EMAIL) {
    return { success: false, error: 'M365_SENDER_EMAIL not configured' };
  }
  return sendMailAsUser({
    senderMicrosoftId: config.M365_SENDER_EMAIL,
    toRecipients: [toEmail],
    subject,
    htmlBody,
  });
}

export async function sendMailAsUser(options: SendMailOptions): Promise<{ success: boolean; error?: string }> {
  const token = await getClientCredentialsToken();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${options.senderMicrosoftId}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject: options.subject,
          body: { contentType: 'HTML', content: options.htmlBody },
          toRecipients: options.toRecipients.map(email => ({
            emailAddress: { address: email },
          })),
        },
        saveToSentItems: true,
      }),
    }
  );

  if (res.status === 202 || res.ok) return { success: true };

  const text = await res.text();
  let detail = '';
  try { detail = JSON.parse(text).error?.message || text.substring(0, 300); } catch { detail = text.substring(0, 300); }
  console.error(`Graph sendMail failed for ${options.senderMicrosoftId}:`, res.status, detail);
  return { success: false, error: detail };
}
