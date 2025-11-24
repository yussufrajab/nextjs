import { EmployeeLoginForm } from '@/components/auth/employee-login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons/logo';
import { APP_NAME } from '@/lib/constants';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function EmployeeLoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16">
            <Logo />
          </div>
          <CardTitle className="text-3xl font-headline">{APP_NAME}</CardTitle>
          <CardDescription>Employee Portal - Sign in with your employee credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeLoginForm />
          <div className="mt-6 text-center">
            <Link href="/login">
              <Button variant="outline" size="sm">
                Staff Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Civil Service Commission. All rights reserved.
      </footer>
    </div>
  );
}