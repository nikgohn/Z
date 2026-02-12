'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  onAuthStateChanged 
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { GoogleIcon, ZLogoIcon } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Этот слушатель - единственный источник правды о состоянии авторизации.
    // Он сработает, как только Firebase определит, есть ли пользователь.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Если пользователь есть, перенаправляем в ленту.
        router.replace('/feed');
      } else {
        // Если пользователя нет, можно безопасно показать кнопку входа.
        setLoading(false);
      }
    });

    // Очищаем слушатель при размонтировании компонента.
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async () => {
    setLoading(true); // Показываем загрузку, пока открыто всплывающее окно
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // После успешного входа onAuthStateChanged выше обработает перенаправление.
    } catch (error) {
      console.error("Ошибка входа через Google Popup:", error);
      // Если всплывающее окно закрыто или произошла другая ошибка, снова показываем кнопку входа.
      setLoading(false);
    }
  };

  // Пока проверяется состояние аутентификации, показываем сообщение о загрузке.
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Проверяем статус авторизации...</div>;
  }
  
  // Как только мы узнаем, что пользователь не вошел, показываем интерфейс входа.
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
        <CardContent>
          <Button
            variant="outline"
            className="w-full font-semibold"
            onClick={handleLogin}
          >
            <GoogleIcon className="mr-2 h-5 w-5" />
            Войти через Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
