/**
 * Shared image intake: drag a photo, paste from the clipboard, or choose a file.
 */

export const IMAGE_INTAKE_HINT = 'Drop, paste, or choose a file';
export const IMAGE_INTAKE_ACCEPT = 'image/*';

const IMAGE_NAME = /\.(jpe?g|png|gif|webp|bmp|avif)$/i;

export function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return !file.type && IMAGE_NAME.test(file.name);
}

export function imageFileFromList(files: FileList | File[] | null | undefined): File | null {
  if (!files) return null;
  for (const file of Array.from(files)) {
    if (isImageFile(file)) return file;
  }
  return null;
}

export function imageFileFromDataTransfer(data: DataTransfer | null | undefined): File | null {
  if (!data) return null;
  const fromFiles = imageFileFromList(data.files);
  if (fromFiles) return fromFiles;
  for (const item of Array.from(data.items || [])) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    if (file && isImageFile(file)) return file;
  }
  return null;
}
