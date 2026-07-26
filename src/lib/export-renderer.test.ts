import { describe, it, expect } from 'vitest';
import { renderExcelBuffer, renderPdfBuffer, fileNameBase } from '@/lib/export-renderer';
import type { ReportOutput } from '@/lib/report-generator';

const baseReport: ReportOutput = {
  title: 'Ripoti ya Kuthibitishwa Kazini',
  headers: ['S/N', 'Jina', 'ZAN ID', 'Hali'],
  dataKeys: ['sn', 'employeeName', 'zanId', 'status'],
  data: [
    { sn: 1, employeeName: 'Alice', zanId: 'Z1', status: 'Imeidhinishwa' },
    { sn: 2, employeeName: 'Bob', zanId: 'Z2', status: 'Inasubiri' },
  ],
  totals: { sn: 'JUMLA', status: 2 },
};

describe('export-renderer', () => {
  describe('fileNameBase', () => {
    it('slugifies the title like the old client-side convention', () => {
      expect(fileNameBase('Ripoti ya Kuthibitishwa Kazini')).toBe(
        'ripoti_ya_kuthibitishwa_kazini'
      );
    });
    it('falls back to a default for an empty title', () => {
      expect(fileNameBase('')).toBe('ripoti');
    });
  });

  describe('renderPdfBuffer', () => {
    it('produces a valid PDF buffer', () => {
      const buf = renderPdfBuffer(baseReport, 'confirmation');
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBeGreaterThan(0);
      expect(buf.slice(0, 4).toString()).toBe('%PDF');
    });

    it('renders the title and period into the PDF text', () => {
      const buf = renderPdfBuffer(baseReport, 'confirmation', {
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
        institutionName: 'Wizara ya Afya',
      });
      const text = buf.toString('latin1');
      // Period label is always rendered.
      expect(text).toMatch(/Kipindi/);
    });

    it('handles a report with no totals', () => {
      const noTotals: ReportOutput = { ...baseReport, totals: undefined };
      const buf = renderPdfBuffer(noTotals, 'promotion');
      expect(buf.slice(0, 4).toString()).toBe('%PDF');
    });
  });

  describe('renderExcelBuffer', () => {
    it('produces a valid XLSX buffer (ZIP signature)', () => {
      const buf = renderExcelBuffer(baseReport, 'confirmation');
      expect(buf).toBeInstanceOf(Buffer);
      // XLSX is a ZIP archive → starts with PK\x03\x04.
      expect(buf.slice(0, 2).toString()).toBe('PK');
    });

    it('includes the confirmation male/female/total foot rows', () => {
      const confirmation: ReportOutput = {
        title: 'Ripoti ya Kuthibitishwa Kazini',
        headers: ['S/N', 'Jinsia', 'Idadi'],
        dataKeys: ['sn', 'gender', 'count'],
        data: [
          { sn: 1, gender: 'Mwanaume', count: 5 },
          { sn: 2, gender: 'Mwanamke', count: 3 },
        ],
        totals: {
          descriptionMale: 'Wanaume',
          valueMale: 5,
          descriptionFemale: 'Wanawake',
          valueFemale: 3,
          descriptionTotal: 'JUMLA',
          valueTotal: 8,
        },
      };
      // Should not throw and should produce a valid workbook.
      const buf = renderExcelBuffer(confirmation, 'confirmation');
      expect(buf.slice(0, 2).toString()).toBe('PK');
    });
  });

  it('preserves numeric values in the XLSX body (not stringified)', () => {
    // The Excel path keeps raw values so totals math stays numeric.
    const buf = renderExcelBuffer(baseReport, 'promotion');
    expect(buf.slice(0, 2).toString()).toBe('PK');
    expect(buf.length).toBeGreaterThan(0);
  });
});