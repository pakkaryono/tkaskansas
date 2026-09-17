import React, { useState, useMemo } from 'react';
import {
  FileQuestion,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  CheckCircle2,
  XCircle,
  Download,
  Upload,
  Database,
  Layers,
  Award,
  BookOpen,
  ArrowUpDown,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import {
  Question,
  QuestionType,
  DifficultyLevel,
  QuestionStatus,
  QuestionFilterParams
} from '../../types';
import { useQuestionBank } from '../../contexts/QuestionBankContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import {
  QuestionDetailModal
} from '../../components/questions/QuestionDetailModal';
import { QuestionFormModal } from '../../components/questions/QuestionFormModal';
import { RichTextViewer } from '../../components/common/RichTextViewer';
import { SUPABASE_PHASE_3_SQL } from '../../lib/supabaseSchema';
import { ImportWizardModal } from '../../components/importExport/ImportWizardModal';
import { QuestionTemplateGuideModal } from '../../components/importExport/QuestionTemplateGuideModal';
import { exportEntityToExcel, downloadTemplateExcel } from '../../lib/excelEngine';
import { FileSpreadsheet, HelpCircle } from 'lucide-react';

export const BankSoalAdminPage: React.FC = () => {
  const {
    questions,
    loading,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    duplicateQuestion,
    toggleQuestionStatus,
    exportQuestions,
    syncWithSupabase,
  } = useQuestionBank();

  const { subjects, teachers, majors } = useMasterData();

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('');
  const [selectedType, setSelectedType] = useState<QuestionType | ''>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<QuestionStatus | ''>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [detailQuestion, setDetailQuestion] = useState<Question | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Handle Export Excel (.xlsx) following active filter
  const handleExportExcel = () => {
    try {
      exportEntityToExcel('bank_soal', filteredQuestions, {
        subjects,
        teachers,
        majors,
      });
      setActionNotice(`Berhasil mengekspor ${filteredQuestions.length} butir soal ke format Excel (.xlsx).`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      alert(`Gagal mengekspor soal: ${err.message}`);
    }
  };

  // Filter Logic
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchCode = q.code.toLowerCase().includes(query);
        const matchText = q.question_text.toLowerCase().includes(query);
        const matchSub = q.subject?.name.toLowerCase().includes(query);
        if (!matchCode && !matchText && !matchSub) return false;
      }

      // Subject
      if (selectedSubject && q.subject_id !== selectedSubject) return false;

      // Teacher
      if (selectedTeacher && q.teacher_id !== selectedTeacher) return false;

      // Grade
      if (selectedGrade && q.grade !== selectedGrade) return false;

      // Major
      if (selectedMajor && q.major_id && q.major_id !== selectedMajor) return false;

      // Type
      if (selectedType && q.question_type !== selectedType) return false;

      // Difficulty
      if (selectedDifficulty && q.difficulty !== selectedDifficulty) return false;

      // Status
      if (selectedStatus && q.status !== selectedStatus) return false;

      return true;
    });
  }, [
    questions,
    search,
    selectedSubject,
    selectedTeacher,
    selectedGrade,
    selectedMajor,
    selectedType,
    selectedDifficulty,
    selectedStatus,
  ]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / itemsPerPage));
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredQuestions.slice(start, start + itemsPerPage);
  }, [filteredQuestions, currentPage]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: questions.length,
      singleChoice: questions.filter((q) => q.question_type === 'single_choice').length,
      complexChoice: questions.filter((q) => q.question_type === 'complex_choice').length,
      essay: questions.filter((q) => q.question_type === 'essay').length,
      matching: questions.filter((q) => q.question_type === 'matching').length,
    };
  }, [questions]);

  // Handlers
  const handleOpenAdd = () => {
    setEditingQuestion(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (q: Question) => {
    setEditingQuestion(q);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: Omit<Question, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingQuestion) {
      await updateQuestion(editingQuestion.id, data);
      showTemporaryNotice(`Soal "${data.code}" berhasil diperbarui.`);
    } else {
      const created = await addQuestion(data);
      showTemporaryNotice(`Soal baru "${created.code}" berhasil ditambahkan ke Bank Soal.`);
    }
  };

  const handleDuplicate = async (q: Question) => {
    try {
      const dup = await duplicateQuestion(q.id);
      showTemporaryNotice(`Soal ${q.code} berhasil diduplikasi menjadi ${dup.code} dengan ID baru.`);
    } catch (err: any) {
      alert('Gagal menduplikasi: ' + err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteQuestion(deleteTarget.id);
    showTemporaryNotice(`Soal ${deleteTarget.code} berhasil dihapus.`);
    setDeleteTarget(null);
  };

  const handleToggleStatus = async (q: Question) => {
    await toggleQuestionStatus(q.id);
    showTemporaryNotice(`Status soal ${q.code} diubah menjadi ${q.status === 'active' ? 'Nonaktif' : 'Aktif'}.`);
  };

  const showTemporaryNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedSubject('');
    setSelectedTeacher('');
    setSelectedGrade('');
    setSelectedMajor('');
    setSelectedType('');
    setSelectedDifficulty('');
    setSelectedStatus('');
    setCurrentPage(1);
  };

  const getTypeBadge = (type: QuestionType) => {
    switch (type) {
      case 'single_choice':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">PG Biasa</span>;
      case 'complex_choice':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">PG Kompleks</span>;
      case 'essay':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">Esai</span>;
      case 'matching':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800">Menjodohkan</span>;
    }
  };

  const getDiffBadge = (diff: DifficultyLevel) => {
    switch (diff) {
      case 'easy':
        return <span className="text-[11px] font-semibold text-emerald-700">Mudah</span>;
      case 'medium':
        return <span className="text-[11px] font-semibold text-amber-700">Sedang</span>;
      case 'hard':
        return <span className="text-[11px] font-semibold text-rose-700">Sukar</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {actionNotice && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-emerald-800 text-white rounded-xl shadow-xl flex items-center gap-3 border border-emerald-700 animate-slideIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          <span className="text-xs sm:text-sm font-semibold">{actionNotice}</span>
        </div>
      )}

      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <FileQuestion className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Bank Soal (Administrator)</h1>
              <p className="text-xs text-slate-500">
                Pusat instrumen evaluasi TKA SMKN 1 Songgom • 4 Tipe Soal Terstandar
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Guide Button */}
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Panduan Format Excel 4 Jenis Soal"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">Panduan Format</span>
          </button>

          {/* Template Button */}
          <button
            type="button"
            onClick={() => downloadTemplateExcel('bank_soal')}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Unduh Template Excel Bank Soal"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Template</span>
          </button>

          {/* Import Button */}
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Excel</span>
          </button>

          {/* Export Button (.xlsx) */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredQuestions.length === 0}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer ${
              filteredQuestions.length > 0
                ? 'bg-slate-800 hover:bg-slate-900 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export ({filteredQuestions.length})</span>
          </button>

          {/* Tambah Soal Button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Soal Baru</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Soal</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">PG Biasa</div>
          <div className="text-xl font-extrabold text-blue-950 mt-1">{stats.singleChoice}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">PG Kompleks</div>
          <div className="text-xl font-extrabold text-purple-950 mt-1">{stats.complexChoice}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Esai Singkat</div>
          <div className="text-xl font-extrabold text-amber-950 mt-1">{stats.essay}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">Menjodohkan</div>
          <div className="text-xl font-extrabold text-teal-950 mt-1">{stats.matching}</div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <span>Penyaringan & Pencarian Soal</span>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] text-emerald-700 hover:underline font-semibold cursor-pointer"
          >
            Reset Filter
          </button>
        </div>

        {/* Input Search & Selects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari kode atau teks soal..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Mapel */}
          <select
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Mata Pelajaran</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>

          {/* Guru */}
          <select
            value={selectedTeacher}
            onChange={(e) => {
              setSelectedTeacher(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Guru Pembuat</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>

          {/* Tipe Soal */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Tipe Soal</option>
            <option value="single_choice">Pilihan Ganda Biasa</option>
            <option value="complex_choice">Pilihan Ganda Kompleks</option>
            <option value="essay">Esai Singkat</option>
            <option value="matching">Menjodohkan</option>
          </select>

          {/* Tingkat */}
          <select
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Tingkat</option>
            <option value="X">Kelas X</option>
            <option value="XI">Kelas XI</option>
            <option value="XII">Kelas XII</option>
          </select>

          {/* Jurusan */}
          <select
            value={selectedMajor}
            onChange={(e) => {
              setSelectedMajor(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Jurusan</option>
            {majors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} - {m.name}
              </option>
            ))}
          </select>

          {/* Kesulitan */}
          <select
            value={selectedDifficulty}
            onChange={(e) => {
              setSelectedDifficulty(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Kesulitan</option>
            <option value="easy">Mudah</option>
            <option value="medium">Sedang</option>
            <option value="hard">Sukar</option>
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="draft">Draf</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Tabel Butir Soal */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Kode & Soal</th>
                <th className="py-3 px-4">Mata Pelajaran / Guru</th>
                <th className="py-3 px-4 text-center">Tipe Soal</th>
                <th className="py-3 px-4 text-center">Tingkat / Poin</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedQuestions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <FileQuestion className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">
                      {questions.length === 0 ? 'Belum ada bank soal.' : 'Tidak ada butir soal yang sesuai kriteria pencarian.'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {questions.length === 0
                        ? 'Silakan tambahkan butir soal baru atau gunakan fitur Import Excel.'
                        : 'Coba ubah kata kunci pencarian atau reset filter mata pelajaran.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedQuestions.map((q, idx) => {
                  const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* No */}
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-medium">
                        {itemIndex}
                      </td>

                      {/* Kode & Soal */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {q.code}
                          </span>
                          {q.image_url && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              +Gambar
                            </span>
                          )}
                        </div>
                        <div className="text-slate-700 line-clamp-2 text-xs font-normal">
                          <RichTextViewer content={q.question_text} />
                        </div>
                      </td>

                      {/* Mapel & Guru */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{q.subject?.name || 'Mata Pelajaran'}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{q.teacher?.full_name || 'Guru'}</span>
                          <span>•</span>
                          <span>{q.major?.name || 'Umum'}</span>
                        </div>
                      </td>

                      {/* Tipe Soal */}
                      <td className="py-3.5 px-4 text-center">{getTypeBadge(q.question_type)}</td>

                      {/* Tingkat & Poin */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-slate-800">Kelas {q.grade}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {q.points} Poin • {getDiffBadge(q.difficulty)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(q)}
                          title="Klik untuk mengubah status aktif/nonaktif"
                          className="cursor-pointer inline-block"
                        >
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide inline-flex items-center gap-1 ${
                              q.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : q.status === 'draft'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                q.status === 'active'
                                  ? 'bg-emerald-500'
                                  : q.status === 'draft'
                                  ? 'bg-amber-500'
                                  : 'bg-slate-400'
                              }`}
                            />
                            {q.status === 'active' ? 'Aktif' : q.status === 'draft' ? 'Draf' : 'Nonaktif'}
                          </span>
                        </button>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Detail */}
                          <button
                            type="button"
                            onClick={() => setDetailQuestion(q)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Lihat Detail & Kunci Jawaban"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Duplikasi */}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(q)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Duplikasi Soal (ID Baru)"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(q)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Ubah Soal"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Hapus */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(q)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Soal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            Menampilkan <strong>{paginatedQuestions.length}</strong> dari <strong>{filteredQuestions.length}</strong> butir soal
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              Sebelumnya
            </button>
            <span className="px-3 py-1.5 text-slate-700 font-semibold">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Modal Tambah / Ubah Soal */}
      <QuestionFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingQuestion}
      />

      {/* Modal Detail Soal */}
      <QuestionDetailModal
        isOpen={!!detailQuestion}
        question={detailQuestion}
        onClose={() => setDetailQuestion(null)}
        onEdit={(q) => handleOpenEdit(q)}
        onDuplicate={(q) => handleDuplicate(q)}
        canEdit={true}
      />

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Konfirmasi Hapus Soal</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-700">
              Apakah Anda yakin ingin menghapus butir soal <strong className="font-mono">{deleteTarget.code}</strong>? Seluruh data opsi, jawaban acuan, dan gambar terkait akan dihapus.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Skema SQL & RLS */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Skema Supabase Fase 3 & RLS Bank Soal</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto font-mono text-[11px] bg-slate-950 text-emerald-300">
              <pre className="whitespace-pre-wrap">{SUPABASE_PHASE_3_SQL}</pre>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">Mencakup tabel questions, options, answers, matching_pairs, storage, dan RLS.</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(SUPABASE_PHASE_3_SQL);
                  alert('DDL SQL Fase 3 berhasil disalin ke clipboard!');
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 cursor-pointer"
              >
                Salin SQL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Impor Soal (Fase 8 Wizard) */}
      <ImportWizardModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        initialEntityType="bank_soal"
        onSuccess={(summary) => {
          setActionNotice(`Berhasil mengimpor ${summary.successCount} butir soal baru ke Bank Soal.`);
          setTimeout(() => setActionNotice(null), 4000);
        }}
      />

      {/* Guide Modal Format Soal */}
      <QuestionTemplateGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    </div>
  );
};
