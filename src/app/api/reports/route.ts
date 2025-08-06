import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface ReportOutput {
  data: any[];
  headers: string[];
  title: string;
  totals?: any;
  dataKeys?: string[];
}

function formatReportData(reportType: string, rawData: any[]): ReportOutput {
  let headers: string[] = [];
  let title: string = '';
  let dataKeys: string[] = [];
  let formattedData: any[] = [];
  let totals: any = {};

  switch (reportType) {
    case 'confirmation':
      title = 'Ripoti ya Kuthibitishwa Kazini';
      headers = ['S/N', 'Jina la Mfanyakazi', 'ZAN ID', 'Jinsia', 'Taasisi', 'Tarehe ya Ombi', 'Hali', 'Mwenye Kuidhinisha'];
      dataKeys = ['sn', 'employeeName', 'zanId', 'gender', 'institution', 'requestDate', 'status', 'reviewer'];
      
      formattedData = rawData.map((item, index) => ({
        sn: index + 1,
        employeeName: item.employee?.name || '-',
        zanId: item.employee?.zanId || '-',
        gender: item.employee?.gender || '-',
        institution: item.employee?.institution?.name || '-',
        requestDate: new Date(item.createdAt).toLocaleDateString('sw-TZ'),
        status: item.status === 'APPROVED' ? 'Imeidhinishwa' : item.status === 'REJECTED' ? 'Imekataliwa' : 'Inasubiri',
        reviewer: item.reviewedBy?.name || '-'
      }));
      
      totals = {
        sn: 'JUMLA',
        employeeName: '',
        zanId: '',
        gender: '',
        institution: '',
        requestDate: '',
        status: formattedData.length,
        reviewer: ''
      };
      break;

    case 'promotion':
    case 'promotionExperience':
    case 'promotionEducation':
      title = reportType === 'promotionEducation' ? 'Ripoti ya Kupandishwa Cheo kwa Maendeleo ya Elimu' :
              reportType === 'promotionExperience' ? 'Ripoti ya Kupandishwa Cheo kwa Uzoefu' :
              'Ripoti ya Kupandishwa Cheo';
      headers = ['S/N', 'Jina la Mfanyakazi', 'ZAN ID', 'Jinsia', 'Taasisi', 'Kada ya Sasa', 'Kada Inayopendekezwa', 'Aina', 'Tarehe ya Ombi', 'Hali'];
      dataKeys = ['sn', 'employeeName', 'zanId', 'gender', 'institution', 'currentCadre', 'proposedCadre', 'promotionType', 'requestDate', 'status'];
      
      formattedData = rawData.map((item, index) => ({
        sn: index + 1,
        employeeName: item.employee?.name || '-',
        zanId: item.employee?.zanId || '-',
        gender: item.employee?.gender || '-',
        institution: item.employee?.institution?.name || '-',
        currentCadre: item.employee?.cadre || '-',
        proposedCadre: item.proposedCadre || '-',
        promotionType: item.promotionType === 'EDUCATION' ? 'Elimu' : 'Uzoefu',
        requestDate: new Date(item.createdAt).toLocaleDateString('sw-TZ'),
        status: item.status === 'APPROVED' ? 'Imeidhinishwa' : item.status === 'REJECTED' ? 'Imekataliwa' : 'Inasubiri'
      }));
      
      totals = {
        sn: 'JUMLA',
        employeeName: '',
        zanId: '',
        gender: '',
        institution: '',
        currentCadre: '',
        proposedCadre: '',
        promotionType: '',
        requestDate: '',
        status: formattedData.length
      };
      break;

    case 'lwop':
      title = 'Ripoti ya Likizo Bila Malipo';
      headers = ['S/N', 'Jina la Mfanyakazi', 'ZAN ID', 'Jinsia', 'Taasisi', 'Muda', 'Sababu', 'Tarehe ya Kuanza', 'Tarehe ya Kumaliza', 'Hali'];
      dataKeys = ['sn', 'employeeName', 'zanId', 'gender', 'institution', 'duration', 'reason', 'startDate', 'endDate', 'status'];
      
      formattedData = rawData.map((item, index) => ({
        sn: index + 1,
        employeeName: item.employee?.name || '-',
        zanId: item.employee?.zanId || '-',
        gender: item.employee?.gender || '-',
        institution: item.employee?.institution?.name || '-',
        duration: item.duration || '-',
        reason: item.reason || '-',
        startDate: item.startDate ? new Date(item.startDate).toLocaleDateString('sw-TZ') : '-',
        endDate: item.endDate ? new Date(item.endDate).toLocaleDateString('sw-TZ') : '-',
        status: item.status === 'APPROVED' ? 'Imeidhinishwa' : item.status === 'REJECTED' ? 'Imekataliwa' : 'Inasubiri'
      }));
      
      totals = {
        sn: 'JUMLA',
        employeeName: '',
        zanId: '',
        gender: '',
        institution: '',
        duration: '',
        reason: '',
        startDate: '',
        endDate: '',
        status: formattedData.length
      };
      break;

    case 'cadreChange':
      title = 'Ripoti ya Kubadilishwa Kada';
      headers = ['S/N', 'Jina la Mfanyakazi', 'ZAN ID', 'Jinsia', 'Taasisi', 'Kada ya Sasa', 'Kada Mpya', 'Sababu', 'Tarehe ya Ombi', 'Hali'];
      dataKeys = ['sn', 'employeeName', 'zanId', 'gender', 'institution', 'currentCadre', 'newCadre', 'reason', 'requestDate', 'status'];
      
      formattedData = rawData.map((item, index) => ({
        sn: index + 1,
        employeeName: item.employee?.name || '-',
        zanId: item.employee?.zanId || '-',
        gender: item.employee?.gender || '-',
        institution: item.employee?.institution?.name || '-',
        currentCadre: item.employee?.cadre || '-',
        newCadre: item.newCadre || '-',
        reason: item.reason || '-',
        requestDate: new Date(item.createdAt).toLocaleDateString('sw-TZ'),
        status: item.status === 'APPROVED' ? 'Imeidhinishwa' : item.status === 'REJECTED' ? 'Imekataliwa' : 'Inasubiri'
      }));
      
      totals = {
        sn: 'JUMLA',
        employeeName: '',
        zanId: '',
        gender: '',
        institution: '',
        currentCadre: '',
        newCadre: '',
        reason: '',
        requestDate: '',
        status: formattedData.length
      };
      break;

    case 'retirement':
    case 'voluntaryRetirement':
    case 'compulsoryRetirement':
    case 'illnessRetirement':
      title = reportType === 'voluntaryRetirement' ? 'Ripoti ya Kustaafu kwa Hiari' :
              reportType === 'compulsoryRetirement' ? 'Ripoti ya Kustaafu kwa Lazima' :
              reportType === 'illnessRetirement' ? 'Ripoti ya Kustaafu kwa Ugonjwa' :
              'Ripoti ya Kustaafu';
      headers = ['S/N', 'Jina la Mfanyakazi', 'ZAN ID', 'Jinsia', 'Taasisi', 'Aina ya Kustaafu', 'Tarehe ya Kustaafu', 'Tarehe ya Ombi', 'Hali'];
      dataKeys = ['sn', 'employeeName', 'zanId', 'gender', 'institution', 'retirementType', 'retirementDate', 'requestDate', 'status'];
      
      formattedData = rawData.map((item, index) => ({
        sn: index + 1,
        employeeName: item.employee?.name || '-',
        zanId: item.employee?.zanId || '-',
        gender: item.employee?.gender || '-',
        institution: item.employee?.institution?.name || '-',
        retirementType: item.retirementType === 'VOLUNTARY' ? 'Hiari' : 
                       item.retirementType === 'COMPULSORY' ? 'Lazima' : 
                       item.retirementType === 'ILLNESS' ? 'Ugonjwa' : '-',
        retirementDate: item.proposedDate ? new Date(item.proposedDate).toLocaleDateString('sw-TZ') : '-',
        requestDate: new Date(item.createdAt).toLocaleDateString('sw-TZ'),
        status: item.status === 'APPROVED' ? 'Imeidhinishwa' : item.status === 'REJECTED' ? 'Imekataliwa' : 'Inasubiri'
      }));
      
      totals = {
        sn: 'JUMLA',
        employeeName: '',
        zanId: '',
        gender: '',
        institution: '',
        retirementType: '',
        retirementDate: '',
        requestDate: '',
        status: formattedData.length
      };
      break;

    case 'resignation':
      title = 'Ripoti ya Kuacha Kazi';
      headers = ['S/N', 'Jina la Mfanyakazi', 'ZAN ID', 'Jinsia', 'Taasisi', 'Tarehe ya Kuacha', 'Sababu', 'Tarehe ya Ombi', 'Hali'];
      dataKeys = ['sn', 'employeeName', 'zanId', 'gender', 'institution', 'effectiveDate', 'reason', 'requestDate', 'status'];
      
      formattedData = rawData.map((item, index) => ({
        sn: index + 1,
        employeeName: item.employee?.name || '-',
        zanId: item.employee?.zanId || '-',
        gender: item.employee?.gender || '-',
        institution: item.employee?.institution?.name || '-',
        effectiveDate: item.effectiveDate ? new Date(item.effectiveDate).toLocaleDateString('sw-TZ') : '-',
        reason: item.reason || '-',
        requestDate: new Date(item.createdAt).toLocaleDateString('sw-TZ'),
        status: item.status === 'APPROVED' ? 'Imeidhinishwa' : item.status === 'REJECTED' ? 'Imekataliwa' : 'Inasubiri'
      }));
      
      totals = {
        sn: 'JUMLA',
        employeeName: '',
        zanId: '',
        gender: '',
        institution: '',
        effectiveDate: '',
        reason: '',
        requestDate: '',
        status: formattedData.length
      };
      break;

    case 'serviceExtension':
      title = 'Ripoti ya Nyongeza ya Utumishi';
      headers = ['S/N', 'Jina la Mfanyakazi', 'ZAN ID', 'Jinsia', 'Taasisi', 'Tarehe ya Sasa ya Kustaafu', 'Muda wa Nyongeza', 'Sababu', 'Tarehe ya Ombi', 'Hali'];
      dataKeys = ['sn', 'employeeName', 'zanId', 'gender', 'institution', 'currentRetirementDate', 'extensionPeriod', 'justification', 'requestDate', 'status'];
      
      formattedData = rawData.map((item, index) => ({
        sn: index + 1,
        employeeName: item.employee?.name || '-',
        zanId: item.employee?.zanId || '-',
        gender: item.employee?.gender || '-',
        institution: item.employee?.institution?.name || '-',
        currentRetirementDate: item.currentRetirementDate ? new Date(item.currentRetirementDate).toLocaleDateString('sw-TZ') : '-',
        extensionPeriod: item.requestedExtensionPeriod || '-',
        justification: item.justification || '-',
        requestDate: new Date(item.createdAt).toLocaleDateString('sw-TZ'),
        status: item.status === 'APPROVED' ? 'Imeidhinishwa' : item.status === 'REJECTED' ? 'Imekataliwa' : 'Inasubiri'
      }));
      
      totals = {
        sn: 'JUMLA',
        employeeName: '',
        zanId: '',
        gender: '',
        institution: '',
        currentRetirementDate: '',
        extensionPeriod: '',
        justification: '',
        requestDate: '',
        status: formattedData.length
      };
      break;

    case 'termination':
    case 'terminationDismissal':
      title = 'Ripoti ya Kufukuzwa/Kuachishwa Kazi';
      headers = ['S/N', 'Jina la Mfanyakazi', 'ZAN ID', 'Jinsia', 'Taasisi', 'Aina', 'Sababu', 'Tarehe ya Ombi', 'Hali'];
      dataKeys = ['sn', 'employeeName', 'zanId', 'gender', 'institution', 'type', 'reason', 'requestDate', 'status'];
      
      formattedData = rawData.map((item, index) => ({
        sn: index + 1,
        employeeName: item.employee?.name || '-',
        zanId: item.employee?.zanId || '-',
        gender: item.employee?.gender || '-',
        institution: item.employee?.institution?.name || '-',
        type: item.type === 'TERMINATION' ? 'Kuachishwa' : 'Kufukuzwa',
        reason: item.reason || '-',
        requestDate: new Date(item.createdAt).toLocaleDateString('sw-TZ'),
        status: item.status === 'APPROVED' ? 'Imeidhinishwa' : item.status === 'REJECTED' ? 'Imekataliwa' : 'Inasubiri'
      }));
      
      totals = {
        sn: 'JUMLA',
        employeeName: '',
        zanId: '',
        gender: '',
        institution: '',
        type: '',
        reason: '',
        requestDate: '',
        status: formattedData.length
      };
      break;

    case 'complaints':
      title = 'Ripoti ya Malalamiko';
      headers = ['S/N', 'Mlalamikaji', 'Jinsia', 'Aina ya Malalamiko', 'Maelezo', 'Tarehe', 'Hali'];
      dataKeys = ['sn', 'complainant', 'gender', 'complaintType', 'subject', 'date', 'status'];
      
      formattedData = rawData.map((item, index) => ({
        sn: index + 1,
        complainant: item.complainant?.name || '-',
        gender: '-', // Gender not available for Users in current schema
        complaintType: item.complaintType || '-',
        subject: item.subject || '-',
        date: new Date(item.createdAt).toLocaleDateString('sw-TZ'),
        status: item.status === 'RESOLVED' ? 'Imetatuliwa' : item.status === 'REJECTED' ? 'Imekataliwa' : 'Inasubiri'
      }));
      
      totals = {
        sn: 'JUMLA',
        complainant: '',
        gender: '',
        complaintType: '',
        subject: '',
        date: '',
        status: formattedData.length
      };
      break;

    case 'contractual':
      title = 'Ripoti ya Ajira za Mikataba';
      headers = ['S/N', 'Jina la Mfanyakazi', 'ZAN ID', 'Jinsia', 'Taasisi', 'Aina ya Mkataba', 'Tarehe ya Kuanza', 'Tarehe ya Kumaliza'];
      dataKeys = ['sn', 'employeeName', 'zanId', 'gender', 'institution', 'contractType', 'startDate', 'endDate'];
      
      formattedData = [];
      totals = {
        sn: 'JUMLA',
        employeeName: '',
        zanId: '',
        gender: '',
        institution: '',
        contractType: '',
        startDate: '',
        endDate: 0
      };
      break;

    default:
      title = 'Ripoti';
      headers = ['S/N', 'Jina', 'Jinsia', 'Tarehe', 'Hali'];
      dataKeys = ['sn', 'name', 'gender', 'date', 'status'];
      formattedData = rawData.map((item, index) => ({
        sn: index + 1,
        name: item.employee?.name || '-',
        gender: item.employee?.gender || '-',
        date: new Date(item.createdAt).toLocaleDateString('sw-TZ'),
        status: item.status || '-'
      }));
      totals = { sn: 'JUMLA', name: '', gender: '', date: '', status: formattedData.length };
  }

  return {
    data: formattedData,
    headers,
    title,
    totals,
    dataKeys
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('reportType');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const institutionId = searchParams.get('institutionId');

    console.log('Reports API called with:', { reportType, fromDate, toDate, institutionId });

    if (!reportType) {
      return NextResponse.json({ 
        success: false, 
        message: 'Report type is required' 
      }, { status: 400 });
    }

    // Build date filter
    let dateFilter: any = {};
    if (fromDate && toDate) {
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);
      // Set end date to end of day (23:59:59.999)
      endDate.setHours(23, 59, 59, 999);
      
      dateFilter.createdAt = {
        gte: startDate,
        lte: endDate
      };
    } else if (fromDate) {
      dateFilter.createdAt = {
        gte: new Date(fromDate)
      };
    } else if (toDate) {
      const endDate = new Date(toDate);
      // Set end date to end of day (23:59:59.999)
      endDate.setHours(23, 59, 59, 999);
      dateFilter.createdAt = {
        lte: endDate
      };
    }

    // Build institution filter
    let institutionFilter: any = {};
    if (institutionId) {
      institutionFilter.employee = {
        institutionId: institutionId
      };
    }

    // Combine filters
    const whereClause = {
      ...dateFilter,
      ...institutionFilter
    };

    let reportData: any[] = [];

    // Generate reports based on type
    switch (reportType) {
      case 'confirmation':
        reportData = await db.confirmationRequest.findMany({
          where: whereClause,
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                zanId: true,
                gender: true,
                cadre: true,
                institution: { select: { id: true, name: true } }
              }
            },
            submittedBy: { select: { id: true, name: true, username: true } },
            reviewedBy: { select: { id: true, name: true, username: true } }
          },
          orderBy: { createdAt: 'desc' }
        }).catch(() => []);
        break;

      case 'promotion':
      case 'promotionExperience':
      case 'promotionEducation':
        reportData = await db.promotionRequest.findMany({
          where: whereClause,
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                zanId: true,
                gender: true,
                cadre: true,
                institution: { select: { id: true, name: true } }
              }
            },
            submittedBy: { select: { id: true, name: true, username: true } },
            reviewedBy: { select: { id: true, name: true, username: true } }
          },
          orderBy: { createdAt: 'desc' }
        }).catch(() => []);
        break;

      case 'lwop':
        console.log('LWOP Query - whereClause:', JSON.stringify(whereClause, null, 2));
        reportData = await db.lwopRequest.findMany({
          where: whereClause,
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                zanId: true,
                gender: true,
                cadre: true,
                institution: { select: { id: true, name: true } }
              }
            },
            submittedBy: { select: { id: true, name: true, username: true } },
            reviewedBy: { select: { id: true, name: true, username: true } }
          },
          orderBy: { createdAt: 'desc' }
        }).catch((error) => {
          console.error('LWOP Query Error:', error);
          return [];
        });
        console.log('LWOP Query Results:', reportData.length, 'records found');
        console.log('LWOP Data Sample:', reportData.slice(0, 3).map(r => ({
          id: r.id,
          employeeName: r.employee?.name,
          employeeZanId: r.employee?.zanId,
          institutionId: r.employee?.institutionId,
          institutionName: r.employee?.institution?.name,
          createdAt: r.createdAt
        })));
        break;

      case 'cadreChange':
      case 'cadre-change':
        reportData = await db.cadreChangeRequest.findMany({
          where: whereClause,
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                zanId: true,
                gender: true,
                cadre: true,
                institution: { select: { id: true, name: true } }
              }
            },
            submittedBy: { select: { id: true, name: true, username: true } },
            reviewedBy: { select: { id: true, name: true, username: true } }
          },
          orderBy: { createdAt: 'desc' }
        }).catch(() => []);
        break;

      case 'retirement':
      case 'voluntaryRetirement':
      case 'compulsoryRetirement':
      case 'illnessRetirement':
        reportData = await db.retirementRequest.findMany({
          where: whereClause,
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                zanId: true,
                gender: true,
                cadre: true,
                institution: { select: { id: true, name: true } }
              }
            },
            submittedBy: { select: { id: true, name: true, username: true } },
            reviewedBy: { select: { id: true, name: true, username: true } }
          },
          orderBy: { createdAt: 'desc' }
        }).catch(() => []);
        break;

      case 'resignation':
        reportData = await db.resignationRequest.findMany({
          where: whereClause,
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                zanId: true,
                gender: true,
                cadre: true,
                institution: { select: { id: true, name: true } }
              }
            },
            submittedBy: { select: { id: true, name: true, username: true } },
            reviewedBy: { select: { id: true, name: true, username: true } }
          },
          orderBy: { createdAt: 'desc' }
        }).catch(() => []);
        break;

      case 'serviceExtension':
      case 'service-extension':
        reportData = await db.serviceExtensionRequest.findMany({
          where: whereClause,
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                zanId: true,
                gender: true,
                cadre: true,
                institution: { select: { id: true, name: true } }
              }
            },
            submittedBy: { select: { id: true, name: true, username: true } },
            reviewedBy: { select: { id: true, name: true, username: true } }
          },
          orderBy: { createdAt: 'desc' }
        }).catch(() => []);
        break;

      case 'termination':
      case 'terminationDismissal':
        reportData = await db.separationRequest.findMany({
          where: whereClause,
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                zanId: true,
                gender: true,
                cadre: true,
                institution: { select: { id: true, name: true } }
              }
            },
            submittedBy: { select: { id: true, name: true, username: true } },
            reviewedBy: { select: { id: true, name: true, username: true } }
          },
          orderBy: { createdAt: 'desc' }
        }).catch(() => []);
        break;

      case 'complaints':
        reportData = await db.complaint.findMany({
          where: {
            ...dateFilter,
            ...(institutionId && {
              complainant: {
                institutionId: institutionId
              }
            })
          },
          include: {
            complainant: {
              select: {
                id: true,
                name: true,
                institutionId: true,
                institution: { select: { id: true, name: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }).catch(() => []);
        break;

      case 'contractual':
        // For now, return empty array as contractual employment might need special handling
        reportData = [];
        break;

      case 'all':
        // Get all request types and combine them
        const [confirmations, promotions, lwops, cadreChanges, retirements, resignations, serviceExtensions, terminations] = await Promise.all([
          db.confirmationRequest.findMany({ where: whereClause, include: { employee: { select: { id: true, name: true, zanId: true, gender: true, cadre: true, institution: { select: { id: true, name: true } } } }, submittedBy: { select: { id: true, name: true, username: true } }, reviewedBy: { select: { id: true, name: true, username: true } } }, orderBy: { createdAt: 'desc' } }).catch(() => []),
          db.promotionRequest.findMany({ where: whereClause, include: { employee: { select: { id: true, name: true, zanId: true, gender: true, cadre: true, institution: { select: { id: true, name: true } } } }, submittedBy: { select: { id: true, name: true, username: true } }, reviewedBy: { select: { id: true, name: true, username: true } } }, orderBy: { createdAt: 'desc' } }).catch(() => []),
          db.lwopRequest.findMany({ where: whereClause, include: { employee: { select: { id: true, name: true, zanId: true, gender: true, cadre: true, institution: { select: { id: true, name: true } } } }, submittedBy: { select: { id: true, name: true, username: true } }, reviewedBy: { select: { id: true, name: true, username: true } } }, orderBy: { createdAt: 'desc' } }).catch(() => []),
          db.cadreChangeRequest.findMany({ where: whereClause, include: { employee: { select: { id: true, name: true, zanId: true, gender: true, cadre: true, institution: { select: { id: true, name: true } } } }, submittedBy: { select: { id: true, name: true, username: true } }, reviewedBy: { select: { id: true, name: true, username: true } } }, orderBy: { createdAt: 'desc' } }).catch(() => []),
          db.retirementRequest.findMany({ where: whereClause, include: { employee: { select: { id: true, name: true, zanId: true, gender: true, cadre: true, institution: { select: { id: true, name: true } } } }, submittedBy: { select: { id: true, name: true, username: true } }, reviewedBy: { select: { id: true, name: true, username: true } } }, orderBy: { createdAt: 'desc' } }).catch(() => []),
          db.resignationRequest.findMany({ where: whereClause, include: { employee: { select: { id: true, name: true, zanId: true, gender: true, cadre: true, institution: { select: { id: true, name: true } } } }, submittedBy: { select: { id: true, name: true, username: true } }, reviewedBy: { select: { id: true, name: true, username: true } } }, orderBy: { createdAt: 'desc' } }).catch(() => []),
          db.serviceExtensionRequest.findMany({ where: whereClause, include: { employee: { select: { id: true, name: true, zanId: true, gender: true, cadre: true, institution: { select: { id: true, name: true } } } }, submittedBy: { select: { id: true, name: true, username: true } }, reviewedBy: { select: { id: true, name: true, username: true } } }, orderBy: { createdAt: 'desc' } }).catch(() => []),
          db.separationRequest.findMany({ where: whereClause, include: { employee: { select: { id: true, name: true, zanId: true, gender: true, cadre: true, institution: { select: { id: true, name: true } } } }, submittedBy: { select: { id: true, name: true, username: true } }, reviewedBy: { select: { id: true, name: true, username: true } } }, orderBy: { createdAt: 'desc' } }).catch(() => [])
        ]);

        reportData = [
          ...confirmations.map(req => ({ ...req, requestType: 'Confirmation' })),
          ...promotions.map(req => ({ ...req, requestType: 'Promotion' })),
          ...lwops.map(req => ({ ...req, requestType: 'LWOP' })),
          ...cadreChanges.map(req => ({ ...req, requestType: 'Cadre Change' })),
          ...retirements.map(req => ({ ...req, requestType: 'Retirement' })),
          ...resignations.map(req => ({ ...req, requestType: 'Resignation' })),
          ...serviceExtensions.map(req => ({ ...req, requestType: 'Service Extension' })),
          ...terminations.map(req => ({ ...req, requestType: 'Termination' }))
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;

      default:
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid report type' 
        }, { status: 400 });
    }

    // Format the report based on type
    const formattedReport = formatReportData(reportType, reportData);
    
    return NextResponse.json({
      success: true,
      data: {
        ...formattedReport,
        reportType,
        filters: {
          fromDate,
          toDate,
          institutionId
        },
        count: reportData.length
      }
    });

  } catch (error) {
    console.error("[REPORTS_GET]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}