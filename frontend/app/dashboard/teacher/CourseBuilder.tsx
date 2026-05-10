'use client';

import { useState } from 'react';
import api from '@/lib/api';

interface Lesson {
  id: string;
  title: string;
  type: string;
  content_url: string;
  duration_minutes: number;
  order_index: number;
  is_free_preview: boolean;
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
  is_published: boolean;
  module_count: string;
  lesson_count: string;
}

interface Props {
  course: Course;
  onPublish: (id: string) => void;
  onRefresh: () => void;
}

export default function CourseBuilder({ course, onPublish, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [addingModule, setAddingModule] = useState(false);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    type: 'video',
    content_url: '',
    duration_minutes: 5,
    order_index: 1,
    is_free_preview: false,
  });
  const [addingLesson, setAddingLesson] = useState(false);
  const [msg, setMsg] = useState('');

  const loadModules = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    setLoadingModules(true);
    try {
      const res = await api.get(`/courses/${course.id}`);
      setModules(res.data.modules || []);
    } catch (err) {
      console.error('Load modules error:', err);
    } finally {
      setLoadingModules(false);
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingModule(true);
    try {
      await api.post(`/courses/${course.id}/modules`, {
        title: moduleTitle,
        order_index: modules.length + 1,
      });
      setModuleTitle('');
      setShowModuleForm(false);
      const res = await api.get(`/courses/${course.id}`);
      setModules(res.data.modules || []);
      setMsg('✅ Module added!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Failed to add module');
    } finally {
      setAddingModule(false);
    }
  };

  const handleAddLesson = async (e: React.FormEvent, moduleId: string) => {
    e.preventDefault();
    setAddingLesson(true);
    try {
      await api.post(`/courses/modules/${moduleId}/lessons`, lessonForm);
      setActiveLesson(null);
      setLessonForm({
        title: '',
        type: 'video',
        content_url: '',
        duration_minutes: 5,
        order_index: 1,
        is_free_preview: false,
      });
      const res = await api.get(`/courses/${course.id}`);
      setModules(res.data.modules || []);
      setMsg('✅ Lesson added!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Failed to add lesson');
    } finally {
      setAddingLesson(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Course header */}
      <div className="p-6 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-gray-900 text-lg">{course.title}</h3>
            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
              course.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {course.is_published ? '✅ Published' : '📝 Draft'}
            </span>
          </div>
          <p className="text-gray-500 text-sm mb-2">{course.description}</p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>📦 {course.module_count} modules</span>
            <span>📖 {course.lesson_count} lessons</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!course.is_published && (
            <button
              onClick={() => onPublish(course.id)}
              className="bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-600 transition"
            >
              Publish
            </button>
          )}
          <button
            onClick={loadModules}
            className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-100 transition"
          >
            {expanded ? '▲ Hide' : '▼ Manage Content'}
          </button>
        </div>
      </div>

      {/* Expanded content builder */}
      {expanded && (
        <div className="border-t border-gray-100 p-6 bg-gray-50">
          {msg && (
            <div className={`mb-4 p-3 rounded-xl text-sm ${
              msg.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>
              {msg}
            </div>
          )}

          {loadingModules ? (
            <div className="text-center py-8 text-gray-400">Loading modules...</div>
          ) : (
            <div className="space-y-4">
              {/* Modules list */}
              {modules.map((mod, modIdx) => (
                <div key={mod.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Module header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-semibold">
                        {modIdx + 1}
                      </span>
                      {mod.title}
                    </div>
                    <button
                      onClick={() => setActiveLesson(activeLesson === mod.id ? null : mod.id)}
                      className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition"
                    >
                      + Add Lesson
                    </button>
                  </div>

                  {/* Lessons list */}
                  <div className="divide-y divide-gray-50">
                    {(mod.lessons || []).map((lesson, lessonIdx) => (
                      <div key={lesson.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="text-gray-400 text-xs w-6">{lessonIdx + 1}</span>
                        <span className="text-sm">
                          {lesson.type === 'video' ? '▶️' : lesson.type === 'pdf' ? '📄' : '📝'}
                        </span>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{lesson.title}</div>
                          <div className="text-xs text-gray-400 capitalize">
                            {lesson.type} · {lesson.duration_minutes} min
                            {lesson.is_free_preview && (
                              <span className="ml-2 text-green-600">Free preview</span>
                            )}
                          </div>
                        </div>
                        {lesson.content_url && (
                          <a
                            href={lesson.content_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-500 hover:underline"
                          >
                            View
                          </a>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add lesson form */}
                  {activeLesson === mod.id && (
                    <div className="p-4 bg-indigo-50 border-t border-indigo-100">
                      <div className="font-medium text-gray-900 text-sm mb-3">Add New Lesson</div>
                      <form onSubmit={(e) => handleAddLesson(e, mod.id)} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Lesson Title</label>
                            <input
                              type="text"
                              value={lessonForm.title}
                              onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="e.g. Introduction to Variables"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                            <select
                              value={lessonForm.type}
                              onChange={(e) => setLessonForm({ ...lessonForm, type: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="video">▶️ Video</option>
                              <option value="pdf">📄 PDF</option>
                              <option value="quiz">📝 Quiz</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Content URL {lessonForm.type === 'video' ? '(video link)' : lessonForm.type === 'pdf' ? '(PDF link)' : '(optional)'}
                          </label>
                          <input
                            type="url"
                            value={lessonForm.content_url}
                            onChange={(e) => setLessonForm({ ...lessonForm, content_url: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="https://..."
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Duration (min)</label>
                            <input
                              type="number"
                              value={lessonForm.duration_minutes}
                              onChange={(e) => setLessonForm({ ...lessonForm, duration_minutes: parseInt(e.target.value) || 1 })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              min={1}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Order</label>
                            <input
                              type="number"
                              value={lessonForm.order_index}
                              onChange={(e) => setLessonForm({ ...lessonForm, order_index: parseInt(e.target.value) || 1 })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              min={1}
                            />
                          </div>
                          <div className="flex items-end pb-2">
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={lessonForm.is_free_preview}
                                onChange={(e) => setLessonForm({ ...lessonForm, is_free_preview: e.target.checked })}
                                className="w-4 h-4 text-indigo-600 rounded"
                              />
                              Free preview
                            </label>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={addingLesson}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                          >
                            {addingLesson ? 'Adding...' : '+ Add Lesson'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveLesson(null)}
                            className="bg-white text-gray-500 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition border border-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              ))}

              {/* Add module form */}
              {showModuleForm ? (
                <form onSubmit={handleAddModule} className="bg-white rounded-xl border border-indigo-200 p-4">
                  <div className="font-medium text-gray-900 text-sm mb-3">New Module</div>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={moduleTitle}
                      onChange={(e) => setModuleTitle(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. Getting Started"
                      required
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={addingModule}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                      {addingModule ? 'Adding...' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModuleForm(false)}
                      className="bg-white text-gray-500 px-4 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowModuleForm(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm hover:border-indigo-400 hover:text-indigo-600 transition"
                >
                  + Add New Module
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}