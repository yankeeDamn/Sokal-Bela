// The URL and storage flag unlock a device preview. Only this switch rolls it out to everyone.
export const ENABLE_PARTNER_STORE_PUBLIC = false;
const PREVIEW_KEY = 'sb_partner_preview_v1';

export function storeAccess(search, storage, publicStore = ENABLE_PARTNER_STORE_PUBLIC) {
  const params = new URLSearchParams(search);
  const admin = params.get('admin') === 'sokal247';
  const flag = params.get('preview');
  let saved = false;
  try {
    if (flag === 'false') storage.removeItem(PREVIEW_KEY);
    else if (flag === 'true' || admin) storage.setItem(PREVIEW_KEY, '1');
    saved = storage.getItem(PREVIEW_KEY) === '1';
  } catch { /* URL previews still work when browser storage is unavailable. */ }
  return { visible: publicStore || admin || flag === 'true' || (flag !== 'false' && saved), admin };
}
