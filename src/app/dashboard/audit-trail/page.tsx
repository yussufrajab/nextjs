'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuditTrailPage() {
  return (
    <div>
      <PageHeader title="Audit Trail" description="Track system activities and changes." />
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">The audit trail module is currently under development. This section will provide a log of all significant actions performed within the system.</p>
        </CardContent>
      </Card>
    </div>
  );
}
