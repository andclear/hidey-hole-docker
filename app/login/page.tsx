'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md shadow-lg rounded-xl overflow-hidden border-border/50">
        <CardHeader className="space-y-1 pb-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Lock className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center font-bold text-foreground">管理员登录</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            请输入管理员账号和密码以继续
          </CardDescription>
        </CardHeader>
        <form className="px-8 pb-6" onSubmit={handleLogin}>
          <CardContent className="space-y-6 px-0">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md text-center animate-fadeIn">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-base font-medium">账号</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-11 px-4 rounded-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-medium">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 px-4 rounded-md"
              />
            </div>
            <CardFooter className="px-0 pt-6">
              <Button type="submit" className="w-full h-11 text-base font-medium rounded-md transition-colors" disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </Button>
            </CardFooter>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
