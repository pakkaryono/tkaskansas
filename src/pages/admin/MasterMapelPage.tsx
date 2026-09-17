import React, { useState, useMemo } from 'react';
import { useMasterData } from '../../contexts/MasterDataContext';
import { Subject, ToastNotification } from '../../types';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { Toast } from '../../components/common/Toast';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Pagination } from '../../components/common/Pagination';
import {
  BookOpen,
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
  Upload,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { ImportWizardModal } from '../../components/importExport/ImportWizardModal';
import { exportEntityToExcel, downloadTemplateExcel } from '../../lib/excelEngine';

interface MasterMapelPageProps {
  onNavigate: (path: string) => void;
}

export const MasterMapelPage: React.FC<MasterMapelPageProps> = ({ onNavigate }) => {
  const { subjects, teachers, addSubject, updateSubject, deleteSubject, toggleSubjectStatus } = useMasterData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);
  const [detailTarget, setDetailTarget] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Handle Export Excel (.xlsx) following active filter
  const handleExportExcel = () => {
    try {
      exportEntityToExcel('mapel', filteredSubjects);
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Ekspor Berhasil',
        message: `Berhasil mengekspor ${filteredSubjects.length} data mata pelajaran (.xlsx) sesuai filter.`,
      });
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Ekspor Gagal',
        message: err.message || 'Gagal mengekspor data mata pelajaran.',
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
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.code.toLowerCase().includes(search.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [subjects, search, statusFilter]);

  // Paginated data
  const paginatedSubjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSubjects.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSubjects, currentPage]);

  const handleOpenAdd = () => {
    setFormData({ code: '', name: '', description: '', status: 'active' });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (subject: Subject) => {
    setEditTarget(subject);
    setFormData({
      code: subject.code,
      name: subject.name,
      description: subject.description || '',
      status: subject.status,
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = 'Kode mata pelajaran wajib diisi';
    if (!formData.name.trim()) errors.name = 'Nama mata pelajaran wajib diisi';
    // Cek duplikasi kode
    const isDuplicate = subjects.some(
      (s) =>
        s.code.toLowerCase() === formData.code.trim().toLowerCase() &&
        (!editTarget || s.id !== editTarget.id)
    );
    if (isDuplicate) errors.code = 'Kode mata pelajaran sudah digunakan';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editTarget) {
        await updateSubject(editTarget.id, {
          code: formData.code.toUpperCase().trim(),
          name: formData.name.trim(),
          description: formData.description.trim(),
          status: formData.status,
        });
        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Mata Pelajaran Diperbarui',
          message: `Mata pelajaran ${formData.name} berhasil diperbarui.`,
        });
        setEditTarget(null);
      } else {
        await addSubject({
          code: formData.code.toUpperCase().trim(),
          name: formData.name.trim(),
          description: formData.description.trim(),
          status: formData.status,
        });
        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Mata Pelajaran Ditambahkan',
          message: `Mata pelajaran ${formData.name} berhasil disimpan.`,
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
    const result = await deleteSubject(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);

    if (result.success) {
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Mata Pelajaran Dihapus',
        message: `Mata pelajaran ${deleteTarget.name} telah dihapus.`,
      });
    } else {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Hapus Ditolak',
        message: result.message || 'Tidak dapat menghapus mata pelajaran ini.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header & Breadcrumb */}
      <div>
        <Breadcrumb
          items={[{ label: 'Data Master' }, { label: 'Mata Pelajaran' }]}
          onNavigate={onNavigate}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-blue-600" />
              <span>Master Mata Pelajaran</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Daftar mata pelajaran umum dan kejuruan yang diujikan dalam Tes Kemampuan Akademik (TKA).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadTemplateExcel('mapel')}
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
              disabled={filteredSubjects.length === 0}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all ${
                filteredSubjects.length > 0
                  ? 'bg-slate-800 hover:bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export ({filteredSubjects.length})</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Mapel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Mata Pelajaran</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{subjects.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Mata Pelajaran Aktif</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
              {subjects.filter((s) => s.status === 'active').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Guru Pengampu</p>
            <p className="text-2xl font-extrabold text-purple-600 mt-1">{teachers.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kode atau nama mata pelajaran..."
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">No</th>
                <th className="py-3.5 px-4">Kode Mapel</th>
                <th className="py-3.5 px-4">Nama Mata Pelajaran</th>
                <th className="py-3.5 px-4">Guru Pengampu</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700">
              {paginatedSubjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FolderOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada mata pelajaran ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {search ? 'Coba ubah kata kunci pencarian' : 'Tambahkan mata pelajaran baru.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedSubjects.map((subject, index) => {
                  const assignedTeachers = teachers.filter((t) => t.subject_ids?.includes(subject.id));

                  return (
                    <tr key={subject.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                        <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200/60 text-xs">
                          {subject.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{subject.name}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{subject.description || '-'}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {assignedTeachers.length > 0 ? (
                            assignedTeachers.map((t) => (
                              <span
                                key={t.id}
                                className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[11px] font-medium border border-purple-100"
                              >
                                {t.full_name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs italic">Belum ada pengampu</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => toggleSubjectStatus(subject.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                            subject.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                          }`}
                          title="Klik untuk mengubah status"
                        >
                          {subject.status === 'active' ? (
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
                            onClick={() => setDetailTarget(subject)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(subject)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-amber-600 transition-colors"
                            title="Edit Mapel"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(subject)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Hapus Mapel"
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
          totalItems={filteredSubjects.length}
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
                {editTarget ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
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
                  Kode Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: MTK-SMK, KJ-TJKT"
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
                  Nama Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Matematika Terapan Kejuruan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border ${
                    formErrors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                />
                {formErrors.name && <p className="text-xs text-rose-500 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Silabus / Deskripsi</label>
                <textarea
                  rows={3}
                  placeholder="Cakupan materi yang diujikan dalam TKA..."
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
                  <option value="active">Aktif (Dapat dipilih dalam pembuatan Bank Soal)</option>
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
                  {editTarget ? 'Simpan Perubahan' : 'Tambah Mata Pelajaran'}
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
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-mono font-bold text-xs">
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
                    {detailTarget.status === 'active' ? 'Mapel Aktif' : 'Mapel Nonaktif'}
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
                <p className="font-semibold text-slate-500 text-[11px] uppercase">Cakupan Materi / Silabus</p>
                <p className="mt-1 text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  {detailTarget.description || 'Tidak ada deskripsi tambahan.'}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500 text-[11px] uppercase mb-2">
                  Guru yang Mengampu Mata Pelajaran Ini:
                </p>
                <div className="space-y-2">
                  {teachers.filter((t) => t.subject_ids?.includes(detailTarget.id)).length > 0 ? (
                    teachers
                      .filter((t) => t.subject_ids?.includes(detailTarget.id))
                      .map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/70"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{t.full_name}</p>
                            <p className="text-[11px] text-slate-500">NIP: {t.nip} • {t.email}</p>
                          </div>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            Pengampu
                          </span>
                        </div>
                      ))
                  ) : (
                    <p className="text-slate-400 italic text-xs">Belum ada guru yang ditugaskan.</p>
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
        title="Hapus Mata Pelajaran?"
        message={`Apakah Anda yakin ingin menghapus mata pelajaran "${deleteTarget?.name}"?`}
        confirmText="Hapus Mata Pelajaran"
        cancelText="Batal"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Import Wizard Modal */}
      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        initialEntityType="mapel"
        onSuccess={(summary) => {
          setToast({
            id: Date.now().toString(),
            type: 'success',
            title: 'Impor Selesai',
            message: `Berhasil mengimpor ${summary.successCount} data mata pelajaran baru.`,
          });
        }}
      />
    </div>
  );
};
