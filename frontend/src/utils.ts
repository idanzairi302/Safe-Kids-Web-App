/**
 * Resolve an image path to a full URL.
 * - If the image starts with http:// or https://, return as-is (external URL, e.g. Google avatar)
 * - If the image starts with /uploads/, return as-is (already a relative path)
 * - Otherwise, assume it's just a filename and prepend /uploads/
 */
export function resolveImageUrl(image: string | undefined | null): string {
  if (!image) return '';
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  if (image.startsWith('/uploads/')) return image;
  return `/uploads/${image}`;
}
