import { describe, it, expect, vi } from 'vitest';
import {
  normalizeName,
  levenshtein,
  nameSimilarity,
  dobDayBounds,
  findFuzzyDuplicate,
  isWithinFileFuzzyDuplicate,
  DUPLICATE_NAME_SIMILARITY_THRESHOLD,
} from './employee-duplicate-detection';

describe('normalizeName', () => {
  it('lowercases, replaces punctuation with spaces, and collapses whitespace', () => {
    expect(normalizeName("Jane D. O'Brien")).toBe('jane d o brien');
    expect(normalizeName('  Mohammed   Ali  ')).toBe('mohammed ali');
    expect(normalizeName('Smith-Jones, Jr.')).toBe('smith jones jr');
  });
  it('returns empty string for null/undefined/empty', () => {
    expect(normalizeName(null)).toBe('');
    expect(normalizeName(undefined)).toBe('');
    expect(normalizeName('')).toBe('');
  });
});

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('jane doe', 'jane doe')).toBe(0);
  });
  it('returns the edit distance for one substitution', () => {
    expect(levenshtein('mohammed', 'mohammad')).toBe(1);
  });
  it('handles insertion/deletion', () => {
    expect(levenshtein('jane', 'janes')).toBe(1);
    expect(levenshtein('jane', 'jan')).toBe(1);
  });
  it('returns the length of the non-empty side when one is empty', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });
});

describe('nameSimilarity', () => {
  it('is 1 for identical normalized names', () => {
    expect(nameSimilarity('Jane D. Doe', 'jane d doe')).toBe(1);
  });
  it('flags single-transliteration-variant names above the threshold', () => {
    expect(nameSimilarity('Mohammed Ali', 'Mohammad Ali')).toBeGreaterThanOrEqual(
      DUPLICATE_NAME_SIMILARITY_THRESHOLD
    );
  });
  it('rejects unrelated names of similar length', () => {
    expect(nameSimilarity('Jane Doe', 'John Smith')).toBeLessThan(
      DUPLICATE_NAME_SIMILARITY_THRESHOLD
    );
  });
  it('flags apostrophe vs space variants above the threshold', () => {
    // "o brien" vs "obrien" — one space edit, still ≥ threshold → duplicate.
    expect(nameSimilarity("O'Brien", 'OBrien')).toBeGreaterThanOrEqual(
      DUPLICATE_NAME_SIMILARITY_THRESHOLD
    );
  });

  it('treats period-abbreviated vs full middle names as identical', () => {
    expect(nameSimilarity('Jane D. Doe', 'jane d doe')).toBe(1);
  });
});

describe('dobDayBounds', () => {
  it('builds a UTC [start-of-day, start-of-next-day) range', () => {
    const bounds = dobDayBounds('1990-01-15');
    expect(bounds).not.toBeNull();
    expect(bounds!.gte.toISOString()).toBe('1990-01-15T00:00:00.000Z');
    expect(bounds!.lt.toISOString()).toBe('1990-01-16T00:00:00.000Z');
  });
  it('returns null for unparseable input', () => {
    expect(dobDayBounds('not-a-date')).toBeNull();
    expect(dobDayBounds('')).toBeNull();
    expect(dobDayBounds(null)).toBeNull();
  });
});

