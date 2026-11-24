/**
 * Document uploads (guest ID proofs on bookings, receipts on expenses) stored in private R2.
 *
 *   POST   /documents/upload-url   -> { documentId, uploadUrl, contentType }   (5-minute presigned PUT)
 *   POST   /documents/:id/complete -> verifies the object exists and is within limits
 *   GET    /documents?entityType=&entityId= -> list with 5-minute view URLs
 *   DELETE /documents/:id          -> removes object + marks row deleted
 *
 * Every call checks that the booking/expense belongs to one of the caller's hotels.
 */
import { prisma } from '@/lib/prisma';
import { isStorageConfigured, presignUpload, presignView, statObject, deleteObject } from '@/lib/storage';
import { MobileRouter, type MobileResponse } from './router';
import type { MobileContext } from './context';

const ENTITY_DOC_TYPES: Record<string, string[]> = {
  booking: ['id_front', 'id_back', 'id_document', 'other'],
  expense: ['receipt', 'other'],
};

const MAX_BYTES: Record<string, number> = {
  'image/jpeg': 8 * 1024 * 1024,
  'image/png': 8 * 1024 * 1024,
  'image/webp': 8 * 1024 * 1024,
  'application/pdf': 15 * 1024 * 1024,
};
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
const MAX_DOCS_PER_RECORD = 10;

function notConfigured(res: MobileResponse) {
  return res.status(503).json({ error: 'Document storage is not configured on the server yet.' });
}

/** Hotel that owns the booking/expense, or null if it does not exist. */
async function ownerHotel(entityType: string, entityId: string): Promise<string | null> {
  if (entityType === 'booking') {
    return (await prisma.booking.findUnique({ where: { id: entityId }, select: { hotelId: true } }))?.hotelId ?? null;
  }
  if (entityType === 'expense') {
    return (await prisma.expense.findUnique({ where: { id: entityId }, select: { hotelId: true } }))?.hotelId ?? null;
  }
  return null;
}

export function registerDocumentRoutes(router: MobileRouter, ctx: MobileContext) {
  const { user, allowedHotelIds } = ctx;

  router.post('/documents/upload-url', async (req, res) => {
    if (!isStorageConfigured()) return notConfigured(res);
    const { entityType, entityId, docType, contentType, sizeBytes, fileName } = req.body ?? {};

    if (!ENTITY_DOC_TYPES[entityType] || !ENTITY_DOC_TYPES[entityType].includes(docType)) {
      return res.status(400).json({ error: 'Unsupported document type.' });
    }
    if (!MAX_BYTES[contentType]) {
      return res.status(400).json({ error: 'Only JPEG, PNG, WebP images or PDF files can be uploaded.' });
    }
    if (sizeBytes != null && Number(sizeBytes) > MAX_BYTES[contentType]) {
      return res.status(400).json({ error: `File is too large (max ${MAX_BYTES[contentType] / 1024 / 1024} MB).` });
    }
    const hotelId = await ownerHotel(entityType, String(entityId ?? ''));
    if (!hotelId) return res.status(404).json({ error: 'Record not found.' });
    if (!allowedHotelIds.includes(hotelId)) {
      return res.status(403).json({ error: 'Access Denied: you cannot attach documents to this hotel\'s records.' });
    }
    const existing = await prisma.document.count({
      where: { entityType, entityId: String(entityId), deletedAt: null },
    });
    if (existing >= MAX_DOCS_PER_RECORD) {
      return res.status(400).json({ error: `A record can have at most ${MAX_DOCS_PER_RECORD} documents.` });
    }

    const doc = await prisma.document.create({
      data: {
        organizationId: user.organizationId,
        hotelId,
        entityType,
        entityId: String(entityId),
        docType,
        objectKey: 'pending',
        contentType,
        sizeBytes: sizeBytes != null ? Number(sizeBytes) : null,
        originalName: fileName ? String(fileName).slice(0, 180) : null,
        uploadedById: user.id,
      },
    });
    const objectKey = `${hotelId}/${entityType}/${entityId}/${doc.id}.${EXT[contentType]}`;
    await prisma.document.update({ where: { id: doc.id }, data: { objectKey } });

    const uploadUrl = await presignUpload(objectKey, contentType);
    res.status(201).json({ documentId: doc.id, uploadUrl, contentType, expiresInSeconds: 300 });
  });

  router.post('/documents/:id/complete', async (req, res) => {
    if (!isStorageConfigured()) return notConfigured(res);
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc || doc.deletedAt || !allowedHotelIds.includes(doc.hotelId)) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    const stat = await statObject(doc.objectKey);
    if (!stat) return res.status(400).json({ error: 'Upload not found in storage. Please try again.' });
    if (stat.size > (MAX_BYTES[doc.contentType] ?? 0)) {
      await deleteObject(doc.objectKey);
      await prisma.document.update({ where: { id: doc.id }, data: { deletedAt: new Date() } });
      return res.status(400).json({ error: 'File is too large and was removed.' });
    }
    await prisma.document.update({ where: { id: doc.id }, data: { status: 'uploaded', sizeBytes: stat.size } });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        hotelId: doc.hotelId,
        action: 'CREATE',
        entityType: 'Document',
        entityId: doc.id,
        details: `${doc.docType} uploaded for ${doc.entityType} ${doc.entityId}`,
      },
    });
    res.json({ success: true, documentId: doc.id, sizeBytes: stat.size });
  });

  router.get('/documents', async (req, res) => {
    if (!isStorageConfigured()) return notConfigured(res);
    const { entityType, entityId } = req.query;
    if (!ENTITY_DOC_TYPES[entityType] || !entityId) {
      return res.status(400).json({ error: 'entityType and entityId are required.' });
    }
    const hotelId = await ownerHotel(entityType, entityId);
    if (!hotelId) return res.status(404).json({ error: 'Record not found.' });
    if (!allowedHotelIds.includes(hotelId)) return res.status(403).json({ error: 'Access Denied.' });

    const docs = await prisma.document.findMany({
      where: { entityType, entityId, status: 'uploaded', deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    const items = await Promise.all(
      docs.map(async (d) => ({
        id: d.id,
        docType: d.docType,
        contentType: d.contentType,
        sizeBytes: d.sizeBytes,
        originalName: d.originalName,
        createdAt: d.createdAt,
        viewUrl: await presignView(d.objectKey, d.originalName || `${d.docType}.${EXT[d.contentType] ?? 'bin'}`),
      }))
    );
    res.json(items);
  });

  router.delete('/documents/:id', async (req, res) => {
    if (!isStorageConfigured()) return notConfigured(res);
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc || doc.deletedAt || !allowedHotelIds.includes(doc.hotelId)) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    await deleteObject(doc.objectKey);
    await prisma.document.update({ where: { id: doc.id }, data: { deletedAt: new Date() } });
    await prisma.auditLog.create({
      data: { userId: user.id, hotelId: doc.hotelId, action: 'DELETE', entityType: 'Document', entityId: doc.id, details: doc.docType },
    });
    res.json({ success: true });
  });
}
