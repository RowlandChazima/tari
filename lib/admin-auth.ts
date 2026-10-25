/**
 * Validates and sanitizes the `?next=` query parameter for admin redirects.
 * Only relative local `/admin/*` paths are permitted. Any external or malformed
 * URLs are strictly rejected and defaulted to `/admin/products`.
 */
export function sanitizeAdminNextPath(next: string | null | undefined): string {
  if (!next || typeof next !== 'string') {
    return '/admin/products';
  }

  const trimmed = next.trim();

  // Must strictly start with /admin
  if (!trimmed.startsWith('/admin')) {
    return '/admin/products';
  }

  // Reject open-redirect attack vectors:
  // - Protocol-relative (//)
  // - Backslashes (/\ or \)
  // - Schemes (http:, https:, javascript:)
  // - Path traversal (..)
  // - Authority/userinfo (@)
  if (
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    trimmed.includes(':') ||
    trimmed.includes('..') ||
    trimmed.includes('@')
  ) {
    return '/admin/products';
  }

  return trimmed;
}

