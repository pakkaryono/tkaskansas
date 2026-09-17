import React, { useState, useMemo } from 'react';
import { useMasterData } from '../../contexts/MasterDataContext';
import { Student, ToastNotification } from '../../types';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { Toast } from '../../components/common/Toast';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Pagination } from '../../components/common/Pagination';
import {
  GraduationCap,
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
  Phone,
  Mail,
  ShieldCheck,
  Building,
  Upload,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { ImportWizardModal } from '../../components/importExport/ImportWizardModal';
import { exportEntityToExcel, downloadTemplateExcel } from '../../lib/excelEngine';

interface MasterSiswaPageProps {
  onNavigate: (path: string) => void;
}

export const MasterSiswaPage: React.FC<MasterSiswaPageProps> = ({ onNavigate }) => {
  const { students, classes, majors, addStudent, updateStudent, deleteStudent, toggleStudentStatus, resetStudentPassword } =
    useMasterData();

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [majorFilter, setMajorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [detailTarget, setDetailTarget] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Reset Password State
  const [resetTarget, setResetTarget] = useState<Student | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Handle Export Excel following active filter
  const handleExportExcel = () => {
    try {
      exportEntityToExcel('siswa', filteredStudents, {
        classes,
        majors,
      });
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Ekspor Berhasil',
        message: `Berhasil mengekspor ${filteredStudents.length} data siswa (.xlsx) sesuai filter aktif.`,
      });
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Ekspor Gagal',
        message: err.message || 'Gagal mengekspor data siswa.',
      });
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    nis: '',
    nisn: '',
    full_name: '',
    email: '',
    phone_number: '',
    class_id: '',
    status: 'active' as 'active' | 'inactive',
    initialPassword: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.nis.toLowerCase().includes(search.toLowerCase()) ||
        s.nisn.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase());
      const matchClass = classFilter === 'all' || s.class_id === classFilter;
      const matchMajor = majorFilter === 'all' || s.major_id === majorFilter;
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchSearch && matchClass && matchMajor && matchStatus;
    });
  }, [students, search, classFilter, majorFilter, statusFilter]);

  // Paginated data
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const handleOpenAdd = () => {
    const defaultClassId = classes.length > 0 ? classes[0].id : '';
    setFormData({
      nis: '',
      nisn: '',
      full_name: '',
      email: '',
      phone_number: '',
      class_id: defaultClassId,
      status: 'active',
      initialPassword: '',
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditTarget(student);
    setFormData({
      nis: student.nis,
      nisn: student.nisn,
      full_name: student.full_name,
      email: student.email,
      phone_number: student.phone_number || '',
      class_id: student.class_id,
      status: student.status,
      initialPassword: '',
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.nis.trim()) errors.nis = 'NIS wajib diisi';
    if (!formData.nisn.trim()) errors.nisn = 'NISN wajib diisi (10 digit)';
    if (!formData.full_name.trim()) errors.full_name = 'Nama lengkap siswa wajib diisi';
    if (!formData.email.trim()) errors.email = 'Email siswa wajib diisi';
    else if (!formData.email.includes('@')) errors.email = 'Format email tidak valid';

    if (!formData.class_id) errors.class_id = 'Pilih kelas siswa';

    // Duplicate NIS
    const isDupNis = students.some(
      (s) => s.nis === formData.nis.trim() && (!editTarget || s.id !== editTarget.id)
    );
    if (isDupNis) errors.nis = 'NIS sudah digunakan';

    // Duplicate NISN
    const isDupNisn = students.some(
      (s) => s.nisn === formData.nisn.trim() && (!editTarget || s.id !== editTarget.id)
    );
    if (isDupNisn) errors.nisn = 'NISN sudah digunakan';

    // Duplicate Email
    const isDupEmail = students.some(
      (s) => s.email.toLowerCase() === formData.email.trim().toLowerCase() && (!editTarget || s.id !== editTarget.id)
    );
    if (isDupEmail) errors.email = 'Email sudah digunakan oleh siswa lain';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editTarget) {
        await updateStudent(editTarget.id, {
          nis: formData.nis.trim(),
          nisn: formData.nisn.trim(),
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone_number: formData.phone_number.trim(),
          class_id: formData.class_id,
          status: formData.status,
        });
        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Data Siswa Diperbarui',
          message: `Data ${formData.full_name} berhasil diperbarui.`,
        });
        setEditTarget(null);
      } else {
        await addStudent({
          nis: formData.nis.trim(),
          nisn: formData.nisn.trim(),
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone_number: formData.phone_number.trim(),
          class_id: formData.class_id,
          initialPassword: formData.initialPassword || undefined,
        });
        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Siswa Ditambahkan',
          message: `Data siswa dan akun tes ${formData.full_name} berhasil dibuat.`,
        });
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan sistem saat menyimpan siswa.',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteStudent(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);

    if (result.success) {
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Siswa Dihapus',
        message: `Data peserta ujian ${deleteTarget.full_name} telah dihapus.`,
      });
    } else {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Hapus Ditolak',
        message: result.message || 'Tidak dapat menghapus siswa ini.',
      });
    }
  };

  const handleExecuteResetPassword = async () => {
    if (!resetTarget) return;
    setIsResetting(true);
    const newPass = await resetStudentPassword(resetTarget.id);
    setIsResetting(false);
    setTempPassword(newPass);
    setToast({
      id: Date.now().toString(),
      type: 'info',
      title: 'Kata Sandi Direset',
      message: `Kata sandi akun peserta tes untuk ${resetTarget.full_name} berhasil direset.`,
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
          items={[{ label: 'Data Master' }, { label: 'Peserta Didik (Siswa)' }]}
          onNavigate={onNavigate}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <GraduationCap className="w-6 h-6 text-blue-600" />
              <span>Master Peserta Didik (Siswa)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Kelola data akun peserta ujian Tes Kemampuan Akademik (TKA) SMKN 1 Songgom berdasarkan kelas dan jurusan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadTemplateExcel('siswa')}
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
              disabled={filteredStudents.length === 0}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all ${
                filteredStudents.length > 0
                  ? 'bg-slate-800 hover:bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export ({filteredStudents.length})</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Siswa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Siswa Terdaftar</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{students.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Siswa Aktif Ujian</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
              {students.filter((s) => s.status === 'active').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Rombel Kelas</p>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1">{classes.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari NIS, NISN, nama, atau email..."
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
            <span className="text-xs font-medium text-slate-500">Kelas:</span>
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Jurusan:</span>
            <select
              value={majorFilter}
              onChange={(e) => {
                setMajorFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Semua Jurusan</option>
              {majors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code}
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
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">No</th>
                <th className="py-3.5 px-4">Siswa</th>
                <th className="py-3.5 px-4">NIS / NISN</th>
                <th className="py-3.5 px-4">Rombel Kelas</th>
                <th className="py-3.5 px-4">Konsentrasi Keahlian</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FolderOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada data siswa ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {search ? 'Coba ubah kata kunci pencarian Anda' : 'Silakan tambahkan data peserta ujian pertama.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student, index) => {
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                            {student.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{student.full_name}</p>
                            <p className="text-[11px] text-slate-500">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <p className="font-bold text-slate-800">NIS: {student.nis}</p>
                        <p className="text-slate-400 text-[11px]">NISN: {student.nisn}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-100">
                          {student.class?.name || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-700 text-xs">
                          {student.major?.code || '-'} - {student.major?.name || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => toggleStudentStatus(student.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                            student.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                          }`}
                          title="Ubah status aktif siswa"
                        >
                          {student.status === 'active' ? (
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
                            onClick={() => setDetailTarget(student)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                            title="Lihat Detail Peserta"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setResetTarget(student);
                              setTempPassword(null);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                            title="Reset Kata Sandi"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(student)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                            title="Edit Data Siswa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(student)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Hapus Siswa"
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
          totalItems={filteredStudents.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal Tambah / Edit Siswa */}
      {(isAddModalOpen || editTarget) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {editTarget ? 'Edit Data Peserta Didik' : 'Tambah Peserta Didik (Siswa)'}
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
                    NIS <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 2425001"
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border font-mono ${
                      formErrors.nis ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                  />
                  {formErrors.nis && <p className="text-xs text-rose-500 mt-1">{formErrors.nis}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NISN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 0081234567"
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border font-mono ${
                      formErrors.nisn ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                  />
                  {formErrors.nisn && <p className="text-xs text-rose-500 mt-1">{formErrors.nisn}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Siswa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ahmad Rizky Pratama"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border ${
                    formErrors.full_name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                />
                {formErrors.full_name && <p className="text-xs text-rose-500 mt-1">{formErrors.full_name}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Akun Siswa <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="Contoh: ahmad.rizky@siswa.smk.belajar.id"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border ${
                      formErrors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                  />
                  {formErrors.email && <p className="text-xs text-rose-500 mt-1">{formErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor WhatsApp / HP</label>
                  <input
                    type="text"
                    placeholder="Contoh: 089512345678"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rombongan Belajar (Kelas) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border bg-white text-slate-700 ${
                    formErrors.class_id ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.major?.code}) - TA {c.academic_year}
                    </option>
                  ))}
                </select>
                {formErrors.class_id && <p className="text-xs text-rose-500 mt-1">{formErrors.class_id}</p>}
              </div>

              {!editTarget && (
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/60 text-xs text-blue-800 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Pembuatan Akun Ujian Otomatis</p>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Sistem akan membuatkan akun peserta ujian yang aman di database Supabase Auth. Siswa dapat login ke portal ujian menggunakan NISN dan kata sandi yang digenerate.
                    </p>
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
                  {editTarget ? 'Simpan Perubahan' : 'Tambah Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Siswa */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base">
                  {detailTarget.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">{detailTarget.full_name}</h3>
                  <p className="text-xs text-slate-500 font-mono">NIS: {detailTarget.nis} • NISN: {detailTarget.nisn}</p>
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
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Kelas</span>
                  <span className="font-semibold text-blue-700 text-xs">{detailTarget.class?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Jurusan</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {detailTarget.major ? `${detailTarget.major.code} - ${detailTarget.major.name}` : '-'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Email Siswa</span>
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
                <h3 className="text-base font-bold text-slate-900">Reset Sandi Akun Ujian</h3>
                <p className="text-xs text-slate-500">{resetTarget.full_name}</p>
              </div>
            </div>

            <div className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              {!tempPassword ? (
                <p>
                  Apakah Anda ingin mereset kata sandi akun ujian siswa ini? Sistem akan membuatkan kata sandi baru untuk login ke ujian.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Kata Sandi Akun Berhasil Direset!
                  </p>
                  <p className="text-xs text-slate-500">
                    Berikan kredensial berikut kepada siswa untuk login ujian:
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

      {/* Confirmation Dialog Hapus */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Data Siswa?"
        message={`Apakah Anda yakin ingin menghapus data siswa "${deleteTarget?.full_name}"?`}
        confirmText="Hapus Siswa"
        cancelText="Batal"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Import Wizard Modal */}
      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        initialEntityType="siswa"
        onSuccess={(summary) => {
          setToast({
            id: Date.now().toString(),
            type: 'success',
            title: 'Impor Selesai',
            message: `Berhasil mengimpor ${summary.successCount} data siswa baru.`,
          });
        }}
      />
    </div>
  );
};
