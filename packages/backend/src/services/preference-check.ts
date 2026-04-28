import { prisma } from '../prisma';

type EmailType = 'digest' | 'reminder' | 'overdue' | 'blocker';

const typeFieldMap: Record<EmailType, string> = {
  digest: 'emailDigestEnabled',
  reminder: 'emailRemindersEnabled',
  overdue: 'emailOverdueAlertsEnabled',
  blocker: 'emailBlockerAlertsEnabled',
};

/**
 * Check if an email should be sent to a user based on their preferences.
 * Returns true if no preference record exists (defaults to enabled).
 * Also checks quiet hours (MYT, UTC+8).
 */
export async function shouldSendEmail(userId: string, type: EmailType): Promise<boolean> {
  const pref = await prisma.userPreference.findUnique({ where: { userId } });

  // No preference record = all defaults (true)
  if (!pref) return true;

  // Check the specific toggle
  const field = typeFieldMap[type];
  if (!(pref as any)[field]) return false;

  // Check quiet hours
  if (pref.quietHoursStart && pref.quietHoursEnd) {
    const now = new Date();
    // Convert to MYT (UTC+8)
    const mytHours = (now.getUTCHours() + 8) % 24;
    const mytMinutes = now.getUTCMinutes();
    const currentTime = mytHours * 60 + mytMinutes;

    const [startH, startM] = pref.quietHoursStart.split(':').map(Number);
    const [endH, endM] = pref.quietHoursEnd.split(':').map(Number);
    const startTime = startH * 60 + startM;
    const endTime = endH * 60 + endM;

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (startTime > endTime) {
      if (currentTime >= startTime || currentTime < endTime) return false;
    } else {
      if (currentTime >= startTime && currentTime < endTime) return false;
    }
  }

  return true;
}
