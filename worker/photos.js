// Restrict inline photos to bounded raster files. SVG/HTML/remote URLs are never accepted.
export function validPhoto(value) {
  if (typeof value !== 'string' || value.length > 240_000) return false;
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  let bytes;
  try { bytes = atob(match[2]); } catch { return false; }
  if (match[1] === 'jpeg') return bytes.startsWith('\xff\xd8\xff');
  if (match[1] === 'png') return bytes.startsWith('\x89PNG\r\n\x1a\n');
  return bytes.startsWith('RIFF') && bytes.slice(8,12) === 'WEBP';
}
