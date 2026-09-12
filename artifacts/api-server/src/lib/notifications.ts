import { randomUUID } from "node:crypto";
import { campusNotificationsTable, db } from "@workspace/db";

export type NotificationInput = {
  recipientUserId: string;
  eventKind: string;
  sourceKey: string;
  title: string;
  body: string;
  targetUrl?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function createNotificationOnce(input: NotificationInput) {
  const [notification] = await db
    .insert(campusNotificationsTable)
    .values({
      id: `notification-${randomUUID()}`,
      userId: input.recipientUserId,
      kind: input.eventKind,
      sourceKey: input.sourceKey,
      title: input.title,
      body: input.body,
      targetUrl: input.targetUrl ?? null,
      metadata: input.metadata ?? null,
    })
    .onConflictDoNothing({
      target: [
        campusNotificationsTable.userId,
        campusNotificationsTable.kind,
        campusNotificationsTable.sourceKey,
      ],
    })
    .returning();
  return notification ?? null;
}

export async function createNotificationsOnce(
  recipientUserIds: string[],
  input: Omit<NotificationInput, "recipientUserId">,
) {
  const recipients = [...new Set(recipientUserIds.filter(Boolean))];
  return Promise.all(
    recipients.map((recipientUserId) =>
      createNotificationOnce({ ...input, recipientUserId }),
    ),
  );
}
