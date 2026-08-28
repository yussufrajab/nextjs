'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table';
import { Loader2, FileDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ROLES } from '@/lib/constants';
import { isHroLike, isHrrpLike } from '@/lib/role-utils';
import { Pagination } from '@/components/shared/pagination';
import type { Institution } from '@/app/dashboard/admin/institutions/page';
import { apiClient } from '@/lib/api-client';
import { clientLogger } from '@/lib/logger-client';

const log = clientLogger.child({ component: 'reports' });

const REPORT_TYPES = [
  {
    value: 'serviceExtension',
    label: 'Ripoti ya Nyongeza ya Utumishi (Service Extension)',
  },
  { value: 'retirement', label: 'Ripoti ya Kustaafu (Retirement)' },
  { value: 'lwop', label: 'Ripoti ya Likizo Bila Malipo (Leave Without Pay)' },
  { value: 'promotion', label: 'Ripoti ya Kupandishwa Cheo (Promotion)' },
  {
    value: 'terminationDismissal',
    label: 'Ripoti ya Kufukuzwa/Kuachishwa Kazi (Termination/Dismissal)',
  },
  { value: 'complaints', label: 'Ripoti ya Malalamiko (Complaints)' },
  {
    value: 'cadreChange',
    label: 'Ripoti ya Kubadilishwa Kada (Change of Cadre)',
  },
  {
    value: 'resignation',
    label: 'Ripoti ya Kuacha Kazi (Employee Resignation)',
  },
  {
    value: 'confirmation',
    label: 'Ripoti ya Kuthibitishwa Kazini (Confirmation)',
  },
];

interface ReportOutput {
  data: any[];
  headers: string[];
  title: string;
  totals?: any;
  dataKeys?: string[];
}

const ALL_INSTITUTIONS_FILTER_VALUE = '__ALL_INSTITUTIONS__';

