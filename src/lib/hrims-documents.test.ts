import { describe, it, expect } from 'vitest';
import {
  classifyAttachments,
  HRIMS_EMPTY_CONTENT_ERROR_CODE,
  HRIMS_EMPTY_CONTENT_MESSAGE,
  type HrimsAttachment,
} from './hrims-documents';

describe('classifyAttachments', () => {
  it('returns empty classification for null/undefined/non-array input', () => {
    expect(classifyAttachments(null)).toEqual({
      total: 0,
      withContent: [],
      emptyContent: [],
    });
    expect(classifyAttachments(undefined)).toEqual({
      total: 0,
      withContent: [],
      emptyContent: [],
    });
    expect(classifyAttachments({} as any)).toEqual({
      total: 0,
      withContent: [],
      emptyContent: [],
    });
  });

  it('classifies attachments with base64 content as withContent', () => {
    const attachments: HrimsAttachment[] = [
      {
        attachmentType: 'Ardhilhali',
        attachmentContent: 'JVBERi0xLjcK',
        contentSize: 218221,
      },
      {
        attachmentType: 'Birth Certificate',
        attachmentContent: 'JVBERi0xLjcK',
        contentSize: 249909,
      },
    ];
    const result = classifyAttachments(attachments);
    expect(result.total).toBe(2);
    expect(result.withContent).toHaveLength(2);
    expect(result.emptyContent).toHaveLength(0);
  });

  it('classifies metadata-only attachments (empty content, contentSize > 0) as emptyContent', () => {
    // This is the live HRIMS regression shape: contentSize > 0 but attachmentContent === ""
    const attachments: HrimsAttachment[] = [
      {
        attachmentType: 'Ardhilhali',
        attachmentContent: '',
        contentSize: 218221,
      },
      {
        attachmentType: 'Employment Contract',
        attachmentContent: '',
        contentSize: 508859,
      },
    ];
    const result = classifyAttachments(attachments);
    expect(result.total).toBe(2);
    expect(result.withContent).toHaveLength(0);
    expect(result.emptyContent).toHaveLength(2);
  });

  it('handles a mixed batch (some with content, some empty)', () => {
    const attachments: HrimsAttachment[] = [
      { attachmentType: 'Ardhilhali', attachmentContent: 'JVBERi0xLjcK', contentSize: 100 },
      { attachmentType: 'Job Contract', attachmentContent: '', contentSize: 200 },
      { attachmentType: 'Birth Certificate', attachmentContent: undefined, contentSize: 300 },
    ];
    const result = classifyAttachments(attachments);
    expect(result.total).toBe(3);
    expect(result.withContent).toHaveLength(1);
    expect(result.emptyContent).toHaveLength(2);
  });

  it('treats missing attachmentContent field as empty content', () => {
    const attachments: HrimsAttachment[] = [
      { attachmentType: 'Ardhilhali', contentSize: 218221 } as HrimsAttachment,
    ];
    const result = classifyAttachments(attachments);
    expect(result.withContent).toHaveLength(0);
    expect(result.emptyContent).toHaveLength(1);
  });

  it('treats non-string attachmentContent as empty content', () => {
    const attachments: HrimsAttachment[] = [
      { attachmentType: 'Ardhilhali', attachmentContent: 123 as any, contentSize: 10 },
    ];
    const result = classifyAttachments(attachments);
    expect(result.withContent).toHaveLength(0);
    expect(result.emptyContent).toHaveLength(1);
  });
});

describe('HRIMS empty-content error constants', () => {
  it('exposes a stable error code for the upstream empty-content condition', () => {
    expect(HRIMS_EMPTY_CONTENT_ERROR_CODE).toBe('HRIMS_EMPTY_CONTENT');
  });

  it('exposes an actionable message that mentions HRIMS and content', () => {
    expect(HRIMS_EMPTY_CONTENT_MESSAGE).toMatch(/HRIMS/i);
    expect(HRIMS_EMPTY_CONTENT_MESSAGE).toMatch(/content/i);
    expect(HRIMS_EMPTY_CONTENT_MESSAGE.length).toBeGreaterThan(40);
  });
});