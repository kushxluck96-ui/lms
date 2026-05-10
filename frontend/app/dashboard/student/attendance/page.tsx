'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import Link from 'next/link';

interface AttendanceRecord {
  id: string;
  session_title: string;
  scheduled_at: string;
  joined_at: string;
  left_at: string | null;
  duration_minutes: number;
  total_duration: number;
  teacher_name: string;
}

export default function StudentAttendancePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState({ total_classes_attended: 0, total_minutes: 0 });
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    if (user) fetchAttendance();
  }, [user]);

  const fetchAttendance = async () => {
    try {
      const res = await api.get('/classes/my-attendance');
      setAttendance(res.data.attendance || []);
      setStats({
        total_classes_attended: res.data.total_classes_attended,
        total_minutes: res.data.total_minutes,
      });
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setFetching(false);
    }
  };

  const getAttendanceRate = (duration: number, total: number) => {
    if (!total || !duration) return 0;
    return Math.min(100, Math.round((duration / total) * 100));
  };

  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/student" className="text-gray-400 hover:text-gray-600 transition">← Back</Link>
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <span className="text-lg font-bold text-gray-900">My Attendance</span>
            </div>
          </div>
          <span className="text-sm text-gray-500">👋 {user?.full_name}</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total_classes_attended}</div>
            <div className="text-gray-500 text-sm mt-1">Classes attended</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-2">⏱️</div>
            <div className="text-3xl font-bold text-gray-900">
              {Math.floor(stats.total_minutes / 60)}h {stats.total_minutes % 60}m
            </div>
            <div className="text-gray-500 text-sm mt-1">Total time in class</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-2">📈</div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.total_classes_attended > 0
                ? Math.round(stats.total_minutes / stats.total_classes_attended)
                : 0} min
            </div>
            <div className="text-gray-500 text-sm mt-1">Avg time per class</div>
          </div>
        </div>

        {/* Attendance Records */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Attendance History</h2>
          </div>

          {attendance.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-gray-500">No attendance records yet</p>
              <p className="text-gray-400 text-sm mt-2">Join a live class to see your attendance here</p>
              <Link
                href="/dashboard/student/live"
                className="inline-block mt-4 bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
              >
                View Live Classes
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {attendance.map((record) => {
                const rate = getAttendanceRate(record.duration_minutes, record.total_duration);
                return (
                  <div key={record.id} className="p-6 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">{record.session_title}</div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                          <span>📅 {new Date(record.scheduled_at).toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric'
                          })}</span>
                          <span>👨‍🏫 {record.teacher_name}</span>
                          <span>🕐 Joined: {new Date(record.joined_at).toLocaleTimeString('en-US', {
                            hour: '2-digit', minute: '2-digit'
                          })}</span>
                          {record.left_at && (
                            <span>🚪 Left: {new Date(record.left_at).toLocaleTimeString('en-US', {
                              hour: '2-digit', minute: '2-digit'
                            })}</span>
                          )}
                        </div>

                        {/* Attendance bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>{record.duration_minutes} min attended</span>
                            <span>{rate}% of class</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                rate >= 80 ? 'bg-green-500' :
                                rate >= 50 ? 'bg-amber-500' :
                                'bg-red-400'
                              }`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                          rate >= 80 ? 'bg-green-100 text-green-700' :
                          rate >= 50 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {rate >= 80 ? '✅ Great' : rate >= 50 ? '⚠️ Partial' : '❌ Low'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}