export default function ReportsPage() {
  const { user, role } = useAuth();
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportHeaders, setReportHeaders] = useState<string[]>([]);
  const [reportTitle, setReportTitle] = useState<string>('');
  const [reportTotals, setReportTotals] = useState<any>(null);
  const [reportDataKeys, setReportDataKeys] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [institutionFilter, setInstitutionFilter] = useState<string>('');
  const [availableInstitutions, setAvailableInstitutions] = useState<
    Institution[]
  >([]);

  const isHigherLevelUser = useMemo(
    () =>
      [
        ROLES.HHRMD,
        ROLES.HRMO,
        ROLES.DO,
        ROLES.PO,
        ROLES.CSCS,
        ROLES.ADMIN,
      ].includes(role as any),
    [role]
  );

  // Filter report types based on role - exclude complaints for HRO and HRRP
  const availableReportTypes = useMemo(() => {
    if (isHroLike(role) || isHrrpLike(role)) {
      return REPORT_TYPES.filter((rt) => rt.value !== 'complaints');
    }
    return REPORT_TYPES;
  }, [role]);

  useEffect(() => {
    const fetchInstitutions = async () => {
      log.info('Fetching institutions');
      try {
        const response = await apiClient.getInstitutions();
        log.info({ response }, 'Institutions response');
        if (response.success && Array.isArray(response.data)) {
          log.info({ count: response.data.length }, 'Setting institutions');
          setAvailableInstitutions(response.data);
        } else {
          log.info('Invalid institutions response, setting empty array');
          setAvailableInstitutions([]);
        }
      } catch (error) {
        log.error({ err: error }, 'Error fetching institutions');
        toast({
          title: 'Error',
          description: 'Could not load institutions for filter.',
          variant: 'destructive',
        });
        setAvailableInstitutions([]);
      }
    };
    fetchInstitutions();
  }, []);

  // Auto-set institution filter for HRO and HRRP roles
  useEffect(() => {
    if ((isHroLike(role) || isHrrpLike(role)) && user?.institutionId) {
      setInstitutionFilter(user.institutionId);
    }
  }, [role, user?.institutionId]);

  const handleGenerateReport = async () => {
    log.info({ selectedReportType, role, institutionId: user?.institutionId, institutionFilter, fromDate, toDate }, 'Starting report generation');

    if (!selectedReportType) {
      log.info('No report type selected');
      toast({
        title: 'Kosa',
        description: 'Tafadhali chagua aina ya ripoti.',
        variant: 'destructive',
      });
      return;
    }
    setIsGenerating(true);
    setReportData([]);
    setReportHeaders([]);
    setReportTitle('');
    setReportTotals(null);
    setReportDataKeys([]);
    setCurrentPage(1);

    try {
      const params = new URLSearchParams({
        reportType: selectedReportType,
      });
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (role) params.append('userRole', role);
      if (
        institutionFilter &&
        institutionFilter !== ALL_INSTITUTIONS_FILTER_VALUE
      ) {
        params.append('institutionId', institutionFilter);
      } else if ((isHroLike(role) || isHrrpLike(role)) && user?.institutionId) {
        params.append('institutionId', user.institutionId);
      }

      const apiUrl = `/reports?${params.toString()}`;
      log.info({ url: apiUrl }, 'Making API call');

      const response = await apiClient.get<ReportOutput>(apiUrl);
      log.info({ response }, 'API response');

      if (!response.success || !response.data) {
        log.info({ response }, 'API response failed');
        throw new Error(response.message || 'Failed to generate report.');
      }

      const result: ReportOutput = response.data;
      log.info({ result }, 'Processed result');

      setReportData(result.data || []);
      setReportHeaders(result.headers || []);
      setReportTitle(result.title || '');
      setReportTotals(result.totals || null);
      setReportDataKeys(result.dataKeys || []);

      log.info({ dataLength: (result.data || []).length, headers: result.headers, title: result.title }, 'Report data set');

      if ((result.data || []).length === 0) {
        toast({
          title: 'Ripoti Imetolewa',
          description: `Hakuna taarifa kwa ${result.title || 'ripoti hii'} katika vigezo ulivyochagua.`,
        });
      } else {
        toast({
          title: 'Ripoti Imetolewa',
          description: `${result.title || 'Ripoti'} imetolewa kikamilifu.`,
        });
      }
    } catch (error: any) {
      log.error({ err: error }, 'Report generation error');
      toast({
        title: 'Report Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // SECURITY (Req 12.2): exports are generated and authorized server-side.
  // The client POSTs the report parameters to /api/reports/export and
  // downloads the returned file — the export act is role-gated, rate-limited,
  // and audited on the server (REPORT_EXPORTED), and the data is re-queried
  // with the authenticated scope rather than trusted from the browser.
  const triggerServerExport = async (format: 'pdf' | 'xlsx') => {
    if (!selectedReportType) {
      toast({
        title: 'Kosa la Kuhamisha',
        description: 'Tafadhali chagua aina ya ripoti kwanza.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      const result = await apiClient.exportReport({
        reportType: selectedReportType,
        format,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        institutionId:
          institutionFilter && institutionFilter !== ALL_INSTITUTIONS_FILTER_VALUE
            ? institutionFilter
            : undefined,
      });

      if (!result.success || !result.blob) {
        if (result.code === 'RATE_LIMIT_EXCEEDED') {
          toast({
            title: 'Kosa la Kuhamisha',
            description: `Umejaribu kuhamisha mara nyingi sana. Tafadhali subiri sekunde ${result.retryAfter ?? 60} na ujaribu tena.`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Kosa la Kuhamisha',
            description: result.message || 'Imeshindwa kuhamisha ripoti.',
            variant: 'destructive',
          });
        }
        return;
      }

      // Trigger a browser download of the server-generated file.
      const url = window.URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName || `${selectedReportType}_report.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: format === 'pdf' ? 'PDF Imehamishwa' : 'Excel Imehamishwa',
        description:
          format === 'pdf'
            ? 'Ripoti imehamishwa kwenda PDF.'
            : 'Ripoti imehamishwa kwenda Excel.',
      });
    } catch (error) {
      log.error({ err: error, format }, 'Export error');
      toast({
        title: 'Kosa la Kuhamisha',
        description: 'Imeshindwa kuhamisha ripoti. Tafadhali jaribu tena.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportToPdf = () => triggerServerExport('pdf');

  const handleExportToExcel = () => triggerServerExport('xlsx');


  const totalPages = Math.ceil((reportData?.length || 0) / itemsPerPage);
  const paginatedData = (reportData || []).slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const renderTableFooter = () => {
    if (!reportTotals || !reportHeaders || reportHeaders.length === 0)
      return null;

    if (selectedReportType === 'confirmation' && reportTotals.descriptionMale) {
      return (
        <React.Fragment>
          <TableRow className="bg-secondary hover:bg-secondary/80 font-semibold">
            <TableCell
              colSpan={
                reportHeaders.findIndex((h) =>
                  h.toLowerCase().includes('jinsia')
                ) || 1
              }
            >
              {reportTotals.descriptionMale}
            </TableCell>
            <TableCell></TableCell>
            <TableCell
              colSpan={
                reportHeaders.length -
                (reportHeaders.findIndex((h) =>
                  h.toLowerCase().includes('jinsia')
                ) || 1) -
                1
              }
              className="text-right"
            >
              {reportTotals.valueMale}
            </TableCell>
          </TableRow>
          <TableRow className="bg-secondary hover:bg-secondary/80 font-semibold">
            <TableCell
              colSpan={
                reportHeaders.findIndex((h) =>
                  h.toLowerCase().includes('jinsia')
                ) || 1
              }
            >
              {reportTotals.descriptionFemale}
            </TableCell>
            <TableCell></TableCell>
            <TableCell
              colSpan={
                reportHeaders.length -
                (reportHeaders.findIndex((h) =>
                  h.toLowerCase().includes('jinsia')
                ) || 1) -
                1
              }
              className="text-right"
            >
              {reportTotals.valueFemale}
            </TableCell>
          </TableRow>
          <TableRow className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
            <TableCell
              colSpan={
                reportHeaders.findIndex((h) =>
                  h.toLowerCase().includes('jinsia')
                ) || 1
              }
            >
              {reportTotals.descriptionTotal}
            </TableCell>
            <TableCell></TableCell>
            <TableCell
              colSpan={
                reportHeaders.length -
                (reportHeaders.findIndex((h) =>
                  h.toLowerCase().includes('jinsia')
                ) || 1) -
                1
              }
              className="text-right"
            >
              {reportTotals.valueTotal}
            </TableCell>
          </TableRow>
        </React.Fragment>
      );
    }

    const totalRowCells: JSX.Element[] = [];
    let totalsRendered = false;
    reportHeaders.forEach((header, index) => {
      const key =
        (reportDataKeys || [])[index] ||
        header.toLowerCase().replace(/[^a-z0-9]/gi, '');
      const totalValue = reportTotals[key];

      if (totalValue !== undefined) {
        if (
          index === 0 &&
          (reportTotals.sn || reportTotals.sno || reportTotals.nam)
        ) {
          totalRowCells.push(
            <TableCell key={`${header}-total`} className="font-bold">
              {reportTotals.sn ||
                reportTotals.sno ||
                reportTotals.nam ||
                'JUMLA'}
            </TableCell>
          );
        } else {
          totalRowCells.push(
            <TableCell
              key={`${header}-total`}
              className="font-semibold text-right"
            >
              {totalValue}
            </TableCell>
          );
        }
        totalsRendered = true;
      } else if (
        index === 0 &&
        (reportTotals.sn || reportTotals.sno || reportTotals.nam)
      ) {
        totalRowCells.push(
          <TableCell key={`${header}-total-label`} className="font-bold">
            {reportTotals.sn || reportTotals.sno || reportTotals.nam}
          </TableCell>
        );
      } else {
        totalRowCells.push(
          <TableCell key={`${header}-total-empty`}></TableCell>
        );
      }
    });

    if (
      !totalsRendered &&
      Object.keys(reportTotals).length > 0 &&
      !reportTotals.sn &&
      !reportTotals.sno &&
      !reportTotals.nam
    ) {
      const firstKey = (reportDataKeys || [])[0];
      if (firstKey && totalRowCells[0]) {
        totalRowCells[0] = (
          <TableCell key={`${firstKey}-total-label`} className="font-bold">
            JUMLA
          </TableCell>
        );
      }
    }

    return (
      <TableRow className="bg-secondary hover:bg-secondary/80 font-semibold">
        {totalRowCells}
      </TableRow>
    );
  };

  return (
    <div>
      <PageHeader
        title="Ripoti na Takwimu"
        description="Toa na angalia ripoti za mfumo."
      />
      <Card className="mb-6 shadow-lg">
        <CardHeader>
          <CardTitle>Chagua Ripoti</CardTitle>
          <CardDescription>
            Chagua aina ya ripoti na vigezo vingine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1 lg:col-span-2">
              <Label htmlFor="reportType">Aina ya Ripoti</Label>
              <Select
                value={selectedReportType}
                onValueChange={setSelectedReportType}
              >
                <SelectTrigger id="reportType">
                  <SelectValue placeholder="Chagua aina ya ripoti" />
                </SelectTrigger>
                <SelectContent>
                  {availableReportTypes.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>
                      {rt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(isHigherLevelUser || isHroLike(role) || isHrrpLike(role)) && (
              <div className="space-y-1 lg:col-span-2">
                <Label htmlFor="institutionFilter">Taasisi / Wizara</Label>
                <Select
                  value={institutionFilter || (user?.institutionId || '')}
                  onValueChange={setInstitutionFilter}
                  disabled={isGenerating || isHroLike(role) || isHrrpLike(role)}
                >
                  <SelectTrigger id="institutionFilter">
                    <SelectValue placeholder="Chagua taasisi (si lazima)" />
                  </SelectTrigger>
                  <SelectContent>
                    {isHigherLevelUser && (
                      <SelectItem value={ALL_INSTITUTIONS_FILTER_VALUE}>
                        Taasisi Zote
                      </SelectItem>
                    )}
                    {availableInstitutions.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="fromDate">Kuanzia Tarehe</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                disabled={isGenerating}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="toDate">Hadi Tarehe</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                disabled={isGenerating}
              />
            </div>
          </div>
          <div className="pt-4">
            <Button onClick={handleGenerateReport} disabled={isGenerating}>
              {isGenerating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Toa Ripoti
            </Button>
          </div>
        </CardContent>
      </Card>

      {isGenerating && (
        <div className="flex items-center justify-center mt-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Inatayarisha ripoti...</p>
        </div>
      )}

      {!isGenerating && reportTitle && (
        <Card className="shadow-lg mt-6">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle>{reportTitle}</CardTitle>
              {fromDate && toDate && (
                <CardDescription>
                  Kipindi: {fromDate} hadi {toDate}
                </CardDescription>
              )}
            </div>
            {reportData && reportData.length > 0 && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportToPdf}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  Hamisha PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportToExcel}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  Hamisha Excel
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {reportData && reportData.length > 0 ? (
              <>
                <Table>
                  {fromDate && toDate && (
                    <TableCaption>
                      Ripoti ya {reportTitle.toLowerCase()} kuanzia {fromDate}{' '}
                      hadi {toDate}.
                    </TableCaption>
                  )}
                  <TableHeader>
                    <TableRow>
                      {reportHeaders.map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {(reportDataKeys || []).map((key) => (
                          <TableCell key={key}>{row[key]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {currentPage === totalPages &&
                      reportTotals &&
                      Object.keys(reportTotals).length > 0 &&
                      renderTableFooter()}
                  </TableBody>
                </Table>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={reportData?.length || 0}
                  itemsPerPage={itemsPerPage}
                />
              </>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Hakuna taarifa zilizopatikana kwa ripoti hii katika vigezo
                ulivyochagua.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
