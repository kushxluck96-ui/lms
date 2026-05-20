'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // login request
      await login(email, password);

      // get saved user
      const stored = JSON.parse(localStorage.getItem('user') || '{}');

      // ROLE-BASED ROUTING
      if (stored.role === 'teacher') {
        router.push('/dashboard/teacher');

      } else if (stored.role === 'admin') {
        router.push('/dashboard/admin');

      } else if (stored.role === 'institute_admin') {
        router.push('/dashboard/institute');

      } else {
        router.push('/dashboard/student');
      }

    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">

      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎓</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900">Smart LMS</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

          </form>

          {/* Register link */}
          <p className="text-center text-gray-500 text-sm mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-indigo-600 font-medium hover:underline">
              Sign up
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}