// Utility sanitizer sederhana dan aman tanpa dependensi eksternal
// Memastikan hanya tag format teks yang diperbolehkan (b, i, u, sup, sub, code, ul, ol, li, p, br, span, strong, em)

export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml) return '';

  // Buat DOM parser di browser
  if (typeof window === 'undefined') {
    return rawHtml.replace(/<[^>]*>?/gm, '');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // Tag yang diizinkan untuk soal TKA
  const allowedTags = new Set([
    'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
    'SUP', 'SUB', 'P', 'BR', 'SPAN',
    'UL', 'OL', 'LI', 'CODE', 'PRE'
  ]);

  function cleanNode(node: Node) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tagName = el.tagName.toUpperCase();

        if (!allowedTags.has(tagName)) {
          // Ganti dengan teks biasa
          const textNode = doc.createTextNode(el.textContent || '');
          node.replaceChild(textNode, el);
        } else {
          // Bersihkan semua atribut berbahaya (onclick, onerror, javascript:)
          const attributes = Array.from(el.attributes);
          for (const attr of attributes) {
            const attrName = attr.name.toLowerCase();
            const attrVal = attr.value.toLowerCase();
            if (attrName.startsWith('on') || attrVal.startsWith('javascript:')) {
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
