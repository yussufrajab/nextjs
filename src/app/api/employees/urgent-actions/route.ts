import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';

// Cache configuration
const CACHE_TTL = 300; // 5 minutes cache for urgent actions

export async function GET(req: Request) {
  try {
    const startTime = Date.now();
    const { searchParams } = new URL(req.url);
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');
    const countOnly = searchParams.get('countOnly') === 'true';

    // Server-side pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    console.log('Urgent actions API called with:', { userRole, userInstitutionId, countOnly, page, limit });

    // Get employees that need urgent actions
    const today = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    const threeYearsAgo = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());

    // Build base where clause for institution filtering
    const baseWhere: any = {};
    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      baseWhere.institutionId = userInstitutionId;
    }

    // ===== OPTIMIZATION: Use counts instead of loading all data =====
    if (countOnly) {
      console.log('Fetching counts only (optimized)...');

      // Parallel count queries for better performance
      const [nearingRetirementCount, probationOverdueCount] = await Promise.all([
        // Count employees approaching retirement
        db.Employee.count({
          where: {
            ...baseWhere,
            retirementDate: {
              lte: threeMonthsFromNow,
              gte: today
            }
          }
        }),
        // Count employees with overdue probation
        db.Employee.count({
          where: {
            ...baseWhere,
            status: { not: 'Confirmed' },
            employmentDate: { lte: threeYearsAgo }
          }
        })
      ]);

      console.log(`Urgent counts: ${nearingRetirementCount} retiring, ${probationOverdueCount} probation - completed in ${Date.now() - startTime}ms`);

      const headers = new Headers();
      headers.set('Cache-Control', `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}`);

      return NextResponse.json({
        success: true,
        data: {
          probationOverdue: Array(probationOverdueCount).fill(null),
          nearingRetirement: Array(nearingRetirementCount).fill(null)
        }
      }, { headers });
    }

    // ===== Full data fetch with server-side pagination =====
    console.log('Fetching paginated urgent employee data...');

    // Build where clauses for each type
    const probationWhere: any = {
      ...baseWhere,
      status: { not: 'Confirmed' },
      employmentDate: { lte: threeYearsAgo }
    };

    const retirementWhere: any = {
      ...baseWhere,
      retirementDate: {
        lte: threeMonthsFromNow,
        gte: today
      }
    };

    // Fetch counts and data in parallel
    const [probationCount, retirementCount, probationEmployees, retirementEmployees] = await Promise.all([
      db.Employee.count({ where: probationWhere }),
      db.Employee.count({ where: retirementWhere }),
      db.Employee.findMany({
        where: probationWhere,
        select: {
          id: true,
          name: true,
          zanId: true,
          status: true,
          employmentDate: true,
          dateOfBirth: true,
          retirementDate: true,
          institutionId: true,
          Institution: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit
      }),
      db.Employee.findMany({
        where: retirementWhere,
        select: {
          id: true,
          name: true,
          zanId: true,
          status: true,
          employmentDate: true,
          dateOfBirth: true,
          retirementDate: true,
          institutionId: true,
          Institution: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit
      })
    ]);

    console.log(`Fetched page ${page} - Probation: ${probationEmployees.length}/${probationCount}, Retirement: ${retirementEmployees.length}/${retirementCount} in ${Date.now() - startTime}ms`);

    const headers = new Headers();
    headers.set('Cache-Control', `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}`);

    return NextResponse.json({
      success: true,
      data: {
        probationOverdue: probationEmployees,
        nearingRetirement: retirementEmployees,
        pagination: {
          page,
          limit,
          totalProbation: probationCount,
          totalRetirement: retirementCount,
          totalPagesProbation: Math.ceil(probationCount / limit),
          totalPagesRetirement: Math.ceil(retirementCount / limit)
        }
      }
    }, { headers });

  } catch (error) {
    console.error("[URGENT_ACTIONS_GET]", error);
    return NextResponse.json({
      success: false,
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}