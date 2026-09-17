import React, { useState, useMemo } from 'react';
import { useMasterData } from '../../contexts/MasterDataContext';
import { Major, ToastNotification } from '../../types';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { Toast } from '../../components/common/Toast';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Pagination } from '../../components/common/Pagination';
import {
  Layers,
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
  Building,
  Upload,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { ImportWizardModal } from '../../components/importExport/ImportWizardModal';
import { exportEntityToExcel, downloadTemplateExcel } from '../../lib/excelEngine';

interface MasterJurusanPageProps {
  onNavigate: (path: string) => void;
}

export const MasterJurusanPage: React.FC<MasterJurusanPageProps> = ({ onNavigate }) => {
  const { majors, classes, students, addMajor, updateMajor, deleteMajor, toggleMajorStatus } = useMasterData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Major | null>(null);
  const [detailTarget, setDetailTarget] = useState<Major | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Major | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Handle Export Excel (.xlsx) following active filter
  const handleExportExcel = () => {
    try {
      exportEntityToExcel('jurusan', filteredMajors);
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Ekspor Berhasil',
        message: `Berhasil mengekspor ${filteredMajors.length} data jurusan (.xlsx) sesuai filter.`,
      });
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Ekspor Gagal',
        message: err.message || 'Gagal mengekspor data jurusan.',
      });
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filtered data
  const filteredMajors = useMemo(() => {
    return majors.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.code.toLowerCase().includes(search.toLowerCase()) ||
        (m.description || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [majors, search, statusFilter]);

  // Paginated data
  const paginatedMajors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMajors.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMajors, currentPage]);

  const handleOpenAdd = () => {
    setFormData({ code: '', name: '', description: '', status: 'active' });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (major: Major) => {
    setEditTarget(major);
    setFormData({
      code: major.code,
      name: major.name,
      description: major.description || '',
      status: major.status,
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = 'Kode jurusan wajib diisi';
    if (!formData.name.trim()) errors.name = 'Nama jurusan wajib diisi';
    // Cek duplikasi kode
    const isDuplicate = majors.some(
      (m) =>
        m.code.toLowerCase() === formData.code.trim().toLowerCase() &&
        (!editTarget || m.id !== editTarget.id)
    );
    if (isDuplicate) errors.code = 'Kode jurusan sudah digunakan';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editTarget) {
        await updateMajor(editTarget.id, {
          code: formData.code.toUpperCase().trim(),
          name: formData.name.trim(),
          description: formData.description.trim(),
          status: formData.status,
        });
        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Jurusan Diperbarui',
          message: `Konsentrasi keahlian ${formData.name} berhasil diperbarui.`,
        });
        setEditTarget(null);
      } else {
        await addMajor({
          code: formData.code.toUpperCase().trim(),
          name: formData.name.trim(),
          description: formData.description.trim(),
          status: formData.status,
        });
        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Jurusan Ditambahkan',
          message: `Konsentrasi keahlian ${formData.name} berhasil disimpan.`,
        });
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan sistem saat menyimpan data.',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteMajor(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);

    if (result.success) {
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Jurusan Dihapus',
        message: `Konsentrasi keahlian ${deleteTarget.name} telah berhasil dihapus.`,
      });
    } else {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Hapus Ditolak',
        message: result.message || 'Tidak dapat menghapus jurusan ini.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header & Breadcrumb */}
      <div>
        <Breadcrumb
          items={[{ label: 'Data Master' }, { label: 'Konsentrasi Keahlian (Jurusan)' }]}
          onNavigate={onNavigate}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-blue-600" />
              <span>Master Konsentrasi Keahlian (Jurusan)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Kelola daftar program studi kejuruan di SMKN 1 Songgom yang terhubung dengan kelas dan siswa.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadTemplateExcel('jurusan')}
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
              disabled={filteredMajors.length === 0}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all ${
                filteredMajors.length > 0
                  ? 'bg-slate-800 hover:bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export ({filteredMajors.length})</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jurusan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Jurusan</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{majors.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Jurusan Aktif</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
              {majors.filter((m) => m.status === 'active').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Rombel Terhubung</p>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1">{classes.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kode atau nama jurusan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">No</th>
                <th className="py-3.5 px-4">Kode</th>
                <th className="py-3.5 px-4">Nama Jurusan</th>
                <th className="py-3.5 px-4">Rombel & Siswa</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700">
              {paginatedMajors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FolderOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada data jurusan ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {search ? 'Coba ubah kata kunci pencarian Anda' : 'Silakan tambahkan jurusan pertama Anda.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedMajors.map((major, index) => {
                  const majorClassesCount = classes.filter((c) => c.major_id === major.id).length;
                  const majorStudentsCount = students.filter((s) => s.major_id === major.id).length;

                  return (
                    <tr key={major.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                        <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200/60 text-xs">
                          {major.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{major.name}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{major.description || '-'}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded">
                            <Building className="w-3.5 h-3.5 text-slate-500" /> {majorClassesCount} Kelas
                          </span>
                          <span className="inline-flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded">
                            <Users className="w-3.5 h-3.5 text-slate-500" /> {majorStudentsCount} Siswa
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => toggleMajorStatus(major.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                            major.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                          }`}
                          title="Klik untuk mengubah status aktif/nonaktif"
                        >
                          {major.status === 'active' ? (
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
                            onClick={() => setDetailTarget(major)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(major)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-amber-600 transition-colors"
                            title="Edit Jurusan"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(major)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Hapus Jurusan"
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
          totalItems={filteredMajors.length}
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
                {editTarget ? 'Edit Konsentrasi Keahlian' : 'Tambah Konsentrasi Keahlian'}
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Singkat Jurusan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: TJKT, TKRO, AKL"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border uppercase font-mono ${
                    formErrors.code ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                />
                {formErrors.code && <p className="text-xs text-rose-500 mt-1">{formErrors.code}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Jurusan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Teknik Jaringan Komputer dan Telekomunikasi"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border ${
                    formErrors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                />
                {formErrors.name && <p className="text-xs text-rose-500 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={3}
                  placeholder="Keterangan fokus kompetensi keahlian..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Keaktifan</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="active">Aktif (Dapat digunakan dalam pendaftaran kelas)</option>
                  <option value="inactive">Nonaktif (Diarsipkan)</option>
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
                  {editTarget ? 'Simpan Perubahan' : 'Tambah Jurusan'}
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
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-mono font-bold text-sm">
                  {detailTarget.code}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">{detailTarget.name}</h3>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      detailTarget.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {detailTarget.status === 'active' ? 'Jurusan Aktif' : 'Jurusan Nonaktif'}
                  </span>
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
              <div>
                <p className="font-semibold text-slate-500 text-[11px] uppercase">Deskripsi Kompetensi</p>
                <p className="mt-1 text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  {detailTarget.description || 'Tidak ada keterangan tambahan.'}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500 text-[11px] uppercase mb-2">
                  Daftar Rombongan Belajar (Kelas) Terdaftar:
                </p>
                <div className="flex flex-wrap gap-2">
                  {classes.filter((c) => c.major_id === detailTarget.id).length > 0 ? (
                    classes
                      .filter((c) => c.major_id === detailTarget.id)
                      .map((c) => (
                        <span
                          key={c.id}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100"
                        >
                          {c.name} ({c.academic_year})
                        </span>
                      ))
                  ) : (
                    <span className="text-slate-400 italic text-xs">Belum ada kelas yang terhubung.</span>
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
        title="Hapus Konsentrasi Keahlian?"
        message={`Apakah Anda yakin ingin menghapus jurusan "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus Jurusan"
        cancelText="Batal"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Import Wizard Modal */}
      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        initialEntityType="jurusan"
        onSuccess={(summary) => {
          setToast({
            id: Date.now().toString(),
            type: 'success',
            title: 'Impor Selesai',
            message: `Berhasil mengimpor ${summary.successCount} data program studi jurusan baru.`,
          });
        }}
      />
    </div>
  );
};
