'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import Link from 'next/link';

interface Lesson {
  id: string;
  title: string;
  type: string;
  content_url?: string;
  duration_minutes: number;
  order_index: number;
  is_free_preview: boolean;
  completed?: boolean;
}

interface Module {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  teacher_name: string;
  thumbnail_url: string | null;
}

interface Progress {
  progress_percent: number;
  completed_lessons: number;
  total_lessons: number;
  lessons: Array<{ lesson_id: string; completed: boolean }>;
}

export default function CourseDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    if (user && courseId) fetchCourseData();
  }, [user, courseId]);

  const fetchCourseData = async () => {
    try {
      const [courseRes, progressRes] = await Promise.all([
        api.get(`/courses/${courseId}`),
        api.get(`/progress/course/${courseId}`),
      ]);

      setCourse(courseRes.data.course);
      setModules(courseRes.data.modules || []);
      setProgress(progressRes.data);

      const ids = new Set<string>(courseRes.data.modules?.map((m: Module) => m.id) || []);
      setExpandedModules(ids);

      const progressMap = new Map(
        progressRes.data.lessons?.map((l: any) => [l.lesson_id, l.completed]) || []
      );

      for (const mod of courseRes.data.modules || []) {
        for (const lesson of mod.lessons || []) {
          if (!progressMap.get(lesson.id)) {
            setSelectedLesson({ ...lesson, completed: false });
            setSelectedModule(mod.id);
            return;
          }
        }
      }

      const firstMod = courseRes.data.modules?.[0];
      if (firstMod?.lessons?.[0]) {
        setSelectedLesson({ ...firstMod.lessons[0], completed: true });
        setSelectedModule(firstMod.id);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const handleSelectLesson = (lesson: Lesson, moduleId: string) => {
    const isCompleted = progress?.lessons?.find(l => l.lesson_id === lesson.id)?.completed || false;
    setSelectedLesson({ ...lesson, completed: isCompleted });
    setSelectedModule(moduleId);
  };

  const handleMarkComplete = async () => {
    if (!selectedLesson || completing) return;
    setCompleting(true);
    try {
      await api.post('/progress/complete', {
        lesson_id: selectedLesson.id,
        watch_duration_sec: (selectedLesson.duration_minutes || 1) * 60,
      });
      setSelectedLesson(prev => prev ? { ...prev, completed: true } : null);
      await fetchCourseData();
      advanceToNextLesson();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to mark complete');
    } finally {
      setCompleting(false);
    }
  };

  const advanceToNextLesson = () => {
    if (!selectedLesson || !selectedModule) return;
    const currentMod = modules.find(m => m.id === selectedModule);
    if (!currentMod) return;

    const lessons = currentMod.lessons || [];
    const currentIdx = lessons.findIndex(l => l.id === selectedLesson.id);

    if (currentIdx < lessons.length - 1) {
      setSelectedLesson(lessons[currentIdx + 1]);
    } else {
      const modIdx = modules.findIndex(m => m.id === selectedModule);
      if (modIdx < modules.length - 1) {
        const nextMod = modules[modIdx + 1];
        if (nextMod.lessons?.[0]) {
          setSelectedLesson(nextMod.lessons[0]);
          setSelectedModule(nextMod.id);
        }
      }
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const isLessonCompleted = (lessonId: string) =>
    progress?.lessons?.find(l => l.lesson_id === lessonId)?.completed || false;

  const isLessonLocked = (lesson: Lesson, moduleId: string) => {
    if (lesson.order_index === 1) return false;
    if (lesson.is_free_preview) return false;
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return false;
    const prevLesson = mod.lessons?.find(l => l.order_index === lesson.order_index - 1);
    if (!prevLesson) return false;
    return !isLessonCompleted(prevLesson.id);
  };

  const getLessonIcon = (lesson: Lesson, moduleId: string) => {
    if (isLessonCompleted(lesson.id)) return '✅';
    if (isLessonLocked(lesson, moduleId)) return '🔒';
    if (lesson.type === 'video') return '▶️';
    if (lesson.type === 'pdf') return '📄';
    if (lesson.type === 'quiz') return '📝';
    return '▶️';
  };

  if (loading || !course) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/student" className="text-gray-400 hover:text-white transition text-sm">
            ← Back
          </Link>
          <div className="text-white font-semibold text-sm truncate max-w-xs">
            {course.title}
          </div>
        </div>
        {progress && (
          <div className="flex items-center gap-3">
            <div className="text-gray-400 text-sm">
              {progress.completed_lessons}/{progress.total_lessons} lessons
            </div>
            <div className="w-32 h-2 bg-gray-700 rounded-full">
              <div
                className="h-2 bg-indigo-500 rounded-full transition-all"
                style={{ width: `${progress.progress_percent}%` }}
              />
            </div>
            <div className="text-indigo-400 text-sm font-medium">
              {progress.progress_percent}%
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedLesson ? (
            <>
              {/* Player area */}
              <div className="bg-black flex-1 flex items-center justify-center" style={{ minHeight: '400px' }}>
                {selectedLesson.type === 'video' && selectedLesson.content_url ? (
                  <video
                    key={selectedLesson.id}
                    controls
                    className="w-full max-h-full"
                    src={selectedLesson.content_url}
                    onEnded={handleMarkComplete}
                  />
                ) : selectedLesson.type === 'video' ? (
                  <div className="text-center text-gray-400 p-12">
                    <div className="text-6xl mb-4">🎥</div>
                    <div className="text-xl font-medium text-white mb-2">{selectedLesson.title}</div>
                    <div className="text-sm">Video content will appear here</div>
                    <div className="text-xs mt-2 text-gray-500">
                      Duration: {selectedLesson.duration_minutes} minutes
                    </div>
                  </div>
                ) : selectedLesson.type === 'pdf' ? (
                  <div className="text-center text-gray-400 p-12">
                    <div className="text-6xl mb-4">📄</div>
                    <div className="text-xl font-medium text-white mb-4">{selectedLesson.title}</div>
                    {selectedLesson.content_url ? (
                      <a
                        href={selectedLesson.content_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition"
                      >
                        📄 Open PDF
                      </a>
                    ) : (
                      <div className="text-sm">PDF content will appear here</div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 p-12">
                    <div className="text-6xl mb-4">📝</div>
                    <div className="text-xl font-medium text-white mb-2">{selectedLesson.title}</div>
                    <div className="text-sm">Quiz content will appear here</div>
                  </div>
                )}
              </div>

              {/* Lesson actions */}
              <div className="bg-gray-800 px-6 py-4 flex items-center justify-between flex-shrink-0 border-t border-gray-700">
                <div>
                  <div className="text-white font-semibold">{selectedLesson.title}</div>
                  <div className="text-gray-400 text-sm capitalize">
                    {selectedLesson.type} · {selectedLesson.duration_minutes} min
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isLessonCompleted(selectedLesson.id) ? (
                    <div className="flex items-center gap-2 text-green-400 font-medium">
                      <span>✅</span>
                      <span>Completed</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleMarkComplete}
                      disabled={completing}
                      className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {completing ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Marking...
                        </>
                      ) : '✓ Mark as Complete'}
                    </button>
                  )}
                  <button
                    onClick={advanceToNextLesson}
                    className="bg-gray-700 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-gray-600 transition"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-5xl mb-4">👈</div>
                <p>Select a lesson to start learning</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-gray-700">
            <div className="text-white font-semibold text-sm">Course Content</div>
            <div className="text-gray-400 text-xs mt-1">
              {progress?.completed_lessons} of {progress?.total_lessons} lessons completed
            </div>
          </div>

          <div className="divide-y divide-gray-700">
            {modules.map((mod) => (
              <div key={mod.id}>
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700 transition text-left"
                >
                  <div>
                    <div className="text-white text-sm font-medium">{mod.title}</div>
                    <div className="text-gray-400 text-xs mt-0.5">
                      {mod.lessons?.length || 0} lessons ·{' '}
                      {mod.lessons?.filter(l => isLessonCompleted(l.id)).length || 0} done
                    </div>
                  </div>
                  <span className="text-gray-400 text-xs">
                    {expandedModules.has(mod.id) ? '▲' : '▼'}
                  </span>
                </button>

                {expandedModules.has(mod.id) && (
                  <div className="bg-gray-900">
                    {(mod.lessons || []).map((lesson) => {
                      const completed = isLessonCompleted(lesson.id);
                      const locked = isLessonLocked(lesson, mod.id);
                      const isSelected = selectedLesson?.id === lesson.id;

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => !locked && handleSelectLesson(lesson, mod.id)}
                          disabled={locked}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left transition ${
                            isSelected
                              ? 'bg-indigo-900 border-l-2 border-indigo-500'
                              : locked
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-gray-800'
                          }`}
                        >
                          <span className="text-base flex-shrink-0 mt-0.5">
                            {getLessonIcon(lesson, mod.id)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm truncate ${
                              completed ? 'text-green-400' :
                              isSelected ? 'text-white font-medium' :
                              locked ? 'text-gray-500' :
                              'text-gray-300'
                            }`}>
                              {lesson.title}
                            </div>
                            <div className="text-gray-500 text-xs mt-0.5 capitalize">
                              {lesson.type} · {lesson.duration_minutes}min
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}