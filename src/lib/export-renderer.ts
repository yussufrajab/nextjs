/**
 * Server-side export rendering (Req 12.2).
 *
 * Renders an already-authorized `ReportOutput` (produced by
 * `generateReport`) into a PDF or XLSX file on the server. The export
 * endpoint streams the resulting buffer to the client as a download — so the
 * export *act* (which rows are exported, in what format) is gated, audited,
 * and rate-limited server-side, not assembled in the browser from
 * already-fetched data.
 *
 * These libraries (jspdf, xlsx) are loaded only on this server path; the
 * client no longer imports them for the reports page.
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable'; // side-effect: registers jsPDF.autoTable
import * as XLSX from 'xlsx';
import type { ReportOutput } from '@/lib/report-generator';

// Augment jsPDF with autoTable (the plugin mutates the jsPDF prototype).
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

/**
 * Build the body rows + foot (totals) rows from a report, mirroring the
 * previous client-side rendering so the exported file is byte-for-byte
 * equivalent in structure.
 */
function buildTableRows(
  report: ReportOutput,
  reportType: string
): { body: any[][]; foot: any[][] } {
  const keys = report.dataKeys || [];
  const body = report.data.map((item) =>
    keys.map((k) => (item[k] !== undefined ? item[k] : ''))
  );

  const foot: any[][] = [];
  const totals = report.totals;
  if (totals) {
    if (reportType === 'confirmation' && totals.descriptionMale) {
      const emptyCells = Array(Math.max(0, keys.length - 2)).fill('');
      foot.push([totals.descriptionMale, ...emptyCells, totals.valueMale]);
      foot.push([totals.descriptionFemale, ...emptyCells, totals.valueFemale]);
      foot.push([totals.descriptionTotal, ...emptyCells, totals.valueTotal]);
    } else if (Object.keys(totals).length > 0) {
      const totalRow = keys.map((key, index) => {
        if (index === 0 && (totals.sn || totals.sno || totals.nam)) {
          return String(totals.sn || totals.sno || totals.nam);
        }
        return totals[key] !== undefined ? String(totals[key]) : '';
      });
      foot.push(totalRow);
    }
  }

  return { body, foot };
}

/** Filename slug for a report title (matches the old client-side convention). */
function fileNameBase(title: string): string {
  return (title || 'ripoti').replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

/**
 * Render the report to an XLSX workbook and return it as a Node Buffer.
 * Values are kept as-is (numbers stay numeric) to preserve the totals math.
 */
export function renderExcelBuffer(report: ReportOutput, reportType: string): Buffer {
  const { body, foot } = buildTableRows(report, reportType);
  const wsData: any[][] = [report.headers, ...body, ...foot];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ripoti');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/**
 * Render the report to a PDF (jsPDF + autoTable) and return it as a Node
 * Buffer. Text values are stringified for display.
 */
export function renderPdfBuffer(
  report: ReportOutput,
  reportType: string,
  opts: { fromDate?: string | null; toDate?: string | null; institutionName?: string | null } = {}
): Buffer {
  const { body, foot } = buildTableRows(report, reportType);

  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(18);
  doc.text(report.title || 'Ripoti', 14, 22);
  doc.setFontSize(10);
  doc.text(`Kipindi: ${opts.fromDate || 'N/A'} hadi ${opts.toDate || 'N/A'}`, 14, 30);
  if (opts.institutionName) {
    doc.text(`Taasisi: ${opts.institutionName}`, 14, 36);
  }

  const tableRows = body.map((row) => row.map((cell) => String(cell ?? '')));

  doc.autoTable({
    head: [report.headers],
    body: tableRows,
    foot: foot.length > 0 ? foot.map((row) => row.map((cell) => String(cell ?? ''))) : undefined,
    startY: 40,
    theme: 'grid',
    headStyles: { fillColor: [22, 160, 133] },
    footStyles: {
      fillColor: [211, 211, 211],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: { 0: { cellWidth: 'auto' } },
  });

  const ab = doc.output('arraybuffer');
  return Buffer.from(ab);
}

export { fileNameBase };