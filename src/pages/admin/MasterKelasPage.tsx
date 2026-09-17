import React, { useState, useMemo } from 'react';
import { useMasterData } from '../../contexts/MasterDataContext';
import { SchoolClass, ToastNotification } from '../../types';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { Toast } from '../../components/common/Toast';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Pagination } from '../../components/common/Pagination';
import {
  Building,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Filter,
  Users,
  GraduationCap,
  Upload,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { ImportWizardModal } from '../../components/importExport/ImportWizardModal';
import { exportEntityToExcel, downloadTemplateExcel } from '../../lib/excelEngine';

interface MasterKelasPageProps {
  onNavigate: (path: string) => void;
}

export const MasterKelasPage: React.FC<MasterKelasPageProps> = ({ onNavigate }) => {
  const { classes, majors, students, addClass, updateClass, deleteClass, toggleClassStatus } = useMasterData();

  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'all' | 'X' | 'XI' | 'XII'>('all');
  const [majorFilter, setMajorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SchoolClass | null>(null);
  const [detailTarget, setDetailTarget] = useState<SchoolClass | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolClass | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Handle Export Excel (.xlsx) following active filter
  const handleExportExcel = () => {
    try {
      exportEntityToExcel('kelas', filteredClasses, {
        majors,
      });
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Ekspor Berhasil',
        message: `Berhasil mengekspor ${filteredClasses.length} data rombel kelas (.xlsx) sesuai filter.`,
      });
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Ekspor Gagal',
        message: err.message || 'Gagal mengekspor data kelas.',
      });
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    grade: 'XI' as 'X' | 'XI' | 'XII',
    major_id: '',
    academic_year: '2026/2027',
    status: 'active' as 'active' | 'inactive',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const matchSearch =
        cls.name.toLowerCase().includes(search.toLowerCase()) ||
        (cls.major?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        cls.academic_year.toLowerCase().includes(search.toLowerCase());
      const matchGrade = gradeFilter === 'all' || cls.grade === gradeFilter;
      const matchMajor = majorFilter === 'all' || cls.major_id === majorFilter;
      const matchStatus = statusFilter === 'all' || cls.status === statusFilter;
      return matchSearch && matchGrade && matchMajor && matchStatus;
    });
  }, [classes, search, gradeFilter, majorFilter, statusFilter]);

  // Paginated data
  const paginatedClasses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClasses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClasses, currentPage]);

  const handleOpenAdd = () => {
    const defaultMajorId = majors.length > 0 ? majors[0].id : '';
    setFormData({
      name: '',
      grade: 'XI',
      major_id: defaultMajorId,
      academic_year: '2026/2027',
      status: 'active',
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (cls: SchoolClass) => {
    setEditTarget(cls);
    setFormData({
      name: cls.name,
      grade: cls.grade,
      major_id: cls.major_id,
      academic_year: cls.academic_year,
      status: cls.status,
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Nama kelas wajib diisi';
    if (!formData.major_id) errors.major_id = 'Pilih jurusan keahlian';
    if (!formData.academic_year.trim()) errors.academic_year = 'Tahun ajaran wajib diisi';

    // Cek duplikasi nama kelas
    const isDuplicate = classes.some(
      (c) =>
        c.name.toLowerCase() === formData.name.trim().toLowerCase() &&
        (!editTarget || c.id !== editTarget.id)
    );
    if (isDuplicate) errors.name = 'Nama kelas sudah terdaftar';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editTarget) {
        await updateClass(editTarget.id, {
          name: formData.name.trim(),
          grade: formData.grade,
          major_id: formData.major_id,
          academic_year: formData.academic_year.trim(),
          status: formData.status,
        });
        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Kelas Diperbarui',
          message: `Kelas ${formData.name} berhasil diperbarui.`,
        });
        setEditTarget(null);
      } else {
        await addClass({
          name: formData.name.trim(),
          grade: formData.grade,
          major_id: formData.major_id,
          academic_year: formData.academic_year.trim(),
          status: formData.status,
        });
        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Kelas Ditambahkan',
          message: `Rombel ${formData.name} berhasil disimpan.`,
        });
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan sistem saat menyimpan kelas.',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteClass(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);

    if (result.success) {
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Kelas Dihapus',
        message: `Rombongan belajar ${deleteTarget.name} telah berhasil dihapus.`,
      });
    } else {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Hapus Ditolak',
        message: result.message || 'Tidak dapat menghapus kelas ini.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header & Breadcrumb */}
      <div>
        <Breadcrumb
          items={[{ label: 'Data Master' }, { label: 'Rombongan Belajar (Kelas)' }]}
          onNavigate={onNavigate}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Building className="w-6 h-6 text-blue-600" />
              <span>Master Rombongan Belajar (Kelas)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Pengaturan rombel kelas tingkat X, XI, dan XII SMKN 1 Songgom yang terhubung dengan jurusan dan siswa.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadTemplateExcel('kelas')}
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
              disabled={filteredClasses.length === 0}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all ${
                filteredClasses.length > 0
                  ? 'bg-slate-800 hover:bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export ({filteredClasses.length})</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kelas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Kelas</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{classes.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Tingkat X</p>
            <p className="text-2xl font-extrabold text-sky-600 mt-1">
              {classes.filter((c) => c.grade === 'X').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Tingkat XI</p>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1">
              {classes.filter((c) => c.grade === 'XI').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Tingkat XII</p>
            <p className="text-2xl font-extrabold text-purple-600 mt-1">
              {classes.filter((c) => c.grade === 'XII').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama kelas..."
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
            <span className="text-xs font-medium text-slate-500">Tingkat:</span>
            <select
              value={gradeFilter}
              onChange={(e) => {
                setGradeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Semua</option>
              <option value="X">Kelas X</option>
              <option value="XI">Kelas XI</option>
              <option value="XII">Kelas XII</option>
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
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">No</th>
                <th className="py-3.5 px-4">Nama Kelas</th>
                <th className="py-3.5 px-4">Tingkat</th>
                <th className="py-3.5 px-4">Jurusan / Konsentrasi</th>
                <th className="py-3.5 px-4">Tahun Ajaran</th>
                <th className="py-3.5 px-4">Jumlah Siswa</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700">
              {paginatedClasses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FolderOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada data kelas ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {search ? 'Ubah kriteria pencarian Anda' : 'Buat rombel kelas pertama Anda.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedClasses.map((cls, index) => {
                  const enrolledCount = students.filter((s) => s.class_id === cls.id).length;

                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {cls.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700 text-xs">
                          Kelas {cls.grade}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-blue-700 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200/50">
                          {cls.major ? `${cls.major.code} - ${cls.major.name}` : 'Jurusan belum diatur'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs font-mono">
                        {cls.academic_year}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/60">
                          <Users className="w-3.5 h-3.5" />
                          {enrolledCount} Siswa
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => toggleClassStatus(cls.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                            cls.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                          }`}
                          title="Ubah status kelas"
                        >
                          {cls.status === 'active' ? (
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
                            onClick={() => setDetailTarget(cls)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(cls)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-amber-600 transition-colors"
                            title="Edit Kelas"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(cls)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Hapus Kelas"
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
          totalItems={filteredClasses.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal Tambah / Edit */}
      {(isAddModalOpen || editTarget) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {editTarget ? 'Edit Rombongan Belajar' : 'Tambah Rombongan Belajar (Kelas)'}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tingkat Kelas <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="X">Kelas X (Sepuluh)</option>
                    <option value="XI">Kelas XI (Sebelas)</option>
                    <option value="XII">Kelas XII (Duabelas)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tahun Ajaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Konsentrasi Keahlian (Jurusan) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.major_id}
                  onChange={(e) => setFormData({ ...formData, major_id: e.target.value })}
                  className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border bg-white text-slate-700 ${
                    formErrors.major_id ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                >
                  <option value="">-- Pilih Jurusan --</option>
                  {majors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name}
                    </option>
                  ))}
                </select>
                {formErrors.major_id && <p className="text-xs text-rose-500 mt-1">{formErrors.major_id}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kelas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: XI TJKT 1, XII TKRO 2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border ${
                    formErrors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                />
                {formErrors.name && <p className="text-xs text-rose-500 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Keaktifan</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="active">Aktif (Dapat menerima penugasan ujian dan siswa)</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>

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
                  {editTarget ? 'Simpan Perubahan' : 'Tambah Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  {detailTarget.grade}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">{detailTarget.name}</h3>
                  <p className="text-xs text-slate-500">
                    Tahun Pelajaran: {detailTarget.academic_year} • {detailTarget.major?.name}
                  </p>
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
                  <span className="text-[11px] text-slate-500 block">Jurusan Induk:</span>
                  <span className="font-semibold text-slate-800">{detailTarget.major?.code || '-'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Status:</span>
                  <span className="font-semibold text-emerald-700 capitalize">{detailTarget.status}</span>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-500 text-[11px] uppercase mb-2">
                  Daftar Siswa dalam Kelas Ini ({students.filter((s) => s.class_id === detailTarget.id).length}):
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {students.filter((s) => s.class_id === detailTarget.id).length > 0 ? (
                    students
                      .filter((s) => s.class_id === detailTarget.id)
                      .map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{s.full_name}</p>
                            <p className="text-[10px] text-slate-500">NIS: {s.nis} • NISN: {s.nisn}</p>
                          </div>
                          <span className="text-[11px] font-mono text-slate-600">{s.email}</span>
                        </div>
                      ))
                  ) : (
                    <p className="text-slate-400 italic text-xs">Belum ada siswa terdaftar di kelas ini.</p>
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

      {/* Confirmation Dialog Hapus */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Rombongan Belajar?"
        message={`Apakah Anda yakin ingin menghapus kelas "${deleteTarget?.name}"?`}
        confirmText="Hapus Kelas"
        cancelText="Batal"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Import Wizard Modal */}
      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        initialEntityType="kelas"
        onSuccess={(summary) => {
          setToast({
            id: Date.now().toString(),
            type: 'success',
            title: 'Impor Selesai',
            message: `Berhasil mengimpor ${summary.successCount} rombel kelas baru.`,
          });
        }}
      />
    </div>
  );
};
