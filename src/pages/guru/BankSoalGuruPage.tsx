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
  ShieldCheck,
  Download,
  AlertCircle,
  BookOpen,
  Award,
  Lock,
  Upload,
  FileSpreadsheet,
  HelpCircle,
} from 'lucide-react';
import {
  Question,
  QuestionType,
  DifficultyLevel,
  QuestionStatus,
} from '../../types';
import { useQuestionBank } from '../../contexts/QuestionBankContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { QuestionDetailModal } from '../../components/questions/QuestionDetailModal';
import { QuestionFormModal } from '../../components/questions/QuestionFormModal';
import { RichTextViewer } from '../../components/common/RichTextViewer';
import { ImportWizardModal } from '../../components/importExport/ImportWizardModal';
import { QuestionTemplateGuideModal } from '../../components/importExport/QuestionTemplateGuideModal';
import { exportEntityToExcel, downloadTemplateExcel } from '../../lib/excelEngine';

export const BankSoalGuruPage: React.FC = () => {
  const { profile } = useAuth();
  const {
    questions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    duplicateQuestion,
    toggleQuestionStatus,
    exportQuestions,
  } = useQuestionBank();

  const { subjects, teachers, teacherSubjects, majors } = useMasterData();

  // Dapatkan daftar Mapel yang diampu oleh Guru yang sedang login
  const currentTeacher = useMemo(() => {
    if (!profile) return null;
    return (
      teachers.find((t) => t.id === profile.id || t.email === profile.email) ||
      teachers.find((t) => t.email === 'siti.aminah@smkn1songgom.sch.id') ||
      teachers[0]
    );
  }, [profile, teachers]);

  const assignedSubjectIds = useMemo(() => {
    if (!currentTeacher) return [];

    // Cari dari relasi teacherSubjects
    const relations = teacherSubjects.filter((ts) => ts.teacher_id === currentTeacher.id);
    if (relations.length > 0) {
      return relations.map((r) => r.subject_id);
    }

    // Fallback jika belum ada di tabel relasi (misal mapel yang diampu Siti Aminah di demo)
    return subjects.slice(0, 3).map((s) => s.id);
  }, [currentTeacher, teacherSubjects, subjects]);

  const assignedSubjects = useMemo(() => {
    return subjects.filter((s) => assignedSubjectIds.includes(s.id) || assignedSubjectIds.includes(s.code));
  }, [subjects, assignedSubjectIds]);

  // Filter HANYA butir soal untuk mata pelajaran yang diampu oleh guru ini
  const teacherAuthorizedQuestions = useMemo(() => {
    return questions.filter((q) => {
      return assignedSubjectIds.includes(q.subject_id);
    });
  }, [questions, assignedSubjectIds]);

  // Filter Form States
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
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
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Handle Export Excel (.xlsx) for teacher (only authorized & filtered questions)
  const handleExportExcel = () => {
    try {
      exportEntityToExcel(
        'bank_soal',
        filteredQuestions,
        { subjects, teachers },
        `Bank_Soal_${currentTeacher?.full_name?.replace(/\s+/g, '_') || 'Guru'}_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      showTemporaryNotice(`Berhasil mengekspor ${filteredQuestions.length} butir soal ke Excel (.xlsx).`);
    } catch (err: any) {
      showTemporaryNotice(`Gagal mengekspor soal: ${err.message}`);
    }
  };

  // Filter Logic
  const filteredQuestions = useMemo(() => {
    return teacherAuthorizedQuestions.filter((q) => {
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

      // Grade
      if (selectedGrade && q.grade !== selectedGrade) return false;

      // Type
      if (selectedType && q.question_type !== selectedType) return false;

      // Difficulty
      if (selectedDifficulty && q.difficulty !== selectedDifficulty) return false;

      // Status
      if (selectedStatus && q.status !== selectedStatus) return false;

      return true;
    });
  }, [
    teacherAuthorizedQuestions,
    search,
    selectedSubject,
    selectedGrade,
    selectedType,
    selectedDifficulty,
    selectedStatus,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / itemsPerPage));
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredQuestions.slice(start, start + itemsPerPage);
  }, [filteredQuestions, currentPage]);

  const stats = useMemo(() => {
    return {
      total: teacherAuthorizedQuestions.length,
      singleChoice: teacherAuthorizedQuestions.filter((q) => q.question_type === 'single_choice').length,
      complexChoice: teacherAuthorizedQuestions.filter((q) => q.question_type === 'complex_choice').length,
      essay: teacherAuthorizedQuestions.filter((q) => q.question_type === 'essay').length,
      matching: teacherAuthorizedQuestions.filter((q) => q.question_type === 'matching').length,
    };
  }, [teacherAuthorizedQuestions]);

  const handleOpenAdd = () => {
    setEditingQuestion(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (q: Question) => {
    // Security check
    if (!assignedSubjectIds.includes(q.subject_id)) {
      alert('Akses Ditolak: Anda hanya boleh mengedit soal mata pelajaran yang Anda ampu.');
      return;
    }
    setEditingQuestion(q);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: Omit<Question, 'id' | 'created_at' | 'updated_at'>) => {
    // Pastikan guru tidak bisa submit untuk mapel di luar hak aksesnya
    if (!assignedSubjectIds.includes(data.subject_id)) {
      throw new Error('Anda tidak memiliki otoritas untuk mata pelajaran tersebut.');
    }

    if (editingQuestion) {
      await updateQuestion(editingQuestion.id, data);
      showTemporaryNotice(`Soal "${data.code}" berhasil diperbarui.`);
    } else {
      const created = await addQuestion({
        ...data,
        teacher_id: currentTeacher?.id || profile?.id || '',
      });
      showTemporaryNotice(`Soal baru "${created.code}" berhasil disimpan.`);
    }
  };

  const handleDuplicate = async (q: Question) => {
    try {
      const dup = await duplicateQuestion(q.id);
      showTemporaryNotice(`Soal ${q.code} berhasil diduplikasi menjadi ${dup.code}.`);
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
    showTemporaryNotice(`Status soal ${q.code} diubah.`);
  };

  const showTemporaryNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
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
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Bank Soal Guru</h1>
              <p className="text-xs text-slate-500">
                Penyusunan butir instrumen evaluasi mata pelajaran yang Anda ampu
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsGuideModalOpen(true)}
            className="px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Lihat Format & Contoh Soal PG Biasa, PG Kompleks, Esai, Menjodohkan"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>Format Soal</span>
          </button>
          <button
            type="button"
            onClick={() => downloadTemplateExcel('bank_soal')}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Unduh Template Excel Soal"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Template</span>
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            title="Impor Butir Soal Excel (.xlsx)"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredQuestions.length === 0}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${
              filteredQuestions.length > 0
                ? 'bg-slate-800 hover:bg-slate-900 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export ({filteredQuestions.length})</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Soal Baru</span>
          </button>
        </div>
      </div>

      {/* Banner Hak Akses RLS Guru */}
      <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                Otoritas Mata Pelajaran: {currentTeacher?.full_name || 'Guru'}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Supabase RLS Aktif
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="text-[11px] text-slate-500 font-medium">Mata Pelajaran yang Diampu:</span>
              {assignedSubjects.map((s) => (
                <span
                  key={s.id}
                  className="px-2 py-0.5 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-[11px] font-semibold shadow-2xs"
                >
                  {s.name} ({s.code})
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="text-[11px] text-emerald-800 bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0 self-start sm:self-auto flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Hanya dapat melihat & menyunting mapel di atas</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Soal Saya</div>
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
            <span>Penyaringan Soal</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedSubject('');
              setSelectedGrade('');
              setSelectedType('');
              setSelectedDifficulty('');
              setSelectedStatus('');
              setCurrentPage(1);
            }}
            className="text-[11px] text-emerald-700 hover:underline font-semibold cursor-pointer"
          >
            Reset Filter
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari kode atau stimulus soal..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Mapel Saya</option>
            {assignedSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>

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
        </div>
      </div>

      {/* Tabel Soal Guru */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Kode & Soal</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4 text-center">Tipe Soal</th>
                <th className="py-3 px-4 text-center">Tingkat / Poin</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedQuestions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <FileQuestion className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Belum ada butir soal untuk mata pelajaran ini. Silakan buat soal baru.
                  </td>
                </tr>
              ) : (
                paginatedQuestions.map((q, idx) => {
                  const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-medium">
                        {itemIndex}
                      </td>

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

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{q.subject?.name || 'Mata Pelajaran'}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{q.major?.name || 'Semua Jurusan'}</div>
                      </td>

                      <td className="py-3.5 px-4 text-center">{getTypeBadge(q.question_type)}</td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-slate-800">Kelas {q.grade}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{q.points} Poin</div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(q)}
                          title="Klik untuk ubah status"
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

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailQuestion(q)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Detail Soal & Kunci"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(q)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Duplikasi Soal"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(q)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Ubah Soal"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
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

        {/* Pagination */}
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

      {/* Modal Form Soal Guru (Hanya menampilkan mapel yang diampu) */}
      <QuestionFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingQuestion}
        teacherSubjectIds={assignedSubjectIds}
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
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hapus Butir Soal</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <p className="text-xs text-slate-700">
              Apakah Anda yakin ingin menghapus butir soal <strong className="font-mono">{deleteTarget.code}</strong>?
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

      {/* Import Wizard Modal */}
      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        initialEntityType="bank_soal"
        onSuccess={(summary) => {
          showTemporaryNotice(`Berhasil mengimpor ${summary.successCount} butir soal baru ke Bank Soal Anda.`);
        }}
      />

      {/* Question Template Guide Modal */}
      <QuestionTemplateGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </div>
  );
};