describe('findFuzzyDuplicate', () => {
  function mockClient(rows: any[]) {
    return {
      employee: {
        findMany: vi.fn().mockResolvedValue(rows),
      },
    } as any;
  }
  function argsOf(client: any) {
    return (client.employee.findMany as any).mock.calls[0][0];
  }

  it('flags a same-DOB / same-institution / similar-name record as a duplicate', async () => {
    const client = mockClient([
      { id: 'e1', name: 'Mohammed Ali', zanId: '111' },
    ]);
    const res = await findFuzzyDuplicate(client, {
      name: 'Mohammad Ali',
      dateOfBirth: '1990-04-20',
      institutionId: 'inst-1',
    });
    expect(res.duplicate).toBe(true);
    expect(res.existing?.zanId).toBe('111');
    expect(res.similarity).toBeGreaterThanOrEqual(DUPLICATE_NAME_SIMILARITY_THRESHOLD);
  });

  it('returns no duplicate when the only candidate is below the threshold', async () => {
    const client = mockClient([{ id: 'e1', name: 'John Smith', zanId: '111' }]);
    const res = await findFuzzyDuplicate(client, {
      name: 'Jane Doe',
      dateOfBirth: '1990-04-20',
      institutionId: 'inst-1',
    });
    expect(res.duplicate).toBe(false);
  });

  it('returns no duplicate when the candidate is in a different institution', async () => {
    const client = mockClient([]); // query scoped to inst-1 returns nothing
    const res = await findFuzzyDuplicate(client, {
      name: 'Mohammed Ali',
      dateOfBirth: '1990-04-20',
      institutionId: 'inst-1',
    });
    expect(res.duplicate).toBe(false);
    expect(argsOf(client).where.institutionId).toBe('inst-1');
  });

  it('scopes the DB query by institutionId + DOB calendar-day range', async () => {
    const client = mockClient([]);
    await findFuzzyDuplicate(client, {
      name: 'Jane Doe',
      dateOfBirth: '1990-04-20',
      institutionId: 'inst-1',
    });
    const where = argsOf(client).where;
    expect(where.institutionId).toBe('inst-1');
    expect(where.dateOfBirth.gte.toISOString()).toBe('1990-04-20T00:00:00.000Z');
    expect(where.dateOfBirth.lt.toISOString()).toBe('1990-04-21T00:00:00.000Z');
  });

  it('returns no duplicate when a different-DOB candidate has a matching name', async () => {
    // Same name, different DOB calendar day → query (scoped to the row's DOB
    // day) returns nothing, so no false duplicate.
    const client = mockClient([]);
    const res = await findFuzzyDuplicate(client, {
      name: 'Jane Doe',
      dateOfBirth: '1990-04-20',
      institutionId: 'inst-1',
    });
    expect(res.duplicate).toBe(false);
  });

  it('picks the highest-similarity candidate when several match', async () => {
    const client = mockClient([
      { id: 'e1', name: 'Mohammad Ali', zanId: '111' }, // near-exact
      { id: 'e2', name: 'Mohmmed Ali', zanId: '222' },   // 2 edits
    ]);
    const res = await findFuzzyDuplicate(client, {
      name: 'Mohammed Ali',
      dateOfBirth: '1990-04-20',
      institutionId: 'inst-1',
    });
    expect(res.existing?.id).toBe('e1');
  });

  it('excludes the supplied excludeId from the candidate set', async () => {
    const client = mockClient([]);
    await findFuzzyDuplicate(client, {
      name: 'Jane Doe',
      dateOfBirth: '1990-04-20',
      institutionId: 'inst-1',
      excludeId: 'self-id',
    });
    expect(argsOf(client).where.NOT).toEqual({ id: 'self-id' });
  });

  it('skips the check (no duplicate) when institutionId is missing', async () => {
    const client = mockClient([]);
    const res = await findFuzzyDuplicate(client, {
      name: 'Jane Doe',
      dateOfBirth: '1990-04-20',
      institutionId: '',
    });
    expect(res.duplicate).toBe(false);
    expect((client.employee.findMany as any)).not.toHaveBeenCalled();
  });

  it('skips the check when dateOfBirth does not parse', async () => {
    const client = mockClient([]);
    const res = await findFuzzyDuplicate(client, {
      name: 'Jane Doe',
      dateOfBirth: 'garbage',
      institutionId: 'inst-1',
    });
    expect(res.duplicate).toBe(false);
    expect((client.employee.findMany as any)).not.toHaveBeenCalled();
  });
});

describe('isWithinFileFuzzyDuplicate', () => {
  it('flags a later row with the same DOB and a near-identical name', () => {
    const prior = [{ name: 'Mohammed Ali', dateOfBirth: '1990-04-20' }];
    const res = isWithinFileFuzzyDuplicate(
      { name: 'Mohammad Ali', dateOfBirth: '1990-04-20' },
      prior
    );
    expect(res.duplicate).toBe(true);
  });

  it('does not flag a row with the same name but a different DOB', () => {
    const prior = [{ name: 'Jane Doe', dateOfBirth: '1990-04-20' }];
    const res = isWithinFileFuzzyDuplicate(
      { name: 'Jane Doe', dateOfBirth: '1991-04-20' },
      prior
    );
    expect(res.duplicate).toBe(false);
  });

  it('does not flag a row with the same DOB but an unrelated name', () => {
    const prior = [{ name: 'Jane Doe', dateOfBirth: '1990-04-20' }];
    const res = isWithinFileFuzzyDuplicate(
      { name: 'John Smith', dateOfBirth: '1990-04-20' },
      prior
    );
    expect(res.duplicate).toBe(false);
  });

  it('ignores prior rows whose DOB does not parse', () => {
    const prior = [{ name: 'Jane Doe', dateOfBirth: 'bad' }];
    const res = isWithinFileFuzzyDuplicate(
      { name: 'Jane Doe', dateOfBirth: '1990-04-20' },
      prior
    );
    expect(res.duplicate).toBe(false);
  });
});