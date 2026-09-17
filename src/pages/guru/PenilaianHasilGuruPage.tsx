import React, { useState, useMemo } from 'react';
import {
  Award,
  Search,
  Filter,
  Eye,
  FileText,
  Clock,
  CheckCircle2,
  Download,
  BookOpen,
  Users,
} from 'lucide-react';
import { useExam } from '../../contexts/ExamContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ExamAttempt, QuestionResultDetail } from '../../types';
import { StudentResultDetailModal } from '../../components/grading/StudentResultDetailModal';
import { EssayGradingModal } from '../../components/grading/EssayGradingModal';

export const PenilaianHasilGuruPage: React.FC = () => {
  const { exams, examAttempts, getAttemptResultSummary } = useExam();
  const { students, classes, subjects, teachers } = useMasterData();
  const { profile } = useAuth();

  // Guru Profile identifier
  const currentTeacher = useMemo(() => {
    return teachers.find((t) => t.email === profile?.email) || teachers[0];
  }, [teachers, profile]);

  // Filter state
  const [selectedExamId, setSelectedExamId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedEssayAttempt, setSelectedEssayAttempt] = useState<ExamAttempt | null>(null);
  const [selectedEssayDetail, setSelectedEssayDetail] = useState<QuestionResultDetail | null>(null);
  const [isEssayModalOpen, setIsEssayModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Ujian milik guru ini (atau semua jika demo)
  const teacherExams = useMemo(() => {
    if (!currentTeacher) return exams;
    const own = exams.filter((e) => e.teacher_id === currentTeacher.id);
    return own.length > 0 ? own : exams;
  }, [exams, currentTeacher]);

  const teacherExamIds = useMemo(() => teacherExams.map((e) => e.id), [teacherExams]);

  // Completed attempts for teacher's exams
  const completedAttempts = useMemo(() => {
    return examAttempts.filter(
      (a) =>
        teacherExamIds.includes(a.exam_id) &&
        (a.status === 'submitted' || a.status === 'expired')
    );
  }, [examAttempts, teacherExamIds]);

  const filteredAttempts = useMemo(() => {
    return completedAttempts.filter((att) => {
      if (selectedExamId !== 'all' && att.exam_id !== selectedExamId) return false;

      const student = students.find((s) => s.id === att.student_id);
      if (selectedClassId !== 'all' && student?.class_id !== selectedClassId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const studentName = (student?.full_name || (student as any)?.name || '').toLowerCase();
        const nisn = student?.nisn?.toLowerCase() || '';
        const exam = exams.find((e) => e.id === att.exam_id);
        const examTitle = exam?.title?.toLowerCase() || '';
        if (!studentName.includes(q) && !nisn.includes(q) && !examTitle.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [completedAttempts, selectedExamId, selectedClassId, searchQuery, students, exams]);

  // Pending essay queue for teacher
  const pendingEssayQueue = useMemo(() => {
    const queue: Array<{
      attempt: ExamAttempt;
      detail: QuestionResultDetail;
      studentName: string;
      studentNisn?: string;
      studentClass?: string;
      examTitle: string;
    }> = [];

    completedAttempts.forEach((att) => {
      const summary = getAttemptResultSummary(att.id);
      if (!summary || summary.pending_essay === 0) return;

      const student = students.find((s) => s.id === att.student_id);
      const exam = exams.find((e) => e.id === att.exam_id);

      summary.question_details.forEach((qd) => {
        if (qd.question_type === 'essay' && qd.status === 'pending_grading') {
          queue.push({
            attempt: att,
            detail: qd,
            studentName: student?.full_name || (student as any)?.name || 'Siswa',
            studentNisn: student?.nisn,
            studentClass: classes.find((c) => c.id === student?.class_id)?.name,
            examTitle: exam?.title || 'Ujian',
          });
        }
      });
    });

    return queue;
  }, [completedAttempts, getAttemptResultSummary, students, exams, classes]);

  const handleExportLeger = () => {
    const csvRows: string[] = [];
    csvRows.push([
      'No',
      'NISN',
      'Nama Siswa',
      'Kelas',
      'Judul Ujian',
      'Total Soal',
      'Benar',
      'Salah',
      'Kosong',
      'Skor Poin',
      'Nilai (0-100)',
      'Predikat (Grade)',
      'Status Esai',
    ].join(','));

    filteredAttempts.forEach((att, idx) => {
      const summary = getAttemptResultSummary(att.id);
      const student = students.find((s) => s.id === att.student_id);
      const exam = exams.find((e) => e.id === att.exam_id);
      const studentClass = classes.find((c) => c.id === student?.class_id);

      csvRows.push([
        idx + 1,
        `"${student?.nisn || '-'}"`,
        `"${student?.full_name || (student as any)?.name || '-'}"`,
        `"${studentClass?.name || '-'}"`,
        `"${exam?.title || '-'}"`,
        summary?.jumlah_soal || 0,
        summary?.benar || 0,
        summary?.salah || 0,
        summary?.kosong || 0,
        summary?.skor || 0,
        summary?.nilai || 0,
        `"${summary?.kategori_nilai?.grade_code || '-'}"`,
        `"${(summary?.pending_essay || 0) > 0 ? 'Pending Esai' : 'Final'}"`,
      ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Nilai_Siswa_Guru_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Leger nilai siswa berhasil diunduh.');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              Panel Penilaian Guru
            </span>
            <span className="text-xs text-slate-400 font-medium">•</span>
            <span className="text-xs text-slate-500 font-medium">SMKN 1 Songgom</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Penilaian Hasil Ujian & Koreksi Esai
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Periksa lembar jawaban, berikan skor & masukan esai, dan pantau capaian kompetensi siswa Anda.
          </p>
        </div>

        <button
          onClick={handleExportLeger}
          disabled={filteredAttempts.length === 0}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Ekspor Rekap Nilai</span>
        </button>
      </div>

      {/* Pending Essay Attention Banner */}
      {pendingEssayQueue.length > 0 && (
        <div className="bg-gradient-to-r from-purple-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {pendingEssayQueue.length} Jawaban Esai Menunggu Penilaian Anda
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Siswa telah mengumpulkan ujian. Silakan buka lembar jawaban esai untuk memberikan skor dan umpan balik.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const first = pendingEssayQueue[0];
              setSelectedEssayAttempt(first.attempt);
              setSelectedEssayDetail(first.detail);
              setIsEssayModalOpen(true);
            }}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow transition shrink-0"
          >
            <FileText className="w-4 h-4" />
            <span>Mulai Koreksi Esai Sekarang</span>
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa atau mata ujian..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Ujian</option>
              {teacherExams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Rombel</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Attempts Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Nama Siswa</th>
                <th className="px-4 py-3">Ujian</th>
                <th className="px-4 py-3 text-center">B / S / K</th>
                <th className="px-4 py-3 text-center">Skor Poin</th>
                <th className="px-4 py-3 text-center">Nilai</th>
                <th className="px-4 py-3 text-center">Predikat</th>
                <th className="px-4 py-3 text-center">Status Esai</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAttempts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                    Belum ada data pengerjaan ujian siswa yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredAttempts.map((att) => {
                  const summary = getAttemptResultSummary(att.id);
                  const student = students.find((s) => s.id === att.student_id);
                  const exam = exams.find((e) => e.id === att.exam_id);
                  const studentClass = classes.find((c) => c.id === student?.class_id);

                  return (
                    <tr key={att.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">
                          {student?.full_name || (student as any)?.name || 'Siswa'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {studentClass?.name || '-'} • NISN: {student?.nisn || '-'}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 line-clamp-1">{exam?.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {summary?.durasi_pengerjaan || '-'}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-emerald-600">{summary?.benar}</span> /{' '}
                        <span className="font-semibold text-rose-600">{summary?.salah}</span> /{' '}
                        <span className="font-semibold text-amber-600">{summary?.kosong}</span>
                      </td>

                      <td className="px-4 py-3 text-center font-semibold text-slate-700">
                        {summary?.skor} / {summary?.maximum_score}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-sm font-black ${
                            (summary?.nilai || 0) >= 75 ? 'text-indigo-600' : 'text-rose-600'
                          }`}
                        >
                          {summary?.nilai ?? 0}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {summary?.kategori_nilai ? (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                              summary.kategori_nilai.color || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {summary.kategori_nilai.grade_code}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {(summary?.pending_essay || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 animate-pulse">
                            <Clock className="w-3 h-3" /> {summary?.pending_essay} Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Selesai
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedAttempt(att);
                            setIsDetailModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lembar Ujian</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Result Detail Modal */}
      {isDetailModalOpen && selectedAttempt && (
        <StudentResultDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          attempt={selectedAttempt}
          studentName={
            students.find((s) => s.id === selectedAttempt.student_id)?.full_name || 'Siswa'
          }
          studentNisn={
            students.find((s) => s.id === selectedAttempt.student_id)?.nisn
          }
          studentClass={
            classes.find(
              (c) =>
                c.id ===
                students.find((s) => s.id === selectedAttempt.student_id)?.class_id
            )?.name
          }
          examTitle={
            exams.find((e) => e.id === selectedAttempt.exam_id)?.title || 'Ujian'
          }
          canGradeEssay={true}
        />
      )}

      {/* Quick Essay Modal */}
      {isEssayModalOpen && selectedEssayAttempt && selectedEssayDetail && (
        <EssayGradingModal
          isOpen={isEssayModalOpen}
          onClose={() => {
            setIsEssayModalOpen(false);
            setSelectedEssayAttempt(null);
            setSelectedEssayDetail(null);
          }}
          attempt={selectedEssayAttempt}
          detail={selectedEssayDetail}
          studentName={
            students.find((s) => s.id === selectedEssayAttempt.student_id)?.full_name || 'Siswa'
          }
          studentNisn={
            students.find((s) => s.id === selectedEssayAttempt.student_id)?.nisn
          }
          studentClass={
            classes.find(
              (c) =>
                c.id ===
                students.find((s) => s.id === selectedEssayAttempt.student_id)?.class_id
            )?.name
          }
          examTitle={
            exams.find((e) => e.id === selectedEssayAttempt.exam_id)?.title || 'Ujian'
          }
          onGradedSuccess={() => {
            showToast('Nilai esai berhasil disimpan dan nilai rapor siswa telah diperbarui.');
          }}
        />
      )}
    </div>
  );
};
