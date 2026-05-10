'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  plan?: string;
  subscription_status?: string;
}

interface AttendanceRecord {
  id: string;
  student_name: string;
  student_email: string;
  session_title: string;
  scheduled_at: string;
  joined_at: string;
  left_at: string | null;
  duration_minutes: number;
  teacher_name: string;
}

interface Payment {
  id: string;
  full_name: string;
  email: string;
  amount: string;
  currency: string;
  gateway: string;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user?.role !== 'admin') router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchAttendance();
      fetchRevenue();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setFetching(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await api.get('/classes/all-attendance');
      setAttendance(res.data.attendance || []);
    } catch (err) {
      console.error('Fetch attendance error:', err);
    }
  };

  const fetchRevenue = async () => {
    try {
      const res = await api.get('/payments/admin/all');
      setPayments(res.data.payments || []);
      setTotalRevenue(res.data.total_revenue || 0);
    } catch (err) {
      console.error('Fetch revenue error:', err);
    }
  };

  const students = users.filter((u) => u.role === 'student');
  const teachers = users.filter((u) => u.role === 'teacher');
  const paid = users.filter((u) => u.plan === 'monthly' || u.plan === 'yearly');
  const totalMinutes = attendance.reduce((sum, r) => sum + (parseFloat(String(r.duration_minutes)) || 0), 0);

  const filteredAttendance = attendance.filter(r =>
    r.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.session_title?.toLowerCase().includes(search.toLowerCase()) ||
    r.student_email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <span className="text-xl font-bold text-gray-900">Smart LMS</span>
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">👋 <strong>{user?.full_name}</strong></span>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500 transition">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit flex-wrap">
          {['overview', 'users', 'attendance', 'revenue'].map((tab) => (
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
              {tab === 'attendance' && attendance.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-indigo-500 text-white rounded-full text-xs">
                  {attendance.length}
                </span>
              )}
              {tab === 'revenue' && payments.filter(p => p.status === 'completed').length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-green-500 text-white rounded-full text-xs">
                  {payments.filter(p => p.status === 'completed').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">👥</div>
                <div className="text-3xl font-bold text-gray-900">{users.length}</div>
                <div className="text-gray-500 text-sm mt-1">Total users</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">👨‍🎓</div>
                <div className="text-3xl font-bold text-gray-900">{students.length}</div>
                <div className="text-gray-500 text-sm mt-1">Students</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">👨‍🏫</div>
                <div className="text-3xl font-bold text-gray-900">{teachers.length}</div>
                <div className="text-gray-500 text-sm mt-1">Teachers</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">💰</div>
                <div className="text-3xl font-bold text-gray-900">
                  NPR {totalRevenue.toLocaleString()}
                </div>
                <div className="text-gray-500 text-sm mt-1">Total revenue</div>
              </div>
            </div>

            {/* Attendance + Revenue summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-3xl font-bold text-gray-900">{attendance.length}</div>
                <div className="text-gray-500 text-sm mt-1">Attendance records</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">💳</div>
                <div className="text-3xl font-bold text-gray-900">
                  {payments.filter(p => p.status === 'completed').length}
                </div>
                <div className="text-gray-500 text-sm mt-1">Successful payments</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">🎯</div>
                <div className="text-3xl font-bold text-gray-900">{paid.length}</div>
                <div className="text-gray-500 text-sm mt-1">Paid subscribers</div>
              </div>
            </div>

            {/* Platform health */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Health</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Student conversion rate</span>
                    <span className="font-medium">
                      {students.length > 0 ? Math.round((paid.length / students.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-2 bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${students.length > 0 ? Math.round((paid.length / students.length) * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Active users</span>
                    <span className="font-medium">{users.filter(u => u.is_active).length} / {users.length}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-2 bg-green-500 rounded-full transition-all"
                      style={{ width: `${users.length > 0 ? Math.round((users.filter(u => u.is_active).length / users.length) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent signups */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Signups</h2>
              <div className="space-y-3">
                {users.slice(0, 5).map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{u.full_name}</div>
                        <div className="text-gray-400 text-xs">{u.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium capitalize ${
                        u.role === 'admin' ? 'bg-red-100 text-red-700' :
                        u.role === 'teacher' ? 'bg-amber-100 text-amber-700' :
                        'bg-indigo-100 text-indigo-700'
                      }`}>{u.role}</span>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">All Users ({users.length})</h2>
            </div>
            {fetching ? (
              <div className="p-12 text-center text-gray-400">Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                              {u.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{u.full_name}</div>
                              <div className="text-gray-400 text-xs">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium capitalize ${
                            u.role === 'admin' ? 'bg-red-100 text-red-700' :
                            u.role === 'teacher' ? 'bg-amber-100 text-amber-700' :
                            'bg-indigo-100 text-indigo-700'
                          }`}>{u.role}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium capitalize ${
                            u.plan === 'monthly' || u.plan === 'yearly'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {u.plan || 'demo'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-3xl font-bold text-gray-900">{attendance.length}</div>
                <div className="text-gray-500 text-sm mt-1">Total records</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">⏱️</div>
                <div className="text-3xl font-bold text-gray-900">
                  {Math.floor(totalMinutes / 60)}h {Math.round(totalMinutes % 60)}m
                </div>
                <div className="text-gray-500 text-sm mt-1">Total learning time</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">👥</div>
                <div className="text-3xl font-bold text-gray-900">
                  {new Set(attendance.map(r => r.student_email)).size}
                </div>
                <div className="text-gray-500 text-sm mt-1">Unique students</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Attendance Records ({attendance.length})
                </h2>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search student or class..."
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                />
              </div>

              {filteredAttendance.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="text-5xl mb-4">📊</div>
                  <p className="text-gray-500">No attendance records yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Student', 'Class', 'Teacher', 'Date', 'Joined', 'Left', 'Duration'].map(h => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredAttendance.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900 text-sm">{record.student_name}</div>
                            <div className="text-gray-400 text-xs">{record.student_email}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                            <div className="truncate">{record.session_title}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{record.teacher_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(record.scheduled_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(record.joined_at).toLocaleTimeString('en-US', {
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {record.left_at
                              ? new Date(record.left_at).toLocaleTimeString('en-US', {
                                  hour: '2-digit', minute: '2-digit'
                                })
                              : <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">In class</span>
                            }
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              record.duration_minutes >= 45 ? 'bg-green-100 text-green-700' :
                              record.duration_minutes >= 20 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {Math.round(record.duration_minutes || 0)} min
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REVENUE TAB */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">💰</div>
                <div className="text-3xl font-bold text-gray-900">
                  NPR {totalRevenue.toLocaleString()}
                </div>
                <div className="text-gray-500 text-sm mt-1">Total revenue</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-3xl font-bold text-gray-900">
                  {payments.filter(p => p.status === 'completed').length}
                </div>
                <div className="text-gray-500 text-sm mt-1">Successful payments</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">⏳</div>
                <div className="text-3xl font-bold text-gray-900">
                  {payments.filter(p => p.status === 'pending').length}
                </div>
                <div className="text-gray-500 text-sm mt-1">Pending payments</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">
                  Payment History ({payments.length})
                </h2>
              </div>

              {payments.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="text-5xl mb-4">💳</div>
                  <p className="text-gray-500">No payments yet</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Payments appear when students upgrade their plan
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Student', 'Amount', 'Gateway', 'Status', 'Date'].map(h => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900 text-sm">{payment.full_name}</div>
                            <div className="text-gray-400 text-xs">{payment.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">
                              NPR {parseFloat(payment.amount).toLocaleString()}
                            </div>
                            <div className="text-gray-400 text-xs">{payment.currency}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                              payment.gateway === 'esewa' ? 'bg-green-100 text-green-700' :
                              payment.gateway === 'khalti' ? 'bg-purple-100 text-purple-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {payment.gateway}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                              payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                              payment.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(payment.created_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}