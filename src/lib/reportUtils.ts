import { ExamResultSummary, Exam, Subject, Teacher, SchoolClass, Major, Student } from '../types';

export interface ReportRowData {
  no: number;
  attemptId: string;
  studentId: string;
  studentName: string;
  nis: string;
  nisn: string;
  className: string;
  majorCode: string;
  majorName: string;
  subjectName: string;
  examId: string;
  examTitle: string;
  teacherName: string;
  date: string; // YYYY-MM-DD
  dateTimeDisplay: string;
  totalQuestions: number;
  correct: number;
  incorrect: number;
  empty: number;
  score: number; // total poin
  maxScore: number;
  nilai: number; // 0 - 100
  duration: string;
  status: 'Tuntas' | 'Remedial' | 'Menunggu Esai' | 'In Progress';
  isPassed: boolean;
  passScore: number;
  pendingEssay: number;
  gradeCode: string;
  gradeLabel: string;
}

export interface ReportAnalytics {
  totalParticipants: number;
  averageNilai: number;
  highestNilai: number;
  lowestNilai: number;
  passedCount: number;
  failedCount: number;
  passingRate: number; // 0 - 100 %
  pendingEssayCount: number;
  distribution: {
    sangatBaik: { count: number; percentage: number; label: '85 - 100' };
    baik: { count: number; percentage: number; label: '75 - 84' };
    cukup: { count: number; percentage: number; label: '60 - 74' };
    kurang: { count: number; percentage: number; label: '< 60' };
  };
}

/**
 * Calculate statistical analytics from report rows
 */
export function calculateReportAnalytics(rows: ReportRowData[]): ReportAnalytics {
  if (rows.length === 0) {
    return {
      totalParticipants: 0,
      averageNilai: 0,
      highestNilai: 0,
      lowestNilai: 0,
      passedCount: 0,
      failedCount: 0,
      passingRate: 0,
      pendingEssayCount: 0,
      distribution: {
        sangatBaik: { count: 0, percentage: 0, label: '85 - 100' },
        baik: { count: 0, percentage: 0, label: '75 - 84' },
        cukup: { count: 0, percentage: 0, label: '60 - 74' },
        kurang: { count: 0, percentage: 0, label: '< 60' },
      },
    };
  }

  let totalNilai = 0;
  let highest = -Infinity;
  let lowest = Infinity;
  let passed = 0;
  let pendingEssays = 0;

  let countSangatBaik = 0;
  let countBaik = 0;
  let countCukup = 0;
  let countKurang = 0;

  rows.forEach((r) => {
    const val = r.nilai;
    totalNilai += val;
    if (val > highest) highest = val;
    if (val < lowest) lowest = val;
    if (r.isPassed) passed++;
    if (r.pendingEssay > 0) pendingEssays++;

    if (val >= 85) {
      countSangatBaik++;
    } else if (val >= 75) {
      countBaik++;
    } else if (val >= 60) {
      countCukup++;
    } else {
      countKurang++;
    }
  });

  const total = rows.length;
  const avg = Math.round((totalNilai / total) * 10) / 10;
  const passRate = Math.round((passed / total) * 1000) / 10;

  return {
    totalParticipants: total,
    averageNilai: avg,
    highestNilai: highest === -Infinity ? 0 : highest,
    lowestNilai: lowest === Infinity ? 0 : lowest,
    passedCount: passed,
    failedCount: total - passed,
    passingRate: passRate,
    pendingEssayCount: pendingEssays,
    distribution: {
      sangatBaik: {
        count: countSangatBaik,
        percentage: Math.round((countSangatBaik / total) * 100),
        label: '85 - 100',
      },
      baik: {
        count: countBaik,
        percentage: Math.round((countBaik / total) * 100),
        label: '75 - 84',
      },
      cukup: {
        count: countCukup,
        percentage: Math.round((countCukup / total) * 100),
        label: '60 - 74',
      },
      kurang: {
        count: countKurang,
        percentage: Math.round((countKurang / total) * 100),
        label: '< 60',
      },
    },
  };
}

