/**
 * Uploads guest ID proofs and expense receipts to private storage (Cloudflare R2).
 * Flow: pick/capture -> shrink photos -> ask our API for a 5-minute upload link ->
 * upload the file directly to storage -> confirm with the API.
 * The storage keys never reach the phone.
 */
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { apiClient } from './apiClient';

export type DocEntityType = 'booking' | 'expense';

export interface PickedFile {
  uri: string;
  mimeType: string;
  fileName: string;
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_IMAGE_WIDTH = 1600;
const JPEG_QUALITY = 0.6;

/** Shrinks a photo to <=1600px wide JPEG (~200-400 KB) before upload. */
async function compressImage(uri: string): Promise<PickedFile> {
  const out = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: MAX_IMAGE_WIDTH } }], {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: out.uri, mimeType: 'image/jpeg', fileName: `photo-${Date.now()}.jpg` };
}

export async function takePhoto(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Camera permission is required to photograph the document.');
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  if (res.canceled || !res.assets?.length) return null;
  return compressImage(res.assets[0].uri);
}

export async function pickPhoto(): Promise<PickedFile | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (res.canceled || !res.assets?.length) return null;
  return compressImage(res.assets[0].uri);
}

export async function pickPdf(): Promise<PickedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, mimeType: a.mimeType || 'application/pdf', fileName: a.name || `document-${Date.now()}.pdf` };
}

export async function uploadDocument(
  entityType: DocEntityType,
  entityId: string,
  docType: string,
  file: PickedFile
): Promise<string> {
  if (!ALLOWED.includes(file.mimeType)) {
    throw new Error('Only photos (JPEG/PNG/WebP) or PDF files can be uploaded.');
  }
  const info = await FileSystem.getInfoAsync(file.uri);
  const sizeBytes = info.exists && 'size' in info ? info.size : undefined;

  const { documentId, uploadUrl, contentType } = await apiClient.requestDocumentUpload({
    entityType,
    entityId,
    docType,
    contentType: file.mimeType,
    sizeBytes,
    fileName: file.fileName,
  });

  const result = await FileSystem.uploadAsync(uploadUrl, file.uri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': contentType },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload to storage failed (HTTP ${result.status}). Please try again.`);
  }

  await apiClient.completeDocumentUpload(documentId);
  return documentId;
}
