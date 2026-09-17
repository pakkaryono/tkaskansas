import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  Sparkles,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Eye,
  RefreshCw,
  Lock,
  Layers,
  FileCheck,
  GraduationCap,
} from 'lucide-react';
import {
  Exam,
  ExamStatus,
  QuestionSelectionMethod,
} from '../../types';
import { useExam } from '../../contexts/ExamContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { ExamFormModal } from '../../components/exams/ExamFormModal';
import { ExamDetailModal } from '../../components/exams/ExamDetailModal';
import { ExamSimulatorModal } from '../../components/exams/ExamSimulatorModal';

export const ManajemenUjianAdminPage: React.FC = () => {
  const {
    exams,
    createExam,
    updateExam,
    deleteExam,
    duplicateExam,
    getDynamicStatus,
    currentServerTime,
    isSimulatedTime,
    resetToRealTime,
    resetAllExamsToSeed,
  } = useExam();

  const { subjects, teachers, classes, majors } = useMasterData();

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [detailExam, setDetailExam] = useState<Exam | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorTargetExam, setSimulatorTargetExam] = useState<Exam | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered Exams
  const filteredExams = useMemo(() => {
    return exams
      .map((e) => ({
        ...e,
        dynamic_status: getDynamicStatus(e),
        subject: subjects.find((s) => s.id === e.subject_id),
        teacher: teachers.find((t) => t.id === e.teacher_id),
        assigned_classes: classes.filter((c) => e.target_class_ids?.includes(c.id)),
      }))
      .filter((e) => {
        // Status filter
        if (statusFilter !== 'all' && e.dynamic_status !== statusFilter) {
          return false;
        }
        // Subject filter
        if (subjectFilter !== 'all' && e.subject_id !== subjectFilter) {
          return false;
        }
        // Grade filter
        if (gradeFilter !== 'all' && e.grade !== gradeFilter) {
          return false;
        }
        // Teacher filter
        if (teacherFilter !== 'all' && e.teacher_id !== teacherFilter) {
          return false;
        }
        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTitle = e.title.toLowerCase().includes(q);
          const matchSubj = e.subject?.name?.toLowerCase().includes(q) || e.subject?.code?.toLowerCase().includes(q);
          const matchTeacher = e.teacher?.full_name?.toLowerCase().includes(q);
          if (!matchTitle && !matchSubj && !matchTeacher) return false;
        }
        return true;
      });
  }, [exams, subjects, teachers, classes, statusFilter, subjectFilter, gradeFilter, teacherFilter, searchTerm, getDynamicStatus]);

  // Statistics
  const stats = useMemo(() => {
    const list = exams.map((e) => getDynamicStatus(e));
    return {
      total: exams.length,
      open: list.filter((s) => s === 'open').length,
      scheduled: list.filter((s) => s === 'scheduled').length,
      closed: list.filter((s) => s === 'closed' || s === 'archived').length,
      draft: list.filter((s) => s === 'draft').length,
    };
  }, [exams, getDynamicStatus]);

  // Format Helper
  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const getStatusBadge = (status: ExamStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            Sedang Berlangsung (Open)
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            Terjadwal (Scheduled)
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
            <Lock className="w-3 h-3 text-slate-500" />
            Ditutup (Closed)
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            Draf
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            Arsip
          </span>
        );
    }
  };

  const handleFormSubmit = async (
    examData: Omit<Exam, 'id' | 'created_at' | 'updated_at'>,
    selectedQuestionIds: string[],
    selectionMethod: QuestionSelectionMethod
  ) => {
    if (editingExam) {
      await updateExam(editingExam.id, examData, selectedQuestionIds);
      showToast('success', 'Konfigurasi ujian berhasil diperbarui.');
    } else {
      await createExam(examData, selectedQuestionIds, selectionMethod);
      showToast('success', 'Ujian dan jadwal baru berhasil dibuat serta di-snapshot.');
    }
  };

  const handleDuplicate = async (exam: Exam) => {
    try {
      await duplicateExam(exam.id);
      showToast('success', `Berhasil menduplikasi ujian "${exam.title}".`);
    } catch (e: any) {
      showToast('error', e.message || 'Gagal menduplikasi ujian.');
    }
  };

  const handleDelete = async (exam: Exam) => {
    if (confirm(`Apakah Anda yakin ingin menghapus ujian "${exam.title}"?`)) {
      await deleteExam(exam.id);
      showToast('success', 'Ujian berhasil dihapus.');
    }
  };

  const handleOpenSimulator = (exam?: Exam) => {
    setSimulatorTargetExam(exam || null);
    setIsSimulatorOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold text-white animate-slideIn ${
            notification.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Manajemen Jadwal & Ujian (CBT)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              FASE 4
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pisahkan bank soal dengan ujian, tentukan window waktu, durasi dinamis, dan snapshot butir soal
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleOpenSimulator()}
            className="px-3.5 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Uji Skenario / Test Suite</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingExam(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Ujian Baru</span>
          </button>
        </div>
      </div>

      {/* Time Simulator Banner (Notice if time travel is active) */}
      <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <span className="font-bold text-blue-950">Waktu Server Sistem: </span>
            <span className="font-mono font-bold text-blue-900">
              {currentServerTime.toLocaleString('id-ID', {
                dateStyle: 'full',
                timeStyle: 'medium',
              })} WIB
            </span>
            {isSimulatedTime && (
              <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-amber-200 text-amber-900 rounded-full">
                Mode Simulasi Aktif
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSimulatedTime ? (
            <button
              type="button"
              onClick={resetToRealTime}
              className="text-xs text-blue-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset ke Waktu Nyata</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenSimulator()}
              className="text-xs text-blue-700 font-semibold hover:underline cursor-pointer"
            >
              Ubah Simulasi Jam
            </button>
          )}
        </div>
      </div>

      {/* Bento Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Ujian Terdaftar</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            <span className="text-xs text-slate-400">Paket</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 block">Sedang Berlangsung (Open)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-700">{stats.open}</span>
            <span className="text-xs text-emerald-600">Aktif Dikerjakan</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-blue-200 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-700 block">Terjadwal (Scheduled)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-blue-700">{stats.scheduled}</span>
            <span className="text-xs text-blue-600">Mendatang</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Selesai / Ditutup (Closed)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-700">{stats.closed}</span>
            <span className="text-xs text-slate-400">Arsip</span>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari judul ujian, mata pelajaran, atau guru pembuat..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Status Tabs/Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto text-xs font-semibold">
            {[
              { id: 'all', label: 'Semua Status' },
              { id: 'open', label: 'Open' },
              { id: 'scheduled', label: 'Scheduled' },
              { id: 'closed', label: 'Closed' },
              { id: 'draft', label: 'Draft' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Mata Pelajaran</label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50/50 text-xs"
            >
              <option value="all">Semua Mapel</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Tingkat Kelas</label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50/50 text-xs"
            >
              <option value="all">Semua Tingkat</option>
              <option value="X">Kelas X</option>
              <option value="XI">Kelas XI</option>
              <option value="XII">Kelas XII</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Guru Pembuat</label>
            <select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50/50 text-xs"
            >
              <option value="all">Semua Guru</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end justify-end">
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setSubjectFilter('all');
                setGradeFilter('all');
                setTeacherFilter('all');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold py-1.5 cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Exams Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredExams.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">
              {exams.length === 0 ? 'Belum ada ujian.' : 'Tidak ada jadwal ujian yang ditemukan'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {exams.length === 0
                ? 'Jadwal pelaksanaan evaluasi akademik belum dikonfigurasi. Klik "Buat Ujian Baru" untuk memulai.'
                : 'Cobalah ubah filter pencarian atau buat jadwal ujian baru menggunakan tombol "Buat Ujian Baru".'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Nama Ujian & Sasaran</th>
                  <th className="px-4 py-3.5">Mata Pelajaran & Guru</th>
                  <th className="px-4 py-3.5">Window Jadwal (Start - End)</th>
                  <th className="px-4 py-3.5">Durasi & Soal</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Nama Ujian */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{exam.title}</div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 font-semibold text-slate-700">
                          Kelas {exam.grade}
                        </span>
                        <span>•</span>
                        <span>
                          {exam.assigned_classes && exam.assigned_classes.length > 0
                            ? `${exam.assigned_classes.length} Rombel Terdaftar`
                            : 'Semua Rombel'}
                        </span>
                      </div>
                    </td>

                    {/* Mapel & Guru */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{exam.subject?.name || 'Mata Pelajaran'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {exam.teacher?.full_name || 'Admin'}
                      </div>
                    </td>

                    {/* Window Jadwal */}
                    <td className="px-4 py-3.5">
                      <div className="text-slate-800 font-mono text-[11px]">
                        {formatDateTime(exam.start_at)}
                      </div>
                      <div className="text-slate-500 font-mono text-[10px] mt-0.5">
                        s.d {formatDateTime(exam.end_at)}
                      </div>
                    </td>

                    {/* Durasi & Soal */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-800">{exam.duration_minutes} Menit</div>
                      <div className="text-[11px] text-purple-700 mt-0.5 font-semibold">
                        {exam.total_questions} Butir (Snapshot)
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5">
                      {getStatusBadge(exam.dynamic_status)}
                    </td>

                    {/* Aksi */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailExam(exam)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Lihat Rincian Ujian"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenSimulator(exam)}
                          className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Uji Skenario CBT"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicate(exam)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Duplikasi Ujian"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingExam(exam);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Ubah Konfigurasi"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(exam)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Ujian"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {isFormOpen && (
        <ExamFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingExam(null);
          }}
          onSubmit={handleFormSubmit}
          initialData={editingExam}
        />
      )}

      {detailExam && (
        <ExamDetailModal
          exam={detailExam}
          isOpen={!!detailExam}
          onClose={() => setDetailExam(null)}
          onEdit={(exam) => {
            setDetailExam(null);
            setEditingExam(exam);
            setIsFormOpen(true);
          }}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onOpenTestSimulator={handleOpenSimulator}
        />
      )}

      {isSimulatorOpen && (
        <ExamSimulatorModal
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          targetExam={simulatorTargetExam}
        />
      )}
    </div>
  );
};
