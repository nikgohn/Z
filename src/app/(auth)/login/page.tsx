'use client';

import { useEffect, useState } from 'react';
import { useAuth as useFirebaseAuth, useUser } from '@/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { GoogleIcon, ZLogoIcon } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const auth = useFirebaseAuth();
  const { user, isUserLoading } = useUser();

  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    // Redirect if user is already logged in and auth state is resolved
    if (!isUserLoading && user) {
      router.replace('/feed');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async () => {
    if (!auth) return;
    setIsSigningIn(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // The `useEffect` above will handle the redirect once `user` state updates.
    } catch (err: any) {
      console.error("Ошибка входа через Google Popup:", err);
      setError(err.message || "Ошибка входа. Попробуйте снова.");
      setIsSigningIn(false);
    }
  };

  // While checking auth state, or in the process of signing in, or if user object is present (pre-redirect)
  if (isUserLoading || isSigningIn || user) {
    return (
      <div className="flex h-screen items-center justify-center">
        Проверяем статус авторизации...
      </div>
    );
  }

  // If not loading and no user, render the login page.
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <ZLogoIcon className="w-14 h-14 text-primary" />
          </div>
          <CardTitle className="text-2xl">Добро пожаловать в Z</CardTitle>
          <CardDescription>Войдите, чтобы продолжить</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
             <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Ошибка входа</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            variant="outline"
            className="w-full font-semibold"
            onClick={handleLogin}
            disabled={isSigningIn}
          >
            <GoogleIcon className="mr-2 h-5 w-5" />
            Войти через Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
