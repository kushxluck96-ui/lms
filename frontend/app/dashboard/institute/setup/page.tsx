'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

export default function InstituteSetup() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/institutes', form);
      router.push('/dashboard/institute');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create institute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏫</div>
          <h1 className="text-3xl font-bold text-gray-900">Create Your Institute</h1>
          <p className="text-gray-500 mt-2">Set up your school, college, or coaching center</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Institute Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Kathmandu Science Academy"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Institute Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="info@yourinstitute.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="+977 9800000000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Kathmandu, Nepal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://yourinstitute.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : '🏫 Create Institute'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}