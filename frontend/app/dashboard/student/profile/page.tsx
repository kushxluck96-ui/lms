'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ full_name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [msg, setMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      setForm({ full_name: user.full_name, email: user.email });
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [subRes, payRes] = await Promise.all([
        api.get('/payments/subscription'),
        api.get('/payments/history'),
      ]);
      setSubscription(subRes.data.subscription);
      setPayments(payRes.data.payments || []);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api.put('/auth/profile', { full_name: form.full_name });
      setMsg('✅ Profile updated successfully!');
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      stored.full_name = form.full_name;
      localStorage.setItem('user', JSON.stringify(stored));
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMsg('❌ Passwords do not match');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordMsg('❌ Password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    setPasswordMsg('');
    try {
      await api.put('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordMsg('✅ Password changed successfully!');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      setPasswordMsg(err.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const getDaysLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/student" className="text-gray-400 hover:text-gray-600 transition text-sm">
              ← Back
            </Link>
            <span className="text-lg font-bold text-gray-900">🎓 My Profile</span>
          </div>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500 transition">
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Profile header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user?.full_name}</h1>
              <p className="text-gray-500">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-xs font-medium capitalize">
                  {user?.role}
                </span>
                {subscription && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                    subscription.plan === 'demo'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {subscription.plan} plan
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
          {['profile', 'subscription', 'payments'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Edit profile */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Profile</h2>
              {msg && (
                <div className={`mb-4 p-3 rounded-xl text-sm ${
                  msg.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  {msg}
                </div>
              )}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>

            {/* Change password */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
              {passwordMsg && (
                <div className={`mb-4 p-3 rounded-xl text-sm ${
                  passwordMsg.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  {passwordMsg}
                </div>
              )}
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="bg-gray-800 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-900 transition disabled:opacity-50"
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>

            {/* Danger zone */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100">
              <h2 className="text-lg font-semibold text-red-600 mb-2">Sign Out</h2>
              <p className="text-gray-500 text-sm mb-4">Sign out of your account on this device.</p>
              <button
                onClick={logout}
                className="bg-red-500 text-white px-6 py-2 rounded-xl font-medium hover:bg-red-600 transition text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* SUBSCRIPTION TAB */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>
              {subscription ? (
                <div>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium mb-4 ${
                    subscription.plan === 'demo'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {subscription.plan === 'demo' ? '🆓' : '⭐'} {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-xs text-gray-500 mb-1">Status</div>
                      <div className={`font-semibold capitalize ${
                        subscription.status === 'active' ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {subscription.status}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-xs text-gray-500 mb-1">Started</div>
                      <div className="font-semibold text-gray-900">
                        {new Date(subscription.started_at).toLocaleDateString()}
                      </div>
                    </div>
                    {subscription.expires_at && (
                      <>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <div className="text-xs text-gray-500 mb-1">Expires</div>
                          <div className="font-semibold text-gray-900">
                            {new Date(subscription.expires_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <div className="text-xs text-gray-500 mb-1">Days remaining</div>
                          <div className={`font-semibold ${
                            getDaysLeft(subscription.expires_at) < 7 ? 'text-red-500' : 'text-green-600'
                          }`}>
                            {getDaysLeft(subscription.expires_at)} days
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {subscription.plan === 'demo' && (
                    <a
                      href="/dashboard/student/upgrade"
                      className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition"
                    >
                      🚀 Upgrade to Premium
                    </a>
                  )}

                  {subscription.plan !== 'demo' && subscription.expires_at && getDaysLeft(subscription.expires_at) < 7 && (
                    <a
                      href="/dashboard/student/upgrade"
                      className="inline-block bg-amber-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-600 transition"
                    >
                      ⚠️ Renew Subscription
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No subscription found</p>
              )}
            </div>
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
            </div>
            {payments.length === 0 ? (
              <div className="p-16 text-center">
                <div className="text-5xl mb-4">💳</div>
                <p className="text-gray-500">No payments yet</p>
                <a
                  href="/dashboard/student/upgrade"
                  className="inline-block mt-4 bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
                >
                  Upgrade Now
                </a>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                        payment.gateway === 'esewa' ? 'bg-green-500' :
                        payment.gateway === 'khalti' ? 'bg-purple-600' : 'bg-blue-500'
                      }`}>
                        {payment.gateway === 'esewa' ? 'eS' : payment.gateway === 'khalti' ? 'K' : 'S'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 capitalize">{payment.gateway} Payment</div>
                        <div className="text-gray-400 text-xs">
                          {new Date(payment.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="font-semibold text-gray-900">
                        NPR {parseFloat(payment.amount).toLocaleString()}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                        payment.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}