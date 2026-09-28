export type WebhookEvent = 'published' | 'unpublished' | 'updated' | 'deleted';

export interface WebhookPayload {
  event: WebhookEvent;
  id: string;
  slug: string;
  previousSlug?: string;
  timestamp: string;
}
