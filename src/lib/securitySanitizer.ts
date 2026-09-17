/**
 * Security & Sanitization Engine
 * Menyediakan proteksi terhadap XSS, File Upload Injection, Path Traversal,
 * Information Disclosure (Secret Masking), dan IDOR (Insecure Direct Object Reference).
 */

// 1. Sanitasi Teks HTML / Rich Text (Anti-XSS)
export function sanitizeRichText(dirty: string): string {
  if (!dirty) return '';

  let sanitized = dirty;

  // Hapus tag skrip berbahaya dan event handler inline
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // onclick, onerror, onload, onmouseover dll
    .replace(/on\w+\s*=\s*[^>\s]+/gi, '')
    .replace(/javascript\s*:/gi, 'blocked-protocol:')
    .replace(/vbscript\s*:/gi, 'blocked-protocol:')
    .replace(/data\s*:\s*text\/html/gi, 'blocked-mime:');

  return sanitized;
}

// 2. Sanitasi Input Teks Pendek (Nama, Kode, NIS, NISN)
export function sanitizePlainText(val: string, maxLength: number = 255): string {
  if (!val) return '';
  return val
    .trim()
    .slice(0, maxLength)
    .replace(/[<>'"&]/g, (char) => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case "'": return '&#39;';
        case '"': return '&quot;';
        case '&': return '&amp;';
        default: return char;
      }
    });
}

// 3. Validasi & Sanitasi Unggah Berkas (Anti-Malicious File & Path Traversal)
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFileName?: string;
}

const DANGEROUS_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'py', 'js', 'vbs', 'jar', 'msi', 'bin', 'dll', 'com'
];

export function validateFileUpload(
  file: File,
  options?: {
    maxSizeBytes?: number;
    allowedExtensions?: string[];
    allowedMimeTypes?: string[];
  }
): FileValidationResult {
  const maxSizeBytes = options?.maxSizeBytes || 10 * 1024 * 1024; // Default 10MB
  const allowedExtensions = options?.allowedExtensions || ['xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'webp', 'pdf'];

  // Cek ukuran berkas
  if (file.size <= 0) {
    return { valid: false, error: 'Berkas kosong (0 bytes). Silakan pilih berkas yang valid.' };
  }

  if (file.size > maxSizeBytes) {
    const mbLimit = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Ukuran berkas (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal ${mbLimit} MB.`,
    };
  }

  // Cek ekstensi berkas
  const rawName = file.name || '';
  // Cegah Path Traversal
  if (rawName.includes('..') || rawName.includes('/') || rawName.includes('\\') || rawName.includes('%00')) {
    return { valid: false, error: 'Nama berkas mengandung karakter tidak aman (path traversal terdeteksi).' };
  }

  const ext = rawName.split('.').pop()?.toLowerCase() || '';

  // Cek ekstensi berbahaya
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Ekstensi berkas .${ext} dilarang karena berisiko keamanan tinggi.` };
  }

  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Format berkas .${ext} tidak diizinkan. Format yang diterima: ${allowedExtensions.map((e) => `.${e}`).join(', ')}`,
    };
  }

  // Sanitasi nama berkas (hanya alfanumerik, dash, underscore, dan ekstensi)
  const baseName = rawName.substring(0, rawName.lastIndexOf('.'));
  const safeBaseName = baseName.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 100);
  const sanitizedFileName = `${safeBaseName}.${ext}`;

  return {
    valid: true,
    sanitizedFileName,
  };
}

// 4. Masking Pesan Error & Rahasia (Anti-Information Disclosure)
export function maskSensitiveError(err: any): string {
  if (!err) return 'Terjadi kesalahan internal.';

  const rawMessage = typeof err === 'string' ? err : err.message || JSON.stringify(err);

  // Masking connection strings, API keys, passwords, SQL traces
  let masked = rawMessage
    .replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***:***@')
    .replace(/ey[a-zA-Z0-9_-]+\.ey[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, 'eyJ...[JWT_TOKEN_MASKED]')
    .replace(/(password|secret|api_key|service_role)[=\s:]+["']?[^"'&\s]+["']?/gi, '$1=***MASKED***')
    .replace(/column\s+"[^"]+"\s+does not exist/gi, 'Kolom basis data tidak sesuai.')
    .replace(/syntax error at or near/gi, 'Kesalahan sintaks kueri basis data.');

  return masked;
}

// 5. Pemeriksaan Anti-IDOR (Insecure Direct Object Reference)
export function verifyOwnershipOrRole(params: {
  resourceOwnerId?: string;
  currentUserId?: string;
  userRole?: string;
  allowedRoles?: string[];
}): { allowed: boolean; reason?: string } {
  const { resourceOwnerId, currentUserId, userRole, allowedRoles = ['admin'] } = params;

  // Admin selalu diizinkan
  if (userRole && allowedRoles.includes(userRole)) {
    return { allowed: true };
  }

  // Jika siswa/guru, harus cocok dengan id pemilik
  if (resourceOwnerId && currentUserId && resourceOwnerId === currentUserId) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Akses Ditolak (Proteksi IDOR): Anda tidak memiliki otorisasi untuk mengakses berkas atau hasil ini.',
  };
}