/**
 * Export report rows to clean CSV/Excel with UTF-8 BOM
 */
export function exportReportToCSV(
  rows: ReportRowData[],
  options: {
    filename?: string;
    title?: string;
    filterSummary?: string;
    analytics?: ReportAnalytics;
  }
) {
  const title = options.title || 'LAPORAN HASIL TES KEMAMPUAN AKADEMIK (TKA) - SMKN 1 SONGGOM';
  const printDate = new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines: string[] = [];

  // Header Metadata
  lines.push(`"${title}"`);
  lines.push(`"SMKN 1 Songgom - Brebes, Jawa Tengah"`);
  lines.push(`"Tanggal Unduh: ${printDate}"`);
  if (options.filterSummary) {
    lines.push(`"Filter Aktif: ${options.filterSummary}"`);
  }
  lines.push('');

  // Analytics summary if available
  if (options.analytics) {
    lines.push('"RINGKASAN STATISTIK"');
    lines.push(`"Jumlah Peserta","${options.analytics.totalParticipants}"`);
    lines.push(`"Rata-rata Nilai","${options.analytics.averageNilai}"`);
    lines.push(`"Nilai Tertinggi","${options.analytics.highestNilai}"`);
    lines.push(`"Nilai Terendah","${options.analytics.lowestNilai}"`);
    lines.push(`"Ketuntasan (KKM)","${options.analytics.passingRate}% (${options.analytics.passedCount} Tuntas / ${options.analytics.failedCount} Remedial)"`);
    lines.push('');
  }

  // Column Headers
  const headers = [
    'No',
    'Nama Siswa',
    'NIS',
    'NISN',
    'Kelas',
    'Jurusan',
    'Mata Pelajaran',
    'Ujian',
    'Guru Penguji',
    'Tanggal Selesai',
    'Jumlah Soal',
    'Benar',
    'Salah',
    'Kosong',
    'Skor Poin',
    'Nilai (0-100)',
    'Predikat',
    'Durasi',
    'Status Ketuntasan',
    'Status Esai',
  ];
  lines.push(headers.map((h) => `"${h}"`).join(','));

  // Data rows
  rows.forEach((r, idx) => {
    const row = [
      idx + 1,
      r.studentName,
      r.nis || '-',
      r.nisn || '-',
      r.className,
      r.majorCode || r.majorName,
      r.subjectName,
      r.examTitle,
      r.teacherName,
      r.dateTimeDisplay,
      r.totalQuestions,
      r.correct,
      r.incorrect,
      r.empty,
      r.score,
      r.nilai,
      r.gradeCode,
      r.duration,
      r.status,
      r.pendingEssay > 0 ? `${r.pendingEssay} Esai Belum Dinilai` : 'Lengkap',
    ];
    lines.push(row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','));
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = options.filename || `Laporan_TKA_SMKN1Songgom_${new Date().toISOString().slice(0, 10)}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Print formatted official report with SMKN 1 Songgom letterhead
 */
export function printOfficialReport(
  rows: ReportRowData[],
  options: {
    title: string;
    subtitle?: string;
    filterSummary?: string;
    analytics?: ReportAnalytics;
  }
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Jendela cetak diblokir oleh browser. Silakan izinkan pop-up.');
    return;
  }

  const printDate = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${options.title}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 12mm 15mm;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          color: #1e293b;
          margin: 0;
          padding: 10px;
        }
        .header {
          text-align: center;
          border-bottom: 3px double #0f172a;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .header h1 {
          font-size: 16px;
          margin: 0 0 2px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .header h2 {
          font-size: 13px;
          margin: 0 0 4px 0;
          color: #334155;
        }
        .header p {
          font-size: 10px;
          margin: 0;
          color: #64748b;
        }
        .meta-box {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 10px;
          background-color: #f8fafc;
          padding: 6px 10px;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        .stat-card {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
          border-radius: 4px;
          background: #ffffff;
          text-align: center;
        }
        .stat-card .val {
          font-size: 14px;
          font-weight: bold;
          color: #0f172a;
        }
        .stat-card .lbl {
          font-size: 9px;
          color: #64748b;
          text-transform: uppercase;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        th, td {
          border: 1px solid #94a3b8;
          padding: 5px 6px;
          font-size: 10px;
        }
        th {
          background-color: #f1f5f9;
          font-weight: bold;
          text-align: center;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .badge-tuntas { color: #15803d; font-weight: bold; }
        .badge-remedial { color: #b91c1c; font-weight: bold; }
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 25px;
          page-break-inside: avoid;
        }
        .sig-box {
          text-align: center;
          width: 200px;
        }
        .sig-line {
          margin-top: 50px;
          border-bottom: 1px solid #000;
        }
        @media print {
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>SMK NEGERI 1 SONGGOM</h1>
        <h2>${options.title}</h2>
        <p>Jl. Raya Songgom, Kec. Songgom, Kab. Brebes, Jawa Tengah 52266 • Telp: (0283) 6178899</p>
      </div>

      <div class="meta-box">
        <div>
          ${options.filterSummary ? `<strong>Filter:</strong> ${options.filterSummary}` : '<strong>Filter:</strong> Semua Data Terpilih'}
        </div>
        <div>
          <strong>Tanggal Cetak:</strong> ${printDate}
        </div>
      </div>

      ${
        options.analytics
          ? `
        <div class="stats-grid">
          <div class="stat-card">
            <div class="val">${options.analytics.totalParticipants}</div>
            <div class="lbl">Total Peserta</div>
          </div>
          <div class="stat-card">
            <div class="val">${options.analytics.averageNilai}</div>
            <div class="lbl">Rata-Rata Nilai</div>
          </div>
          <div class="stat-card">
            <div class="val">${options.analytics.highestNilai} / ${options.analytics.lowestNilai}</div>
            <div class="lbl">Tertinggi / Terendah</div>
          </div>
          <div class="stat-card">
            <div class="val">${options.analytics.passingRate}%</div>
            <div class="lbl">Ketuntasan (${options.analytics.passedCount}/${options.analytics.totalParticipants})</div>
          </div>
          <div class="stat-card">
            <div class="val">${options.analytics.pendingEssayCount}</div>
            <div class="lbl">Menunggu Esai</div>
          </div>
        </div>
      `
          : ''
      }

      <table>
        <thead>
          <tr>
            <th style="width: 25px;">No</th>
            <th>Nama Siswa</th>
            <th>NISN</th>
            <th>Kelas</th>
            <th>Jurusan</th>
            <th>Mata Pelajaran</th>
            <th>Ujian</th>
            <th>B</th>
            <th>S</th>
            <th>K</th>
            <th>Skor</th>
            <th>Nilai</th>
            <th>Predikat</th>
            <th>Durasi</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r, idx) => `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td class="font-bold">${r.studentName}</td>
              <td class="text-center">${r.nisn || '-'}</td>
              <td class="text-center">${r.className}</td>
              <td class="text-center">${r.majorCode}</td>
              <td>${r.subjectName}</td>
              <td>${r.examTitle}</td>
              <td class="text-center">${r.correct}</td>
              <td class="text-center">${r.incorrect}</td>
              <td class="text-center">${r.empty}</td>
              <td class="text-center">${r.score}/${r.maxScore}</td>
              <td class="text-center font-bold">${r.nilai}</td>
              <td class="text-center">${r.gradeCode}</td>
              <td class="text-center">${r.duration}</td>
              <td class="text-center ${r.isPassed ? 'badge-tuntas' : 'badge-remedial'}">${r.status}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="signatures">
        <div class="sig-box">
          <p>Mengetahui,<br>Kepala SMKN 1 Songgom</p>
          <div class="sig-line"></div>
          <p><strong>Drs. H. Ahmad Sudrajat, M.Pd.</strong><br>NIP. 196805141994031004</p>
        </div>
        <div class="sig-box">
          <p>Songgom, ${printDate}<br>Koordinator CBT / Penguji</p>
          <div class="sig-line"></div>
          <p><strong>Budi Santoso, S.Kom., M.T.</strong><br>NIP. 198507122010011005</p>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
