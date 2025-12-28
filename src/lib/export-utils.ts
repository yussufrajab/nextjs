'use client';

/**
 * Export Utilities - Dynamic Lazy Loading for Heavy Libraries
 *
 * This module provides dynamic import wrappers for heavy export libraries
 * (jsPDF and XLSX) to improve initial bundle size and page load performance.
 *
 * Benefits:
 * - jsPDF (~250KB gzipped) only loads when PDF export is triggered
 * - XLSX (~400KB gzipped) only loads when Excel export is triggered
 * - Total savings: ~650KB from initial bundle
 *
 * Usage:
 * ```typescript
 * const handleExportPDF = async () => {
 *   const jsPDF = await loadPdfExporter();
 *   const doc = new jsPDF();
 *   // ... use jsPDF as normal
 * };
 * ```
 */

/**
 * Dynamically loads jsPDF library with autotable plugin
 * @returns Promise<jsPDF constructor>
 * @throws Error if library fails to load
 */
export async function loadPdfExporter() {
  try {
    // Load jsPDF and autotable plugin in parallel
    const [jsPDFModule, autoTableModule] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    // jsPDF default export is the constructor
    return jsPDFModule.default;
  } catch (error) {
    console.error('Failed to load PDF exporter:', error);
    throw new Error('PDF export functionality is currently unavailable. Please try again.');
  }
}

/**
 * Dynamically loads XLSX library
 * @returns Promise<XLSX module>
 * @throws Error if library fails to load
 */
export async function loadExcelExporter() {
  try {
    const XLSXModule = await import('xlsx');

    // XLSX exports the entire module
    return XLSXModule;
  } catch (error) {
    console.error('Failed to load Excel exporter:', error);
    throw new Error('Excel export functionality is currently unavailable. Please try again.');
  }
}

/**
 * Type definitions for TypeScript support
 * These remain available at compile time without importing the actual libraries
 */
export type { jsPDF } from 'jspdf';
export type { WorkBook, WorkSheet } from 'xlsx';
