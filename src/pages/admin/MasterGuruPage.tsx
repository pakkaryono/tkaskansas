import React, { useState, useMemo } from 'react';
import { useMasterData } from '../../contexts/MasterDataContext';
import { Teacher, ToastNotification } from '../../types';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { Toast } from '../../components/common/Toast';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Pagination } from '../../components/common/Pagination';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Filter,
  KeyRound,
  Copy,
  BookOpen,
  Phone,
  Mail,
  ShieldCheck,
  Upload,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { ImportWizardModal } from '../../components/importExport/ImportWizardModal';
import { exportEntityToExcel, downloadTemplateExcel } from '../../lib/excelEngine';

interface MasterGuruPageProps {
  onNavigate: (path: string) => void;
}

export const MasterGuruPage: React.FC<MasterGuruPageProps> = ({ onNavigate }) => {
  const { teachers, subjects, addTeacher, updateTeacher, deleteTeacher, toggleTeacherStatus, resetTeacherPassword } =
    useMasterData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Teacher | null>(null);
  const [detailTarget, setDetailTarget] = useState<Teacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Reset Password State
  const [resetTarget, setResetTarget] = useState<Teacher | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Kredensial Guru Baru yang baru dibuat
  const [newlyCreatedCreds, setNewlyCreatedCreds] = useState<{
    name: string;
    email: string;
    nip: string;
    password: string;
  } | null>(null);
  const [copiedNewCreds, setCopiedNewCreds] = useState(false);

  // Handle Export Excel following active filter
  const handleExportExcel = () => {
    try {
      exportEntityToExcel('guru', filteredTeachers, {
        subjects,
      });
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Ekspor Berhasil',
        message: `Berhasil mengekspor ${filteredTeachers.length} data guru (.xlsx) sesuai filter aktif.`,
      });
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Ekspor Gagal',
        message: err.message || 'Gagal mengekspor data guru.',
      });
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    nip: '',
    full_name: '',
    email: '',
    phone_number: '',
    subject_ids: [] as string[],
    initialPassword: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchSearch =
        t.full_name.toLowerCase().includes(search.toLowerCase()) ||
        t.nip.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchSubject = subjectFilter === 'all' || t.subject_ids?.includes(subjectFilter);
      return matchSearch && matchStatus && matchSubject;
    });
  }, [teachers, search, statusFilter, subjectFilter]);

  // Paginated data
  const paginatedTeachers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTeachers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTeachers, currentPage]);

  const handleOpenAdd = () => {
    setFormData({
      nip: '',
      full_name: '',
      email: '',
      phone_number: '',
      subject_ids: [],
      initialPassword: 'Guru123!',
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setEditTarget(teacher);
    setFormData({
      nip: teacher.nip,
      full_name: teacher.full_name,
      email: teacher.email,
      phone_number: teacher.phone_number || '',
      subject_ids: teacher.subject_ids || [],
      initialPassword: '',
    });
    setFormErrors({});
  };

  const handleSubjectToggle = (subjectId: string) => {
    setFormData((prev) => {
      const exists = prev.subject_ids.includes(subjectId);
      return {
        ...prev,
        subject_ids: exists
          ? prev.subject_ids.filter((id) => id !== subjectId)
          : [...prev.subject_ids, subjectId],
      };
    });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.nip.trim()) errors.nip = 'NIP / NUPTK wajib diisi';
    if (!formData.full_name.trim()) errors.full_name = 'Nama lengkap beserta gelar wajib diisi';
    if (!formData.email.trim()) errors.email = 'Email resmi wajib diisi';
    else if (!formData.email.includes('@')) errors.email = 'Format email tidak valid';

    if (formData.subject_ids.length === 0) {
      errors.subject_ids = 'Pilih minimal satu mata pelajaran yang diampu';
    }

    // Check duplicate NIP
    const isDuplicateNip = teachers.some(
      (t) => t.nip === formData.nip.trim() && (!editTarget || t.id !== editTarget.id)
    );
    if (isDuplicateNip) errors.nip = 'NIP sudah terdaftar di sistem';

    // Check duplicate Email
    const isDuplicateEmail = teachers.some(
      (t) => t.email.toLowerCase() === formData.email.trim().toLowerCase() && (!editTarget || t.id !== editTarget.id)
    );
    if (isDuplicateEmail) errors.email = 'Email sudah digunakan oleh guru lain';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editTarget) {
        await updateTeacher(editTarget.id, {
          nip: formData.nip.trim(),
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone_number: formData.phone_number.trim(),
          subject_ids: formData.subject_ids,
        });
        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Data Guru Diperbarui',
          message: `Profil ${formData.full_name} berhasil diperbarui.`,
        });
        setEditTarget(null);
      } else {
        const passToUse = formData.initialPassword.trim() || 'Guru123!';
        await addTeacher({
          nip: formData.nip.trim(),
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone_number: formData.phone_number.trim(),
          subject_ids: formData.subject_ids,
          initialPassword: passToUse,
        });
        setNewlyCreatedCreds({
          name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          nip: formData.nip.trim(),
          password: passToUse,
        });
        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Guru Berhasil Ditambahkan',
          message: `Akun guru dan penugasan ${formData.full_name} berhasil disimpan.`,
        });
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan sistem saat menyimpan data guru.',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteTeacher(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);

    if (result.success) {
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Guru Dihapus',
        message: `Data guru ${deleteTarget.full_name} telah dihapus dari sistem.`,
      });
    } else {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Hapus Ditolak',
        message: result.message || 'Tidak dapat menghapus data guru ini.',
      });
    }
  };

  const handleExecuteResetPassword = async () => {
    if (!resetTarget) return;
    setIsResetting(true);
    const newPass = await resetTeacherPassword(resetTarget.id);
    setIsResetting(false);
    setTempPassword(newPass);
    setToast({
      id: Date.now().toString(),
      type: 'info',
      title: 'Kata Sandi Direset',
      message: `Kata sandi baru sementara telah dibuat untuk ${resetTarget.full_name}.`,
    });
  };

  const copyPasswordToClipboard = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header & Breadcrumb */}
      <div>
        <Breadcrumb
          items={[{ label: 'Data Master' }, { label: 'Guru & Tenaga Pendidik' }]}
          onNavigate={onNavigate}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-blue-600" />
              <span>Master Guru & Tenaga Pendidik</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Kelola data guru pengampu, hak akses pembuatan bank soal, dan penugasan mata pelajaran di SMKN 1 Songgom.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadTemplateExcel('guru')}
              title="Unduh Template Excel Resmi"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Template</span>
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Excel</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={filteredTeachers.length === 0}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all ${
                filteredTeachers.length > 0
                  ? 'bg-slate-800 hover:bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export ({filteredTeachers.length})</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Guru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Guru</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{teachers.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Guru Aktif</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
              {teachers.filter((t) => t.status === 'active').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Mapel Terdistribusi</p>
            <p className="text-2xl font-extrabold text-purple-600 mt-1">{subjects.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari NIP, nama guru, atau email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Mapel:</span>
            <select
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Semua Mapel</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Semua</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">No</th>
                <th className="py-3.5 px-4">Guru</th>
                <th className="py-3.5 px-4">NIP/NUPTK</th>
                <th className="py-3.5 px-4">Mata Pelajaran yang Diampu</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700">
              {paginatedTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FolderOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">
                      {teachers.length === 0 ? 'Belum ada data guru.' : 'Tidak ada data guru yang sesuai kriteria pencarian.'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {search ? 'Coba ubah kata kunci pencarian Anda' : 'Silakan tambahkan data guru baru atau import dari file Excel.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedTeachers.map((teacher, index) => {
                  const teacherSubjects = subjects.filter((s) => teacher.subject_ids?.includes(s.id));

                  return (
                    <tr key={teacher.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {teacher.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{teacher.full_name}</p>
                            <p className="text-[11px] text-slate-500">{teacher.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700 text-xs">
                        {teacher.nip}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {teacherSubjects.length > 0 ? (
                            teacherSubjects.map((s) => (
                              <span
                                key={s.id}
                                className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-100"
                              >
                                {s.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic text-xs">Belum ada mapel</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => toggleTeacherStatus(teacher.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                            teacher.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                          }`}
                          title="Ubah status aktif guru"
                        >
                          {teacher.status === 'active' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setDetailTarget(teacher)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                            title="Lihat Detail Profil"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setResetTarget(teacher);
                              setTempPassword(null);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                            title="Reset Kata Sandi"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(teacher)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                            title="Edit Data Guru"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(teacher)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Hapus Guru"
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
        <Pagination
          currentPage={currentPage}
          totalItems={filteredTeachers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal Tambah / Edit Guru */}
      {(isAddModalOpen || editTarget) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {editTarget ? 'Edit Data Guru & Pengampu' : 'Tambah Guru & Penugasan Mapel'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditTarget(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP / NUPTK <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 198507122010011005"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border font-mono ${
                      formErrors.nip ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                  />
                  {formErrors.nip && <p className="text-xs text-rose-500 mt-1">{formErrors.nip}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap beserta Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso, S.Kom., M.T."
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border ${
                    formErrors.full_name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                />
                {formErrors.full_name && <p className="text-xs text-rose-500 mt-1">{formErrors.full_name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Akun Resmi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Contoh: nama.guru@guru.smk.belajar.id"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border ${
                    formErrors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                />
                {formErrors.email && <p className="text-xs text-rose-500 mt-1">{formErrors.email}</p>}
              </div>

              {/* Relasi Multi-Mapel yang diampu */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mata Pelajaran yang Diampu (Pilih satu atau beberapa) <span className="text-rose-500">*</span>
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-40 overflow-y-auto space-y-1.5">
                  {subjects.map((sub) => {
                    const isSelected = formData.subject_ids.includes(sub.id);
                    return (
                      <label
                        key={sub.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                          isSelected ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSubjectToggle(sub.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-mono text-slate-500">[{sub.code}]</span>
                        <span className="font-semibold">{sub.name}</span>
                      </label>
                    );
                  })}
                </div>
                {formErrors.subject_ids && (
                  <p className="text-xs text-rose-500 mt-1">{formErrors.subject_ids}</p>
                )}
              </div>

              {!editTarget && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Kata Sandi Awal Akun Guru <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, initialPassword: `Guru#${Math.floor(1000 + Math.random() * 9000)}` })}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                    >
                      🎲 Acak Sandi
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.initialPassword}
                    onChange={(e) => setFormData({ ...formData, initialPassword: e.target.value })}
                    placeholder="Contoh: Guru123!"
                    required
                    className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/60 text-xs text-blue-800 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Otentikasi Langsung Aktif</p>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        Akun guru langsung aktif dan terkonfirmasi di database Supabase Auth. Guru dapat login menggunakan <strong>NIP</strong> atau <strong>Email</strong> dengan kata sandi di atas.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditTarget(null);
                  }}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-500/20 transition-all"
                >
                  {editTarget ? 'Simpan Perubahan' : 'Tambah Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Guru */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base">
                  {detailTarget.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">{detailTarget.full_name}</h3>
                  <p className="text-xs text-slate-500 font-mono">NIP: {detailTarget.nip}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs sm:text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Email</span>
                    <span className="font-medium text-slate-800 text-xs">{detailTarget.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">WhatsApp</span>
                    <span className="font-medium text-slate-800 text-xs">{detailTarget.phone_number || '-'}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-500 text-[11px] uppercase mb-2">
                  Mata Pelajaran yang Diampu Guru:
                </p>
                <div className="space-y-2">
                  {subjects.filter((s) => detailTarget.subject_ids?.includes(s.id)).length > 0 ? (
                    subjects
                      .filter((s) => detailTarget.subject_ids?.includes(s.id))
                      .map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-blue-50/60 border border-blue-200/60 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-blue-950">{s.name}</span>
                            <span className="ml-2 font-mono text-[11px] text-blue-700">({s.code})</span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-blue-200 text-blue-800 text-[10px] font-bold">
                            Pengampu Aktif
                          </span>
                        </div>
                      ))
                  ) : (
                    <p className="text-slate-400 italic text-xs">Belum ada mata pelajaran yang ditugaskan.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDetailTarget(null)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset Kata Sandi Guru</h3>
                <p className="text-xs text-slate-500">{resetTarget.full_name}</p>
              </div>
            </div>

            <div className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              {!tempPassword ? (
                <p>
                  Apakah Anda ingin mereset kata sandi akun guru ini? Sistem akan menghasilkan kata sandi baru yang aman untuk login ke portal TKA SMK.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Kata Sandi Berhasil Direset!
                  </p>
                  <p className="text-xs text-slate-500">
                    Berikan kredensial berikut kepada guru bersangkutan untuk login:
                  </p>
                  <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between border border-slate-200 font-mono text-sm font-bold text-slate-900">
                    <span>{tempPassword}</span>
                    <button
                      onClick={copyPasswordToClipboard}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white text-xs text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedPass ? 'Tersalin!' : 'Salin'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setResetTarget(null);
                  setTempPassword(null);
                }}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Tutup
              </button>
              {!tempPassword && (
                <button
                  type="button"
                  onClick={handleExecuteResetPassword}
                  disabled={isResetting}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mereset...</span>
                    </>
                  ) : (
                    'Buat Kata Sandi Baru'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Kredensial Guru Baru yang Berhasil Dibuat */}
      {newlyCreatedCreds && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-emerald-200 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Akun Guru Resmi Dibuat!</h3>
                <p className="text-xs text-slate-500">Kredensial login aktif di Supabase Database & Auth</p>
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 font-mono">
              <div className="flex justify-between pb-1 border-b border-slate-200">
                <span className="text-slate-500 font-sans">Nama Guru:</span>
                <span className="font-bold text-slate-800">{newlyCreatedCreds.name}</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-slate-200">
                <span className="text-slate-500 font-sans">NIP (Login ID):</span>
                <span className="font-bold text-blue-700">{newlyCreatedCreds.nip}</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-slate-200">
                <span className="text-slate-500 font-sans">Email Resmi:</span>
                <span className="font-bold text-slate-800">{newlyCreatedCreds.email}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500 font-sans">Kata Sandi:</span>
                <span className="font-bold text-emerald-700 text-sm">{newlyCreatedCreds.password}</span>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
              Guru dapat langsung login ke portal menggunakan <strong>NIP ({newlyCreatedCreds.nip})</strong> atau <strong>Email</strong> dengan kata sandi di atas.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const text = `KREDENSIAL AKUN GURU TKA SMKN 1 SONGGOM:\nNama: ${newlyCreatedCreds.name}\nNIP: ${newlyCreatedCreds.nip}\nEmail: ${newlyCreatedCreds.email}\nKata Sandi: ${newlyCreatedCreds.password}\nLink Login: ${window.location.origin}/login`;
                  navigator.clipboard.writeText(text);
                  setCopiedNewCreds(true);
                  setTimeout(() => setCopiedNewCreds(false), 3000);
                }}
                className="px-4 py-2 text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedNewCreds ? 'Kredensial Tersalin!' : 'Salin Kredensial'}</span>
              </button>
              <button
                type="button"
                onClick={() => setNewlyCreatedCreds(null)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Hapus */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Data Guru?"
        message={`Apakah Anda yakin ingin menghapus data guru "${deleteTarget?.full_name}"?`}
        confirmText="Hapus Guru"
        cancelText="Batal"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Import Wizard Modal */}
      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        initialEntityType="guru"
        onSuccess={(summary) => {
          setToast({
            id: Date.now().toString(),
            type: 'success',
            title: 'Impor Selesai',
            message: `Berhasil mengimpor ${summary.successCount} data guru baru.`,
          });
        }}
      />
    </div>
  );
};
