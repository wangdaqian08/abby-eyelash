// Resolves a photo manifest id to its processed master (src/assets/photos/<dir>/<id>.jpg).
const masters = import.meta.glob<ImageMetadata>('../assets/photos/**/*.jpg', { eager: true, import: 'default' });

export function photoSrc(id: string): ImageMetadata {
  const m = Object.entries(masters).find(([p]) => p.endsWith(`/${id}.jpg`));
  if (!m) throw new Error(`missing master for ${id}`);
  return m[1];
}
