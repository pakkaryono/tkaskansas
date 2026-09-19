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
  Eye,
  Edit,
  Trash2,
  Copy,
  Lock,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { Exam, ExamStatus, QuestionSelectionMethod } from '../../types';
import { useExam } from '../../contexts/ExamContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ExamFormModal } from '../../components/exams/ExamFormModal';
import { ExamDetailModal } from '../../components/exams/ExamDetailModal';
import { ExamSimulatorModal } from '../../components/exams/ExamSimulatorModal';

export const ManajemenUjianGuruPage: React.FC = () => {
  const {
    exams,
    createExam,
    updateExam,
    deleteExam,
    duplicateExam,
    getDynamicStatus,
    currentServerTime,
  } = useExam();

  const { subjects, teachers, classes, teacherSubjects } = useMasterData();
  const { profile } = useAuth();

  // Temukan relasi mata pelajaran yang diampu oleh Guru ini
  const myTeacher = teachers.find(t => t.id === profile?.id || t.user_id === profile?.id || t.email === profile?.email);
  const myTeacherId = myTeacher?.id || profile?.id || '';
  const myAssignedSubjectIds = useMemo(() => {
    return teacherSubjects
      .filter((ts) => ts.teacher_id === myTeacherId)
      .map((ts) => ts.subject_id);
  }, [teacherSubjects, myTeacherId]);

  const mySubjects = useMemo(() => {
    return subjects.filter((s) => myAssignedSubjectIds.includes(s.id));
  }, [subjects, myAssignedSubjectIds]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  // Modals
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

  // Filter STRICT GURU SCOPE: Hanya tampilkan ujian untuk mata pelajaran yang diampu oleh guru ini
  const myExams = useMemo(() => {
    return exams
      .filter((e) => {
        // Hak Akses RLS: Hanya ujian dari mapel yang diampu atau dibuat sendiri
        const isMySubject = myAssignedSubjectIds.length === 0 || myAssignedSubjectIds.includes(e.subject_id);
        const isMyCreation = e.teacher_id === myTeacherId;
        return isMySubject || isMyCreation;
      })
      .map((e) => ({
        ...e,
        dynamic_status: getDynamicStatus(e),
        subject: subjects.find((s) => s.id === e.subject_id),
        teacher: teachers.find((t) => t.id === e.teacher_id),
        assigned_classes: classes.filter((c) => e.target_class_ids?.includes(c.id)),
      }))
      .filter((e) => {
        if (statusFilter !== 'all' && e.dynamic_status !== statusFilter) return false;
        if (subjectFilter !== 'all' && e.subject_id !== subjectFilter) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTitle = e.title.toLowerCase().includes(q);
          const matchSubj = e.subject?.name?.toLowerCase().includes(q);
          if (!matchTitle && !matchSubj) return false;
        }
        return true;
      });
  }, [exams, myAssignedSubjectIds, myTeacherId, getDynamicStatus, subjects, teachers, classes, statusFilter, subjectFilter, searchTerm]);

  const handleFormSubmit = async (
    examData: Omit<Exam, 'id' | 'created_at' | 'updated_at'>,
    selectedQuestionIds: string[],
    selectionMethod: QuestionSelectionMethod
  ) => {
    // Validasi otorisasi guru: Dilarang memilih mapel di luar kewenangannya
    if (myAssignedSubjectIds.length > 0 && !myAssignedSubjectIds.includes(examData.subject_id)) {
      throw new Error('Otorisasi Ditolak: Anda hanya berwenang membuat ujian untuk mata pelajaran yang Anda ampu.');
    }

    if (editingExam) {
      await updateExam(editingExam.id, { ...examData, teacher_id: myTeacherId }, selectedQuestionIds);
      showToast('success', 'Ujian Anda berhasil diperbarui.');
    } else {
      await createExam(
        { ...examData, teacher_id: myTeacherId },
        selectedQuestionIds,
        selectionMethod
      );
      showToast('success', 'Jadwal & Ujian baru Anda berhasil dibuat.');
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
    if (confirm(`Hapus ujian "${exam.title}"?`)) {
      await deleteExam(exam.id);
      showToast('success', 'Ujian Anda berhasil dihapus.');
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Jadwal & Ujian Saya (Guru)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Mata Pelajaran Diampu
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kelola jadwal ujian, alokasi waktu, dan snapshot butir soal untuk mata pelajaran yang Anda bina
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setSimulatorTargetExam(myExams[0] || null);
              setIsSimulatorOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Uji Skenario CBT</span>
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

      {/* Teacher Authorization Banner */}
      <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <b>Otoritas Pengampu:</b> Anda terdaftar membina <b>{mySubjects.length} Mata Pelajaran</b>: {' '}
            {mySubjects.map((s) => s.name).join(', ') || 'Semua (Mode Demo)'}.
          </span>
        </div>
        <span className="text-[11px] text-emerald-800 font-mono">
          RLS Policy: teacher_subjects enforced
        </span>
      </div>

      {/* Toolbar & Filters */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari ujian saya..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50"
          >
            <option value="all">Semua Status</option>
            <option value="open">Sedang Berlangsung (Open)</option>
            <option value="scheduled">Terjadwal (Scheduled)</option>
            <option value="closed">Ditutup (Closed)</option>
            <option value="draft">Draf</option>
          </select>
        </div>
      </div>

      {/* List Ujian Guru */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {myExams.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-200 p-6">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Belum ada paket ujian</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Anda belum membuat jadwal ujian untuk mata pelajaran yang Anda ampu. Klik tombol "Buat Ujian Baru" di atas.
            </p>
          </div>
        ) : (
          myExams.map((exam) => (
            <div
              key={exam.id}
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    Kelas {exam.grade} • {exam.subject?.name}
                  </span>
                  {exam.dynamic_status === 'open' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Open
                    </span>
                  ) : exam.dynamic_status === 'scheduled' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      Scheduled
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                      Closed
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{exam.title}</h3>
                {exam.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{exam.description}</p>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Durasi:</span>
                    </span>
                    <span className="font-bold text-slate-900">{exam.duration_minutes} Menit</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Soal Snapshot:</span>
                    </span>
                    <span className="font-bold text-purple-700">{exam.total_questions} Butir</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Jadwal Window:</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-700">
                      {formatDateTime(exam.start_at)} s.d {formatDateTime(exam.end_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDetailExam(exam)}
                  className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Detail</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDuplicate(exam)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
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
                    className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Ubah Ujian"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(exam)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Hapus Ujian"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
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
          teacherSubjectIds={myAssignedSubjectIds}
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
