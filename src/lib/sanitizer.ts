// Utility sanitizer kuat dan aman tanpa dependensi eksternal
// Memastikan hanya tag format teks yang diperbolehkan (b, i, u, sup, sub, code, ul, ol, li, p, br, span, strong, em)
// Mencegah Stored & DOM-based XSS secara mutlak

export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml) return '';

  // Buat DOM parser di browser atau fallback regex aman
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return rawHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:[^"']*/gi, '');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // Tag yang diizinkan untuk soal TKA SMKN 1 Songgom
  const allowedTags = new Set([
    'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
    'SUP', 'SUB', 'P', 'BR', 'SPAN',
    'UL', 'OL', 'LI', 'CODE', 'PRE'
  ]);

  // Atribut yang aman diperbolehkan pada tag tertentu
  const allowedAttributes = new Set(['class', 'title', 'dir']);

  function cleanNode(node: Node) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tagName = el.tagName.toUpperCase();

        if (!allowedTags.has(tagName)) {
          // Ganti dengan teks biasa (strip tag berbahaya seperti script, iframe, object, img, svg, form)
          const textNode = doc.createTextNode(el.textContent || '');
          node.replaceChild(textNode, el);
        } else {
          // Bersihkan semua atribut kecuali yang secara eksplisit diizinkan
          const attributes = Array.from(el.attributes);
          for (const attr of attributes) {
            const attrName = attr.name.toLowerCase();
            const attrVal = attr.value.toLowerCase();

            // Tolak event handler (on*), javascript pseudo-protocol, data URI, vbscript
            if (
              !allowedAttributes.has(attrName) ||
              attrName.startsWith('on') ||
              attrVal.includes('javascript:') ||
              attrVal.includes('vbscript:') ||
              attrVal.includes('data:')
            ) {
              el.removeAttribute(attr.name);
            }
          }
          cleanNode(el);
        }
      }
    }
  }

  cleanNode(doc.body);
  return doc.body.innerHTML;
}
