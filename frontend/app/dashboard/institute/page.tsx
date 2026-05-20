'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

interface InstituteData {
  institute: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    plan: string;
    status: string;
    max_teachers: number;
    max_students: number;
  };
  teachers: any[];
  students: any[];
  courses: any[];
  stats: {
    total_teachers: number;
    total_students: number;
    total_courses: number;
    total_sessions: string;
    avg_duration: number;
  };
}

export default function InstituteDashboard() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<InstituteData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [fetching, setFetching] = useState(true);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('student');
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user?.role !== 'institute_admin') router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
  try {
    const res = await api.get('/institutes/my');

    // User has no institute yet
    if (!res.data.institute) {
      router.push('/dashboard/institute/setup');
      return;
    }

    setData(res.data);

  } catch (err: any) {
    console.error('Fetch error:', err);

    // Fallback for old backend behavior
    if (err.response?.status === 404) {
      router.push('/dashboard/institute/setup');
    }
  } finally {
    setFetching(false);
  }
};

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteMsg('');
    setInviteLink('');
    try {
      const res = await api.post('/institutes/invite', {
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteMsg(`✅ Invitation created for ${inviteEmail}`);
      setInviteLink(res.data.invite_link);
      setInviteEmail('');
    } catch (err: any) {
      setInviteMsg(err.response?.data?.error || 'Failed to create invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from institute?`)) return;
    try {
      await api.delete(`/institutes/members/${userId}`);
      fetchData();
    } catch (err) {
      console.error('Remove error:', err);
    }
  };

  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-5xl mb-4">🏫</div>
        <p className="text-gray-500">No institute found</p>
        <button
          onClick={() => router.push('/dashboard/institute/setup')}
          className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-xl"
        >
          Create Institute
        </button>
      </div>
    </div>
  );

  const { institute, teachers, students, courses, stats } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏫</span>
            <div>
              <span className="text-xl font-bold text-gray-900">{institute.name}</span>
              <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium capitalize">
                {institute.plan} plan
              </span>
            </div>
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
          {['overview', 'teachers', 'students', 'courses', 'invite'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                activeTab === tab ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: '👨‍🏫', value: stats.total_teachers, label: 'Teachers', max: institute.max_teachers },
                { icon: '👨‍🎓', value: stats.total_students, label: 'Students', max: institute.max_students },
                { icon: '📚', value: stats.total_courses, label: 'Courses' },
                { icon: '📅', value: stats.total_sessions, label: 'Sessions held' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="text-3xl mb-2">{stat.icon}</div>
                  <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-gray-500 text-sm mt-1">{stat.label}</div>
                  {stat.max && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div
                          className={`h-1.5 rounded-full ${
                            (Number(stat.value) / stat.max) > 0.8 ? 'bg-red-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${Math.min(100, (Number(stat.value) / stat.max) * 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{stat.value}/{stat.max} used</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Institute info */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Institute Details</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Name', value: institute.name },
                  { label: 'Email', value: institute.email },
                  { label: 'Phone', value: institute.phone || 'Not set' },
                  { label: 'Address', value: institute.address || 'Not set' },
                  { label: 'Plan', value: institute.plan },
                  { label: 'Status', value: institute.status },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                    <div className="font-medium text-gray-900 capitalize">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent courses */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Courses</h2>
              {courses.length === 0 ? (
                <p className="text-gray-400 text-sm">No courses yet — invite teachers to create courses</p>
              ) : (
                <div className="space-y-3">
                  {courses.slice(0, 5).map((course) => (
                    <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{course.title}</div>
                        <div className="text-xs text-gray-400">👨‍🏫 {course.teacher_name} · {course.lesson_count} lessons</div>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        course.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {course.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TEACHERS TAB */}
        {activeTab === 'teachers' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Teachers ({teachers.length}/{institute.max_teachers})</h2>
              <button
                onClick={() => setActiveTab('invite')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
              >
                + Invite Teacher
              </button>
            </div>
            {teachers.length === 0 ? (
              <div className="p-16 text-center">
                <div className="text-5xl mb-4">👨‍🏫</div>
                <p className="text-gray-500">No teachers yet</p>
                <button
                  onClick={() => setActiveTab('invite')}
                  className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-medium"
                >
                  Invite your first teacher
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {teachers.map((teacher) => (
                  <div key={teacher.id} className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold">
                        {teacher.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{teacher.full_name}</div>
                        <div className="text-gray-400 text-xs">{teacher.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(teacher.id, teacher.full_name)}
                      className="text-red-500 hover:text-red-700 text-sm transition"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Students ({students.length}/{institute.max_students})</h2>
              <button
                onClick={() => setActiveTab('invite')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
              >
                + Invite Student
              </button>
            </div>
            {students.length === 0 ? (
              <div className="p-16 text-center">
                <div className="text-5xl mb-4">👨‍🎓</div>
                <p className="text-gray-500">No students yet</p>
                <button
                  onClick={() => setActiveTab('invite')}
                  className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-medium"
                >
                  Invite your first student
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Student', 'Email', 'Joined', 'Action'].map(h => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                              {student.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="font-medium text-gray-900 text-sm">{student.full_name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{student.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(student.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleRemoveMember(student.id, student.full_name)}
                            className="text-red-500 hover:text-red-700 text-sm transition"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* COURSES TAB */}
        {activeTab === 'courses' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">All Courses ({courses.length})</h2>
            {courses.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100">
                <div className="text-5xl mb-4">📚</div>
                <p className="text-gray-500">No courses yet</p>
                <p className="text-gray-400 text-sm mt-2">Invite teachers to create courses</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div key={course.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{course.title}</h3>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        course.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {course.is_published ? '✅ Live' : '📝 Draft'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">👨‍🏫 {course.teacher_name}</div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>📦 {course.module_count} modules</span>
                      <span>📖 {course.lesson_count} lessons</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* INVITE TAB */}
        {activeTab === 'invite' && (
          <div className="max-w-lg">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite Member</h2>

              {inviteMsg && (
                <div className={`mb-4 p-4 rounded-xl text-sm ${
                  inviteMsg.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600'
                }`}>
                  {inviteMsg}
                  {inviteLink && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                      <div className="text-xs text-gray-500 mb-1">Share this invite link:</div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-indigo-600 break-all flex-1">{inviteLink}</code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(inviteLink);
                            alert('Copied!');
                          }}
                          className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs flex-shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="teacher@school.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['teacher', 'student'].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setInviteRole(role)}
                        className={`py-3 rounded-xl border-2 font-medium capitalize transition ${
                          inviteRole === role
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {role === 'teacher' ? '👨‍🏫 Teacher' : '👨‍🎓 Student'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={inviting}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {inviting ? 'Creating invite...' : '📨 Generate Invite Link'}
                </button>
              </form>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                <div className="font-medium text-blue-800 text-sm mb-1">How invitations work</div>
                <div className="text-blue-600 text-xs space-y-1">
                  <div>1. Enter email and select role</div>
                  <div>2. Copy the generated invite link</div>
                  <div>3. Send it via WhatsApp, email, or any messenger</div>
                  <div>4. They click the link, register/login, and join automatically</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}