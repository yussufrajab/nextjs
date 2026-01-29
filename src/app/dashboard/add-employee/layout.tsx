import { headers } from 'next/headers';

// Force dynamic rendering for this route - never cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AddEmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Force headers to be read to make it dynamic
  await headers();

  return <>{children}</>;
}
