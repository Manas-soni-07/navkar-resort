/**
 * Shows the documents attached to a booking (guest ID proofs) or an expense (receipts),
 * and lets staff add more by camera, gallery or PDF. Files are stored privately;
 * each "View" opens a link that expires after 5 minutes.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { apiClient, StoredDocument } from '../../services/apiClient';
import { takePhoto, pickPhoto, pickPdf, uploadDocument, DocEntityType, PickedFile } from '../../services/documentService';

interface DocTypeOption {
  id: string;
  label: string;
}

const OPTIONS: Record<DocEntityType, DocTypeOption[]> = {
  booking: [
    { id: 'id_front', label: 'ID Front' },
    { id: 'id_back', label: 'ID Back' },
    { id: 'id_document', label: 'Other ID' },
  ],
  expense: [
    { id: 'receipt', label: 'Receipt' },
    { id: 'other', label: 'Other' },
  ],
};

const LABELS: Record<string, string> = {
  id_front: 'ID Front',
  id_back: 'ID Back',
  id_document: 'ID Document',
  receipt: 'Receipt',
  other: 'Other',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  entityType: DocEntityType;
  entityId: string;
  title: string;
  subtitle?: string;
}

export const DocumentsModal: React.FC<Props> = ({ visible, onClose, entityType, entityId, title, subtitle }) => {
  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<string>(OPTIONS[entityType][0].id);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    setError(null);
    try {
      setDocs(await apiClient.listDocuments(entityType, entityId));
    } catch (e: any) {
      setError(e?.message || 'Could not load documents.');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    if (visible) {
      setDocType(OPTIONS[entityType][0].id);
      load();
    }
  }, [visible, entityType, load]);

  const handleAdd = async (source: 'camera' | 'gallery' | 'pdf') => {
    try {
      const file: PickedFile | null =
        source === 'camera' ? await takePhoto() : source === 'gallery' ? await pickPhoto() : await pickPdf();
      if (!file) return;
      setUploading(true);
      await uploadDocument(entityType, entityId, docType, file);
      await load();
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Could not upload the document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (doc: StoredDocument) => {
    Alert.alert('Delete Document', `Delete this ${LABELS[doc.docType] || 'document'}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.deleteDocument(doc.id);
            await load();
          } catch (e: any) {
            Alert.alert('Delete Failed', e?.message || 'Could not delete the document.');
          }
        },
      },
    ]);
  };

  const handleView = async (doc: StoredDocument) => {
    try {
      await Linking.openURL(doc.viewUrl);
    } catch {
      Alert.alert('Cannot Open', 'No app on this phone can open this file.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Icon name="x" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {entityType === 'booking' ? (
            <View style={styles.notice}>
              <Icon name="shield" size={14} color={colors.goldDark} />
              <Text style={styles.noticeText}>
                For Aadhaar, upload the masked copy (only the last 4 digits visible). Files are private to this hotel.
              </Text>
            </View>
          ) : null}

          <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ paddingBottom: spacing.sm }}>
            {loading ? (
              <ActivityIndicator color={colors.primaryNavy} style={{ marginVertical: spacing.lg }} />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : docs.length === 0 ? (
              <Text style={styles.emptyText}>No documents attached yet.</Text>
            ) : (
              docs.map((d) => (
                <View key={d.id} style={styles.docRow}>
                  <TouchableOpacity style={styles.thumb} onPress={() => handleView(d)}>
                    {d.contentType.startsWith('image/') ? (
                      <Image source={{ uri: d.viewUrl }} style={styles.thumbImage} />
                    ) : (
                      <Icon name="file-text" size={24} color={colors.primaryNavy} />
                    )}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docLabel}>{LABELS[d.docType] || d.docType}</Text>
                    <Text style={styles.docMeta}>
                      {d.contentType === 'application/pdf' ? 'PDF' : 'Photo'}
                      {d.sizeBytes ? ` • ${Math.max(1, Math.round(d.sizeBytes / 1024))} KB` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleView(d)} style={styles.linkBtn}>
                    <Text style={styles.linkText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(d)} style={styles.linkBtn}>
                    <Text style={[styles.linkText, { color: colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          <Text style={styles.sectionLabel}>Add document as</Text>
          <View style={styles.chipRow}>
            {OPTIONS[entityType].map((o) => (
              <TouchableOpacity
                key={o.id}
                style={[styles.chip, docType === o.id && styles.chipActive]}
                onPress={() => setDocType(o.id)}
              >
                <Text style={[styles.chipText, docType === o.id && styles.chipTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color={colors.primaryNavy} />
              <Text style={styles.uploadingText}>Uploading securely…</Text>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              <Button title="Camera" icon="plus" size="sm" onPress={() => handleAdd('camera')} style={styles.btn} />
              <Button title="Gallery" variant="outline" size="sm" onPress={() => handleAdd('gallery')} style={styles.btn} />
              <Button title="PDF" variant="outline" size="sm" onPress={() => handleAdd('pdf')} style={styles.btn} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  title: { ...typography.h4, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  notice: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.goldLight,
    borderColor: colors.goldBorder,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  noticeText: { ...typography.caption, color: colors.goldDark, flex: 1 },
  emptyText: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginVertical: spacing.lg },
  errorText: { ...typography.caption, color: colors.error, textAlign: 'center', marginVertical: spacing.lg },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: 48, height: 48 },
  docLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  docMeta: { ...typography.caption, color: colors.textSecondary },
  linkBtn: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
  linkText: { ...typography.captionMedium, color: colors.accentBlue },
  sectionLabel: { ...typography.captionMedium, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  chipActive: { backgroundColor: colors.primaryNavy, borderColor: colors.primaryNavy },
  chipText: { ...typography.captionMedium, color: colors.textSecondary },
  chipTextActive: { color: colors.textInverse },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1 },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  uploadingText: { ...typography.caption, color: colors.textSecondary },
});

export default DocumentsModal;
