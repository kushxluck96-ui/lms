'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

interface Course {
  id: string;
  title: string;
  description: string;
  is_published: boolean;
  module_count: string;
  lesson_count: string;
  created_at: string;
}

interface Session {
  id: string;
  title: string;
  meet_link: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
}

export default function TeacherDashboard() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Create course form
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: '', description: '' });
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseMsg, setCourseMsg] = useState('');

  // Create schedule form
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    description: '',
    start_time: '10:00',
    duration_minutes: 60,
    day_of_week: [] as number[],
  });
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user?.role !== 'teacher') router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [coursesRes, sessionsRes] = await Promise.all([
        api.get('/courses/my-courses'),
        api.get('/classes/sessions'),
      ]);
      setCourses(coursesRes.data.courses);
      setSessions(sessionsRes.data.sessions);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCourseLoading(true);
    setCourseMsg('');
    try {
      await api.post('/courses', courseForm);
      setCourseMsg('Course created successfully!');
      setCourseForm({ title: '', description: '' });
      setShowCourseForm(false);
      fetchData();
    } catch (err: any) {
      setCourseMsg(err.response?.data?.error || 'Failed to create course');
    } finally {
      setCourseLoading(false);
    }
  };

  const handlePublish = async (courseId: string) => {
    try {
      await api.patch(`/courses/${courseId}/publish`);
      fetchData();
    } catch (err) {
      console.error('Publish error:', err);
    }
  };

  const toggleDay = (day: number) => {
    setScheduleForm((prev) => ({
      ...prev,
      day_of_week: prev.day_of_week.includes(day)
        ? prev.day_of_week.filter((d) => d !== day)
        : [...prev.day_of_week, day],
    }));
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleLoading(true);
    setScheduleMsg('');
    try {
      await api.post('/classes/schedules', scheduleForm);
      setScheduleMsg('Schedule created! Triggering session generation...');
      await api.post('/classes/trigger-generation');
      setScheduleMsg('Schedule created and sessions generated!');
      setShowScheduleForm(false);
      fetchData();
    } catch (err: any) {
      setScheduleMsg(err.response?.data?.error || 'Failed to create schedule');
    } finally {
      setScheduleLoading(false);
    }
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Loading...</p>
      </div>
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
            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">Teacher</span>
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
        <div className="flex gap-2 mb-8 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
          {['overview', 'my courses', 'live classes'].map((tab) => (
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

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">📚</div>
                <div className="text-3xl font-bold text-gray-900">{courses.length}</div>
                <div className="text-gray-500 text-sm mt-1">Total courses</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-3xl font-bold text-gray-900">
                  {courses.filter((c) => c.is_published).length}
                </div>
                <div className="text-gray-500 text-sm mt-1">Published</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">📅</div>
                <div className="text-3xl font-bold text-gray-900">{sessions.length}</div>
                <div className="text-gray-500 text-sm mt-1">Upcoming sessions</div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => { setActiveTab('my courses'); setShowCourseForm(true); }}
                className="bg-indigo-600 text-white rounded-2xl p-6 text-left hover:bg-indigo-700 transition"
              >
                <div className="text-3xl mb-3">➕</div>
                <div className="font-semibold text-lg">Create New Course</div>
                <div className="text-indigo-200 text-sm mt-1">Add course, modules and lessons</div>
              </button>
              <button
                onClick={() => { setActiveTab('live classes'); setShowScheduleForm(true); }}
                className="bg-amber-500 text-white rounded-2xl p-6 text-left hover:bg-amber-600 transition"
              >
                <div className="text-3xl mb-3">📅</div>
                <div className="font-semibold text-lg">Schedule Live Class</div>
                <div className="text-amber-100 text-sm mt-1">Set recurring class schedule</div>
              </button>
            </div>

            {/* Recent sessions */}
            {sessions.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">📅 Upcoming Sessions</h2>
                <div className="space-y-3">
                  {sessions.slice(0, 3).map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <div className="font-medium text-gray-900">{s.title}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(s.scheduled_at).toLocaleString()} · {s.duration_minutes} min
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium capitalize">
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MY COURSES */}
        {activeTab === 'my courses' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">My Courses</h2>
              <button
                onClick={() => setShowCourseForm(!showCourseForm)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
              >
                {showCourseForm ? 'Cancel' : '+ New Course'}
              </button>
            </div>

            {/* Create Course Form */}
            {showCourseForm && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                <h3 className="font-semibold text-gray-900 mb-4">Create New Course</h3>
                {courseMsg && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${
                    courseMsg.includes('success')
                      ? 'bg-green-50 text-green-600'
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {courseMsg}
                  </div>
                )}
                <form onSubmit={handleCreateCourse} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
                    <input
                      type="text"
                      value={courseForm.title}
                      onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      placeholder="e.g. Complete Python Bootcamp"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={courseForm.description}
                      onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      placeholder="What will students learn?"
                      rows={3}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={courseLoading}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {courseLoading ? 'Creating...' : 'Create Course'}
                  </button>
                </form>
              </div>
            )}

            {/* Courses List */}
            {courses.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                <div className="text-5xl mb-4">📚</div>
                <p className="text-gray-500 mb-4">No courses yet</p>
                <button
                  onClick={() => setShowCourseForm(true)}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
                >
                  Create your first course
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.map((course) => (
                  <div key={course.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 text-lg">{course.title}</h3>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        course.is_published
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {course.is_published ? '✅ Published' : '📝 Draft'}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{course.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <span>📦 {course.module_count} modules</span>
                      <span>📖 {course.lesson_count} lessons</span>
                    </div>
                    {!course.is_published && (
                      <button
                        onClick={() => handlePublish(course.id)}
                        className="w-full bg-green-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-green-600 transition"
                      >
                        Publish Course
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LIVE CLASSES */}
        {activeTab === 'live classes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Live Class Schedules</h2>
              <button
                onClick={() => setShowScheduleForm(!showScheduleForm)}
                className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-600 transition"
              >
                {showScheduleForm ? 'Cancel' : '+ New Schedule'}
              </button>
            </div>

            {/* Create Schedule Form */}
            {showScheduleForm && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-100">
                <h3 className="font-semibold text-gray-900 mb-4">Create Class Schedule</h3>
                {scheduleMsg && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${
                    scheduleMsg.includes('!')
                      ? 'bg-green-50 text-green-600'
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {scheduleMsg}
                  </div>
                )}
                <form onSubmit={handleCreateSchedule} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class Title</label>
                    <input
                      type="text"
                      value={scheduleForm.title}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                      placeholder="e.g. Python Live Q&A"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week</label>
                    <div className="flex gap-2 flex-wrap">
                      {days.map((day, index) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(index)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                            scheduleForm.day_of_week.includes(index)
                              ? 'bg-amber-500 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={scheduleForm.start_time}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                      <input
                        type="number"
                        value={scheduleForm.duration_minutes}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, duration_minutes: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                        min={15}
                        max={180}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={scheduleLoading || scheduleForm.day_of_week.length === 0}
                    className="bg-amber-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-600 transition disabled:opacity-50"
                  >
                    {scheduleLoading ? 'Creating...' : 'Create Schedule'}
                  </button>
                </form>
              </div>
            )}

            {/* Sessions List */}
            {sessions.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                <div className="text-5xl mb-4">📅</div>
                <p className="text-gray-500 mb-4">No sessions scheduled yet</p>
                <button
                  onClick={() => setShowScheduleForm(true)}
                  className="bg-amber-500 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-amber-600 transition"
                >
                  Create your first schedule
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div key={session.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 text-lg">{session.title}</div>
                      <div className="text-gray-500 text-sm mt-1">
                        📅 {new Date(session.scheduled_at).toLocaleString()}
                      </div>
                      <div className="text-gray-500 text-sm">⏱️ {session.duration_minutes} minutes</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                        session.status === 'scheduled'
                          ? 'bg-blue-100 text-blue-700'
                          : session.status === 'live'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {session.status}
                      </span>
                      <a
                        href={session.meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
                      >
                        Start Class
                      </a>
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