/**
 * Copies text to the clipboard, working in both secure and insecure contexts.
 *
 * `navigator.clipboard` only exists in secure contexts (HTTPS, or
 * http://localhost) - accessing the app over a plain-HTTP LAN IP (a
 * documented dev-convenience origin for this project, see crm-api/CLAUDE.md's
 * CORS section) makes `navigator.clipboard` undefined, so calling
 * `.writeText` on it throws synchronously. Falls back to the legacy
 * `document.execCommand('copy')` technique via a hidden textarea in that case.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy fallback below (e.g. permission denied).
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
