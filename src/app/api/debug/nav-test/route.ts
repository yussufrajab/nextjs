import { NextResponse } from 'next/server';
import { getNavItemsForRole } from '@/lib/navigation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hroItems = getNavItemsForRole('HRO');

  return NextResponse.json({
    success: true,
    data: {
      role: 'HRO',
      totalItems: hroItems.length,
      items: hroItems.map(item => ({
        title: item.title,
        href: item.href,
        hasChildren: !!item.children,
      })),
      hasAddEmployee: hroItems.some(item => item.title === 'Add Employee'),
      addEmployeeItem: hroItems.find(item => item.title === 'Add Employee'),
    }
  });
}
