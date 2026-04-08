import { IAttachmentFile } from '../types';

export const DEFAULT_ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp';
export const MAX_INLINE_ATTACHMENT_SIZE_BYTES = 3 * 1024 * 1024;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error || new Error('Không thể đọc file'));
    reader.readAsDataURL(file);
  });

export const readFilesAsAttachmentRecords = async (
  files: FileList | File[] | null
): Promise<IAttachmentFile[]> => {
  const nextFiles = Array.from(files || []);
  if (nextFiles.length === 0) return [];

  const oversizedFiles = nextFiles.filter((file) => file.size > MAX_INLINE_ATTACHMENT_SIZE_BYTES);
  if (oversizedFiles.length > 0) {
    const fileNames = oversizedFiles.slice(0, 3).map((file) => file.name).join(', ');
    throw new Error(`File vượt quá 3MB: ${fileNames}`);
  }

  return Promise.all(
    nextFiles.map(async (file, index) => ({
      id: `ATT-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      url: await readFileAsDataUrl(file)
    }))
  );
};
