'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'teacher') router.push('/dashboard/teacher');
      else if (user.role === 'admin') router.push('/dashboard/admin');
      else router.push('/dashboard/student');
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <nav className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <span className="text-xl font-bold text-gray-900">Smart LMS</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 text-gray-600 hover:text-indigo-600 font-medium transition">
            Sign In
          </Link>
          <Link href="/register" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition">
            Get Started
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="inline-block px-4 py-2 bg-indigo-100 text-indigo-600 rounded-full text-sm font-medium mb-6">
          🚀 Nepal's smartest learning platform
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Learn Smarter,<br />
          <span className="text-indigo-600">Grow Faster</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Live classes, recorded courses, and progress tracking — all in one platform built for Nepal and beyond.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register" className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-semibold text-lg hover:bg-indigo-700 transition shadow-lg">
            Start for Free
          </Link>
          <Link href="/login" className="px-8 py-4 bg-white text-gray-700 rounded-2xl font-semibold text-lg hover:bg-gray-50 transition shadow-lg border border-gray-200">
            Sign In
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          {[
            { icon: '🎥', title: 'Live Classes', desc: 'Join daily live sessions with expert teachers via Google Meet' },
            { icon: '📚', title: 'Recorded Courses', desc: 'Learn at your own pace with structured video courses' },
            { icon: '📊', title: 'Track Progress', desc: 'Monitor your learning journey with detailed analytics' },
          ].map((feature) => (
            <div key={feature.title} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}