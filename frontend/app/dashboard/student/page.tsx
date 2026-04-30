'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

interface Stats {
  total_lessons_completed: string;
  courses_in_progress: string;
  total_watch_hours: number;
}

interface Session {
  id: string;
  title: string;
  meet_link: string;
  scheduled_at: string;
  duration_minutes: number;
  teacher_name: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  teacher_name: string;
  lesson_count: string;
}

export default function StudentDashboard() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user?.role !== 'student') router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [statsRes, sessionsRes, notifsRes, coursesRes] = await Promise.all([
        api.get('/progress/my-stats'),
        api.get('/classes/sessions'),
        api.get('/classes/notifications'),
        api.get('/courses'),
      ]);
      setStats(statsRes.data.stats);
      setSessions(sessionsRes.data.sessions);
      setNotifications(notifsRes.data.notifications);
      setCourses(coursesRes.data.courses);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Loading your dashboard...</p>
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
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              👋 Hello, <strong>{user?.full_name}</strong>
            </span>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-xs font-medium">
              Demo Plan
            </span>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-red-500 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
          {['overview', 'courses', 'live classes', 'notifications'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">📚</div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats?.total_lessons_completed || 0}
                </div>
                <div className="text-gray-500 text-sm mt-1">Lessons completed</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">🎯</div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats?.courses_in_progress || 0}
                </div>
                <div className="text-gray-500 text-sm mt-1">Courses in progress</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">⏱️</div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats?.total_watch_hours || 0}h
                </div>
                <div className="text-gray-500 text-sm mt-1">Watch time</div>
              </div>
            </div>

            {/* Upgrade Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1">Upgrade to Premium 🚀</h3>
                  <p className="text-indigo-200 text-sm">Get unlimited access to all courses and live classes</p>
                </div>
                <button className="bg-white text-indigo-600 px-6 py-2 rounded-xl font-semibold hover:bg-indigo-50 transition">
                  Upgrade Now
                </button>
              </div>
            </div>

            {/* Upcoming Sessions */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📅 Upcoming Live Classes</h2>
              {sessions.length === 0 ? (
                <p className="text-gray-400 text-sm">No upcoming classes scheduled</p>
              ) : (
                <div className="space-y-3">
                  {sessions.slice(0, 3).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl">
                      <div>
                        <div className="font-medium text-gray-900">{session.title}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(session.scheduled_at).toLocaleString()} · {session.duration_minutes} min
                        </div>
                        <div className="text-sm text-indigo-600">👨‍🏫 {session.teacher_name}</div>
                      </div>
                      <a
                        href={session.meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                      >
                        Join
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* COURSES TAB */}
        {activeTab === 'courses' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Courses</h2>
            {courses.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                <div className="text-5xl mb-4">📚</div>
                <p className="text-gray-500">No courses published yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div key={course.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-2xl mb-4">📖</div>
                    <h3 className="font-semibold text-gray-900 mb-2">{course.title}</h3>
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{course.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">👨‍🏫 {course.teacher_name}</span>
                      <span className="text-xs text-indigo-600 font-medium">{course.lesson_count} lessons</span>
                    </div>
                    <button className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
                      Start Learning
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LIVE CLASSES TAB */}
        {activeTab === 'live classes' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Live Classes</h2>
            {sessions.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                <div className="text-5xl mb-4">📅</div>
                <p className="text-gray-500">No upcoming sessions</p>
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
                      <div className="text-indigo-600 text-sm">👨‍🏫 {session.teacher_name}</div>
                    </div>
                    <a
                      href={session.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600 transition"
                    >
                      🎥 Join Class
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h2>
            {notifications.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                <div className="text-5xl mb-4">🔔</div>
                <p className="text-gray-500">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div key={notif.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="flex items-start gap-4">
                      <div className="text-2xl">
                        {notif.type === 'class' ? '📅' : notif.type === 'warning' ? '⚠️' : 'ℹ️'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{notif.title}</div>
                        <div className="text-gray-500 text-sm mt-1">{notif.message}</div>
                        <div className="text-gray-400 text-xs mt-2">
                          {new Date(notif.created_at).toLocaleString()}
                        </div>
                      </div>
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