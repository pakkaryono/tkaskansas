import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Search,
  Calendar,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  Lock,
  Printer,
  Sparkles,
  BookOpen,
  Check,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { useExam } from '../../contexts/ExamContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ExamAttempt } from '../../types';
import { StudentResultDetailModal } from '../../components/grading/StudentResultDetailModal';
import { exportEntityToExcel } from '../../lib/excelEngine';

export const LaporanSiswaPage: React.FC = () => {
  const { exams, examAttempts, getAttemptResultSummary } = useExam();
  const { students, classes, majors, subjects } = useMasterData();
  const { profile } = useAuth();

  // 1. Resolve current logged-in student securely
  const currentStudent = useMemo(() => {
    if (!profile) return students[0];
    const byEmail = students.find(
      (s) => s.email?.toLowerCase() === profile.email?.toLowerCase()
    );
    if (byEmail) return byEmail;
    const byId = students.find((s) => s.id === profile.id);
    if (byId) return byId;
    return students[0]; // Fallback in demo
  }, [profile, students]);

  const studentClass = useMemo(() => {
    return classes.find((c) => c.id === currentStudent?.class_id);
  }, [classes, currentStudent]);

  const studentMajor = useMemo(() => {
    return majors.find(
      (m) => m.id === currentStudent?.major_id || m.id === studentClass?.major_id
    );
  }, [majors, currentStudent, studentClass]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('all');

  // Modal State
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Student results list (STRICTLY ISOLATED TO THIS STUDENT)
  const studentResults = useMemo(() => {
    if (!currentStudent) return [];

    const myAttempts = examAttempts.filter(
      (a) =>
        a.student_id === currentStudent.id &&
        (a.status === 'submitted' || a.status === 'expired')
    );

    return myAttempts.map((att, idx) => {
      const summary = getAttemptResultSummary(att.id);
      const exam = exams.find((e) => e.id === att.exam_id);
      const subject = subjects.find((s) => s.id === exam?.subject_id);

      const passScore = exam?.pass_score ?? 75;
      const nilaiVal = summary?.nilai ?? (att.score ?? 0);
      const pendingEssay = summary?.pending_essay ?? 0;

      const completedDate = att.end_time || att.updated_at || att.created_at;
      const dateObj = new Date(completedDate);
      const displayDate = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '-';

      // Check exam settings for student review
      const isReviewAllowed = exam?.show_result !== false;

      return {
        no: idx + 1,
        attempt: att,
        examId: att.exam_id,
        examTitle: exam?.title || 'Ujian',
        subjectName: subject?.name || 'Mata Pelajaran',
        dateDisplay: displayDate,
        totalQuestions: summary?.jumlah_soal ?? exam?.total_questions ?? 0,
        correct: summary?.benar ?? 0,
        incorrect: summary?.salah ?? 0,
        empty: summary?.kosong ?? 0,
        score: summary?.skor ?? 0,
        maxScore: summary?.maximum_score ?? 100,
        nilai: nilaiVal,
        duration: summary?.durasi || '-',
        isPassed: nilaiVal >= passScore,
        passScore: passScore,
        pendingEssay: pendingEssay,
        gradeCode: summary?.kategori_nilai?.code || 'B',
        gradeLabel: summary?.kategori_nilai?.label || 'Baik',
        isReviewAllowed: isReviewAllowed,
        exam: exam,
      };
    });
  }, [examAttempts, currentStudent, getAttemptResultSummary, exams, subjects]);

  // Filtered results
  const filteredResults = useMemo(() => {
    return studentResults.filter((r) => {
      if (filterSubjectId !== 'all') {
        const exam = exams.find((e) => e.id === r.examId);
        if (exam?.subject_id !== filterSubjectId) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = r.examTitle.toLowerCase().includes(q);
        const matchSub = r.subjectName.toLowerCase().includes(q);
        if (!matchTitle && !matchSub) return false;
      }
      return true;
    });
  }, [studentResults, filterSubjectId, searchQuery, exams]);

  // Student summary analytics
  const studentStats = useMemo(() => {
    if (studentResults.length === 0) {
      return { totalExams: 0, averageNilai: 0, highestNilai: 0, passedExams: 0 };
    }
    let totalNilai = 0;
    let highest = -Infinity;
    let passed = 0;

    studentResults.forEach((r) => {
      totalNilai += r.nilai;
      if (r.nilai > highest) highest = r.nilai;
      if (r.isPassed) passed++;
    });

    return {
      totalExams: studentResults.length,
      averageNilai: Math.round((totalNilai / studentResults.length) * 10) / 10,
      highestNilai: highest === -Infinity ? 0 : highest,
      passedExams: passed,
    };
  }, [studentResults]);

  const handleOpenDetail = (item: (typeof studentResults)[0]) => {
    if (!item.isReviewAllowed) {
      alert('Penguji belum mengizinkan ulasan lembar jawaban untuk ujian ini.');
      return;
    }
    setSelectedAttempt(item.attempt);
    setIsDetailModalOpen(true);
  };

  const handleExportExcel = () => {
    exportEntityToExcel(
      'laporan',
      filteredResults.map((r) => ({
        studentName: currentStudent?.full_name,
        nis: currentStudent?.nis,
        nisn: currentStudent?.nisn,
        className: studentClass?.name,
        majorName: studentMajor?.name,
        subjectName: r.subjectName,
        examTitle: r.examTitle,
        teacherName: '-',
        submittedAt: r.submittedAt,
        totalQuestions: r.totalQuestions,
        correctCount: r.correctCount,
        incorrectCount: r.incorrectCount,
        unansweredCount: r.unansweredCount,
        score: r.score,
        nilai: r.nilai,
        isPassed: r.isPassed,
        durationFormatted: r.durationMinutes ? `${r.durationMinutes} menit` : '-',
      })),
      undefined,
      `Rapor_Ujian_${currentStudent?.full_name?.replace(/\s+/g, '_') || 'Siswa'}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 backdrop-blur-md mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fase 7: Buku Rapor Hasil Ujian Mandiri Siswa</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Transkrip & Hasil Ujian Anda
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200/90 mt-1 leading-relaxed">
            Selamat datang, <strong className="text-white">{currentStudent?.full_name}</strong> (NISN:{' '}
            {currentStudent?.nisn || '-'} • Kelas: {studentClass?.name || '-'}). Anda dapat melihat
            rekapitulasi nilai, statistik ketuntasan, dan ulasan jawaban sesuai kebijakan penguji.
          </p>
        </div>

        {/* Quick Stats on Header */}
        <div className="mt-6 pt-6 border-t border-indigo-700/50 grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider block">
              Ujian Diselesaikan
            </span>
            <span className="text-xl font-black text-white">{studentStats.totalExams} Ujian</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider block">
              Rata-Rata Nilai
            </span>
            <span className="text-xl font-black text-white">{studentStats.averageNilai}</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider block">
              Nilai Tertinggi
            </span>
            <span className="text-xl font-black text-emerald-300">{studentStats.highestNilai}</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider block">
              Ketuntasan (KKM)
            </span>
            <span className="text-xl font-black text-white">
              {studentStats.passedExams} / {studentStats.totalExams}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul ujian atau mata pelajaran..."
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 shrink-0">Mapel:</span>
          <select
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none"
          >
            <option value="all">Semua Mata Pelajaran</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Table (Responsive Desktop & Mobile) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Daftar Hasil Ujian Anda
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              {filteredResults.length} Ujian Ditemukan
            </span>
            <button
              onClick={handleExportExcel}
              disabled={filteredResults.length === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filteredResults.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              title="Unduh Rapor Hasil Ujian (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Unduh Rapor (.xlsx)</span>
            </button>
          </div>
        </div>

        {filteredResults.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">Belum Ada Riwayat Hasil Ujian</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Hasil ujian yang telah Anda selesaikan akan otomatis tampil di halaman ini beserta rincian skor.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Ujian</th>
                  <th className="px-4 py-3">Mata Pelajaran</th>
                  <th className="px-3 py-3">Tanggal</th>
                  <th className="px-3 py-3 text-center">Jumlah Soal</th>
                  <th className="px-3 py-3 text-center">B / S / K</th>
                  <th className="px-3 py-3 text-center">Skor</th>
                  <th className="px-3 py-3 text-center">Nilai</th>
                  <th className="px-3 py-3 text-center">Durasi</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResults.map((item) => (
                  <tr key={item.attempt.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900">{item.examTitle}</p>
                      <p className="text-[10px] text-slate-400">ID: {item.attempt.id}</p>
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-slate-700">
                      {item.subjectName}
                    </td>

                    <td className="px-3 py-3.5 text-slate-500 whitespace-nowrap">
                      {item.dateDisplay}
                    </td>

                    <td className="px-3 py-3.5 text-center font-bold text-slate-700">
                      {item.totalQuestions} Soal
                    </td>

                    <td className="px-3 py-3.5 text-center whitespace-nowrap">
                      <span className="font-bold text-emerald-600">{item.correct}</span> /{' '}
                      <span className="font-bold text-rose-600">{item.incorrect}</span> /{' '}
                      <span className="font-bold text-amber-600">{item.empty}</span>
                    </td>

                    <td className="px-3 py-3.5 text-center font-semibold text-slate-700">
                      {item.score} / {item.maxScore}
                    </td>

                    <td className="px-3 py-3.5 text-center">
                      <div className="flex flex-col items-center">
                        <span
                          className={`text-base font-black ${
                            item.isPassed ? 'text-indigo-600' : 'text-rose-600'
                          }`}
                        >
                          {item.nilai}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          Grade {item.gradeCode}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-3.5 text-center text-slate-500 whitespace-nowrap">
                      {item.duration}
                    </td>

                    <td className="px-3 py-3.5 text-center whitespace-nowrap">
                      {item.pendingEssay > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 animate-pulse">
                          <Clock className="w-3 h-3" /> Koreksi Esai
                        </span>
                      ) : item.isPassed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Tuntas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3" /> Remedial
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {item.isReviewAllowed ? (
                        <button
                          onClick={() => handleOpenDetail(item)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Buka Lembar</span>
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg"
                          title="Penguji menonaktifkan review lembar jawaban"
                        >
                          <Lock className="w-3 h-3" /> Terkunci
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal for Student */}
      {isDetailModalOpen && selectedAttempt && (
        <StudentResultDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          attempt={selectedAttempt}
          studentName={currentStudent?.full_name || 'Siswa'}
          studentNisn={currentStudent?.nisn}
          studentClass={studentClass?.name}
          examTitle={exams.find((e) => e.id === selectedAttempt.exam_id)?.title || 'Ujian'}
          canGradeEssay={false} // Student CANNOT edit essay grades
        />
      )}
    </div>
  );
};
