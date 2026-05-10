'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

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

export default function AdminAttendanceTab() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const res = await api.get('/classes/all-attendance');
      setRecords(res.data.attendance || []);
    } catch (err) {
      console.error('Fetch attendance error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = records.filter(r =>
    r.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.session_title?.toLowerCase().includes(search.toLowerCase()) ||
    r.student_email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalMinutes = records.reduce((sum, r) => sum + (parseFloat(String(r.duration_minutes)) || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="text-3xl mb-2">📊</div>
          <div className="text-3xl font-bold text-gray-900">{records.length}</div>
          <div className="text-gray-500 text-sm mt-1">Total attendance records</div>
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
            {new Set(records.map(r => r.student_email)).size}
          </div>
          <div className="text-gray-500 text-sm mt-1">Unique students</div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            All Attendance Records ({records.length})
          </h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or class..."
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-gray-500">No attendance records found</p>
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
                {filtered.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 text-sm">{record.student_name}</div>
                      <div className="text-gray-400 text-xs">{record.student_email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{record.session_title}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{record.teacher_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(record.scheduled_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric'
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
                        : <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">In class</span>
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
  );
}