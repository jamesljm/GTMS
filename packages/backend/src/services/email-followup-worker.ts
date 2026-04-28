import { prisma } from '../prisma';
import { sendMailAsUser } from './microsoft-graph';
import { calculateNextRecurrenceDate } from './recurrence';

export async function processEmailFollowUps() {
  const now = new Date();

  const dueFollowUps = await prisma.taskEmailFollowUp.findMany({
    where: {
      isActive: true,
      nextSendDate: { lte: now },
    },
    include: {
      sender: { select: { id: true, microsoftId: true, name: true } },
      task: { select: { id: true, status: true, title: true } },
    },
  });

  let sentCount = 0;
  let failedCount = 0;

  for (const followUp of dueFollowUps) {
    try {
      // Skip if task is Done/Cancelled — deactivate follow-up
      if (followUp.task.status === 'Done' || followUp.task.status === 'Cancelled') {
        await prisma.taskEmailFollowUp.update({
          where: { id: followUp.id },
          data: { isActive: false, nextSendDate: null },
        });
        continue;
      }

      // Skip if sender has no microsoftId
      if (!followUp.sender.microsoftId) {
        await prisma.emailFollowUpLog.create({
          data: {
            followUpId: followUp.id,
            recipientEmails: followUp.recipientEmails,
            status: 'failed',
            errorMessage: 'Sender account is not linked to Microsoft 365',
          },
        });
        failedCount++;
        continue;
      }

      const recipients: string[] = JSON.parse(followUp.recipientEmails);

      const result = await sendMailAsUser({
        senderMicrosoftId: followUp.sender.microsoftId,
        toRecipients: recipients,
        subject: followUp.subject,
        htmlBody: followUp.body,
      });

      // Create send log
      await prisma.emailFollowUpLog.create({
        data: {
          followUpId: followUp.id,
          recipientEmails: followUp.recipientEmails,
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error || null,
        },
      });

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
      }

      // Update follow-up state
      if (followUp.recurrenceType) {
        // Recurring: compute next send date
        const newSendCount = followUp.sendCount + 1;
        const fakeTask = {
          recurrenceType: followUp.recurrenceType,
          recurrenceInterval: followUp.recurrenceInterval || 1,
          recurrenceDays: followUp.recurrenceDays || null,
          recurrenceStartDate: null,
          recurrenceEndDate: followUp.recurrenceEndDate,
          recurrenceCount: followUp.recurrenceCount,
          recurrenceOccurrences: newSendCount,
          nextRecurrenceDate: followUp.nextSendDate,
          dueDate: followUp.nextSendDate,
        };
        const nextDate = calculateNextRecurrenceDate(fakeTask);

        await prisma.taskEmailFollowUp.update({
          where: { id: followUp.id },
          data: {
            sendCount: newSendCount,
            nextSendDate: nextDate,
            isActive: nextDate !== null,
          },
        });
      } else {
        // One-time: deactivate
        await prisma.taskEmailFollowUp.update({
          where: { id: followUp.id },
          data: {
            sendCount: { increment: 1 },
            isActive: false,
            nextSendDate: null,
          },
        });
      }
    } catch (err) {
      console.error(`Failed to process email follow-up ${followUp.id}:`, err);
      failedCount++;
    }
  }

  console.log(`Email follow-ups: ${dueFollowUps.length} processed, ${sentCount} sent, ${failedCount} failed`);
}
