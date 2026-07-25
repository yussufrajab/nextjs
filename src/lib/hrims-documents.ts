/**
 * Helpers for classifying HRIMS RequestId 206 document responses.
 *
 * HRIMS returns document attachments with an `attachmentContent` field that
 * should hold the base64-encoded file. In practice the upstream can return
 * metadata (attachmentType, contentSize > 0) with an EMPTY
 * `attachmentContent`. That is an HRIMS-side content-delivery / token
 * permission issue, NOT "the employee has no documents". These helpers let
 * the fetch routes distinguish the two cases so admins get an actionable
 * message instead of a misleading "No documents found".
 */

export interface HrimsAttachment {
  attachmentType?: string;
  attachmentContent?: string;
  contentSize?: number;
  [key: string]: unknown;
}

export interface AttachmentClassification {
  total: number;
  /** Attachments that carry base64 content and can be stored. */
  withContent: HrimsAttachment[];
  /** Attachments whose metadata is present but content is empty/missing. */
  emptyContent: HrimsAttachment[];
}

/**
 * Split a list of HRIMS 206 attachments into those that carry base64 content
 * (storable) and those whose content is empty/missing (upstream issue).
 */
export function classifyAttachments(
  attachments: HrimsAttachment[] | null | undefined
): AttachmentClassification {
  const list = Array.isArray(attachments) ? attachments : [];
  const withContent: HrimsAttachment[] = [];
  const emptyContent: HrimsAttachment[] = [];

  for (const attachment of list) {
    const content =
      attachment && typeof attachment.attachmentContent === 'string'
        ? attachment.attachmentContent
        : '';
    if (content.length > 0) {
      withContent.push(attachment);
    } else {
      emptyContent.push(attachment);
    }
  }

  return { total: list.length, withContent, emptyContent };
}

/**
 * Stable error code for the upstream "metadata present, content empty"
 * condition, so the frontend and logs can distinguish it from a genuine
 * "no documents" result.
 */
export const HRIMS_EMPTY_CONTENT_ERROR_CODE = 'HRIMS_EMPTY_CONTENT';

/**
 * Actionable message surfaced to admins when HRIMS returns document
 * metadata with empty content. Explains that the documents exist but the
 * bytes were not delivered, and points at the HRIMS-side remediation.
 */
export const HRIMS_EMPTY_CONTENT_MESSAGE =
  'HRIMS returned document metadata but with empty content (contentSize > 0, attachmentContent empty). ' +
  'This is an HRIMS content-delivery or token-permission issue — the documents exist but the bytes were not delivered. ' +
  'Contact HRIMS support to restore RequestId 206 content delivery or verify the stakeholder API token permissions.';