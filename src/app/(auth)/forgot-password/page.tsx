import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Logo } from '@/components/icons/logo';
import { APP_NAME } from '@/lib/constants';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <Logo width={120} height={80} className="object-contain" />
          </div>
          <CardTitle className="text-3xl font-headline">{APP_NAME}</CardTitle>
          <CardDescription>
            Enter your username or email to receive a password reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-primary underline"
            >
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Civil Service Commission. All rights
        reserved.
      </footer>
    </div>
  );
}