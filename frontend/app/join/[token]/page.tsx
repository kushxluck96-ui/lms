'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

export default function JoinPage() {
  const { user, loading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(`/login?redirect=/join/${token}`);
      } else {
        acceptInvitation();
      }
    }
  }, [user, loading]);

  const acceptInvitation = async () => {
    try {
      const res = await api.post(`/institutes/join/${token}`);
      setStatus('success');
      setMessage(res.data.message);
      setTimeout(() => {
        if (res.data.role === 'teacher') router.push('/dashboard/teacher');
        else router.push('/dashboard/student');
      }, 2000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Invalid or expired invitation');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-12 text-center shadow-xl max-w-md w-full">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Joining institute...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome!</h2>
            <p className="text-gray-500">{message}</p>
            <p className="text-gray-400 text-sm mt-2">Redirecting to dashboard...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation Error</h2>
            <p className="text-gray-500">{message}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-medium"
            >
              Go Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}