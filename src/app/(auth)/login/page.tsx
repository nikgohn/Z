'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { 
  GoogleAuthProvider, 
  signInWithRedirect, 
  getRedirectResult, 
  onAuthStateChanged 
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { GoogleIcon, ZLogoIcon } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check for redirect result from Google
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          // If result and user exist, login was successful
          router.replace('/feed');
        }
        // If no result, we let onAuthStateChanged handle the state.
      })
      .catch((err) => {
        console.error("Error on redirect result:", err);
        setError(err.message || "An error occurred during login. Please try again.");
        setLoading(false);
      });

    // 2. Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If onAuthStateChanged confirms a user, redirect to feed.
        router.replace('/feed');
      } else {
        // If no user, show the login button.
        setLoading(false);
      }
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, [router]);

  const handleLogin = () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    // Forcing account selection to avoid caching issues
    provider.setCustomParameters({ prompt: 'select_account' }); 
    signInWithRedirect(auth, provider);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Проверяем статус авторизации...
      </div>
    );
  }

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
            disabled={loading}
          >
            <GoogleIcon className="mr-2 h-5 w-5" />
            Войти через Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
