/**
 * ResortOS - Hotel Management Screen (Admin Only)
 * View, create, edit, activate and deactivate hotels.
 * Initially manages: 1. THE VILLA | 2. NAVKAR PALACE & RESORT
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import { useNavigation } from '../hooks/useNavigation';
import { useHotel } from '../hooks/useHotel';
import { Header } from '../components/common/Header';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Icon } from '../components/common/Icon';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { HotelSummary } from '../types/hotel';
import { apiClient } from '../services/apiClient';

export const HotelsManagementScreen: React.FC = () => {
  const { navigate, goBack } = useNavigation();
  const { hotels, switchHotel, selectedHotelId, refresh } = useHotel();

  const [hotelList, setHotelList] = useState<HotelSummary[]>(hotels);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHotel, setEditingHotel] = useState<HotelSummary | null>(null);

  const fetchHotels = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiClient.getHotels();
      setHotelList(data);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load hotels from database');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Rajasthan');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [checkInTime, setCheckInTime] = useState('12:00 PM');
  const [checkOutTime, setCheckOutTime] = useState('11:00 AM');
  const [totalRooms, setTotalRooms] = useState('20');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const openAddModal = () => {
    setEditingHotel(null);
    setName('');
    setCode('');
    setAddress('');
    setCity('');
    setState('Rajasthan');
    setContactPhone('+91 ');
    setContactEmail('');
    setCheckInTime('12:00 PM');
    setCheckOutTime('11:00 AM');
    setTotalRooms('20');
    setStatus('active');
    setModalVisible(true);
  };

  const openEditModal = (hotel: HotelSummary) => {
    setEditingHotel(hotel);
    setName(hotel.name);
    setCode(hotel.code);
    setAddress(hotel.address || hotel.location);
    setCity(hotel.city || 'Jaipur');
    setState(hotel.state || 'Rajasthan');
    setContactPhone(hotel.contactPhone);
    setContactEmail(hotel.contactEmail || '');
    setCheckInTime(hotel.checkInTime || '12:00 PM');
    setCheckOutTime(hotel.checkOutTime || '11:00 AM');
    setTotalRooms(hotel.totalRooms.toString());
    setStatus(hotel.status || 'active');
    setModalVisible(true);
  };

  const handleSaveHotel = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter hotel name');
      return;
    }

    try {
      if (editingHotel) {
        await apiClient.updateHotel(editingHotel.id, {
          name,
          code: code || editingHotel.code,
          address,
          city,
          state,
          contactPhone,
          contactEmail,
          checkInTime,
          checkOutTime,
          totalRooms: parseInt(totalRooms, 10) || editingHotel.totalRooms,
          status,
        });
        Alert.alert('Success', 'Hotel details updated in database');
      } else {
        await apiClient.createHotel({
          name,
          code: code || `HTL-0${hotelList.length + 1}`,
          address,
          city,
          state,
          contactPhone,
          contactEmail,
          checkInTime,
          checkOutTime,
          totalRooms: parseInt(totalRooms, 10) || 20,
          status,
        });
        Alert.alert('Success', 'New hotel created in database');
      }
      setModalVisible(false);
      await fetchHotels();
      await refresh();
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Failed to persist hotel records');
    }
  };

  const toggleHotelStatus = async (hotel: HotelSummary) => {
    const nextStatus = hotel.status === 'active' ? 'inactive' : 'active';
    try {
      await apiClient.updateHotel(hotel.id, { status: nextStatus });
      await fetchHotels();
      await refresh();
    } catch (err: any) {
      Alert.alert('Status Error', err.message || 'Failed to toggle hotel status');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Hotel Management"
        subtitle="Admin Hotel Directory & Configuration"
        showBack
        onBack={goBack}
        rightAction={
          <Button
            title="+ Add Hotel"
            size="sm"
            variant="primary"
            onPress={openAddModal}
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Icon name="info" size={18} color={colors.accentBlue} style={styles.bannerIcon} />
          <Text style={styles.bannerText}>
            Each hotel maintains strict data separation. Managers access only their assigned property.
          </Text>
        </View>

        {/* Hotels Count */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Managed Properties ({hotelList.length})</Text>
          <Text style={styles.sectionSub}>All operational hotels owned by Admin</Text>
        </View>

        {/* Hotel Cards List */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primaryNavy} />
            <Text style={styles.loadingText}>Loading properties from database...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.errorBox}>
            <Icon name="alert-circle" size={32} color={colors.error} />
            <Text style={styles.errorText}>{loadError}</Text>
            <Button title="Retry" size="sm" variant="outline" onPress={fetchHotels} style={{ marginTop: 8 }} />
          </View>
        ) : hotelList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No hotel properties found in database.</Text>
          </View>
        ) : (
          hotelList.map((hotel) => {
            const isActive = hotel.status !== 'inactive';
            const isSelected = selectedHotelId === hotel.id;

            return (
              <Card key={hotel.id} padding="lg" variant="elevated" style={styles.hotelCard}>
                <View style={styles.hotelHeader}>
                  <View style={styles.hotelIdentity}>
                    <View style={styles.hotelAvatar}>
                      <Icon name="hotel" size={24} color={colors.primaryNavy} />
                    </View>
                    <View style={styles.hotelTitleBlock}>
                      <Text style={styles.hotelName}>{hotel.name}</Text>
                      <Text style={styles.hotelCode}>Code: {hotel.code}</Text>
                    </View>
                  </View>

                  <View style={styles.badgeRow}>
                    {isSelected && (
                      <Badge label="ACTIVE VIEW" variant="primary" size="sm" style={styles.badgeMargin} />
                    )}
                    <Badge
                      label={isActive ? 'ACTIVE' : 'INACTIVE'}
                      variant={isActive ? 'success' : 'error'}
                      size="sm"
                    />
                  </View>
                </View>

                {/* Hotel Details Grid */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Icon name="map-pin" size={14} color={colors.textSecondary} />
                    <Text style={styles.detailText} numberOfLines={2}>
                      {hotel.address || hotel.location}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Icon name="phone" size={14} color={colors.textSecondary} />
                    <Text style={styles.detailText}>{hotel.contactPhone}</Text>
                  </View>

                  <View style={styles.rowSpecs}>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>Total Rooms</Text>
                      <Text style={styles.specValue}>{hotel.totalRooms}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>Check-In</Text>
                      <Text style={styles.specValue}>{hotel.checkInTime || '12:00 PM'}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>Check-Out</Text>
                      <Text style={styles.specValue}>{hotel.checkOutTime || '11:00 AM'}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>Currency</Text>
                      <Text style={styles.specValue}>INR (₹)</Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => openEditModal(hotel)}
                  >
                    <Icon name="edit" size={14} color={colors.primaryNavy} />
                    <Text style={styles.editBtnText}>Edit Hotel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.switchBtn]}
                    onPress={() => {
                      switchHotel(hotel.id);
                      navigate('admin-dashboard');
                    }}
                  >
                    <Icon name="eye" size={14} color="#047857" />
                    <Text style={styles.switchBtnText}>Open Dashboard</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      isActive ? styles.deactivateBtn : styles.activateBtn,
                    ]}
                    onPress={() => toggleHotelStatus(hotel)}
                  >
                    <Text
                      style={isActive ? styles.deactivateText : styles.activateText}
                    >
                      {isActive ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit Hotel Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingHotel ? 'Edit Hotel Details' : 'Add New Hotel'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="x" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Input
                label="Hotel Name *"
                placeholder="e.g. THE VILLA"
                value={name}
                onChangeText={setName}
              />
              <Input
                label="Hotel Code"
                placeholder="e.g. TV-01"
                value={code}
                onChangeText={setCode}
              />
              <Input
                label="Address / Street *"
                placeholder="e.g. Civil Lines, Near Circuit House"
                value={address}
                onChangeText={setAddress}
              />
              <View style={styles.halfRow}>
                <Input
                  label="City"
                  placeholder="Jaipur"
                  value={city}
                  onChangeText={setCity}
                  containerStyle={styles.halfInput}
                />
                <Input
                  label="State"
                  placeholder="Rajasthan"
                  value={state}
                  onChangeText={setState}
                  containerStyle={styles.halfInput}
                />
              </View>
              <Input
                label="Contact Phone Number *"
                placeholder="+91 98290 55110"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />
              <Input
                label="Contact Email"
                placeholder="hotel@resortos.com"
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
              />
              <View style={styles.halfRow}>
                <Input
                  label="Check-In Time"
                  placeholder="12:00 PM"
                  value={checkInTime}
                  onChangeText={setCheckInTime}
                  containerStyle={styles.halfInput}
                />
                <Input
                  label="Check-Out Time"
                  placeholder="11:00 AM"
                  value={checkOutTime}
                  onChangeText={setCheckOutTime}
                  containerStyle={styles.halfInput}
                />
              </View>
              <Input
                label="Total Rooms *"
                placeholder="20"
                value={totalRooms}
                onChangeText={setTotalRooms}
                keyboardType="numeric"
              />

              <View style={styles.statusToggleRow}>
                <Text style={styles.statusToggleLabel}>Hotel Status</Text>
                <View style={styles.toggleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      status === 'active' && styles.toggleBtnActive,
                    ]}
                    onPress={() => setStatus('active')}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        status === 'active' && styles.toggleTextActive,
                      ]}
                    >
                      Active
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      status === 'inactive' && styles.toggleBtnInactive,
                    ]}
                    onPress={() => setStatus('inactive')}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        status === 'inactive' && styles.toggleTextActive,
                      ]}
                    >
                      Inactive
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Button
                title={editingHotel ? 'Save Changes' : 'Create Hotel'}
                onPress={handleSaveHotel}
                variant="primary"
                size="lg"
                style={styles.modalSaveBtn}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentBlueLight,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerIcon: {
    marginRight: spacing.sm,
  },
  bannerText: {
    ...typography.captionMedium,
    color: colors.accentBlue,
    flex: 1,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  sectionSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  hotelCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  hotelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  hotelIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hotelAvatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  hotelTitleBlock: {
    flex: 1,
  },
  hotelName: {
    ...typography.subtitle1,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  hotelCode: {
    ...typography.caption,
    color: colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeMargin: {
    marginRight: spacing.xs,
  },
  detailsGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  detailText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  rowSpecs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  specBox: {
    alignItems: 'center',
  },
  specLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  specValue: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  editBtn: {
    backgroundColor: colors.primaryTint,
  },
  editBtnText: {
    ...typography.captionMedium,
    color: colors.primaryNavy,
    marginLeft: 4,
  },
  switchBtn: {
    backgroundColor: '#ECFDF5',
  },
  switchBtnText: {
    ...typography.captionMedium,
    color: '#047857',
    marginLeft: 4,
  },
  deactivateBtn: {
    backgroundColor: '#FEF2F2',
  },
  deactivateText: {
    ...typography.captionMedium,
    color: colors.error,
  },
  activateBtn: {
    backgroundColor: '#F0FDF4',
  },
  activateText: {
    ...typography.captionMedium,
    color: colors.success,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: spacing.sm,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modalScroll: {
    maxHeight: 500,
  },
  halfRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  statusToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusToggleLabel: {
    ...typography.subtitle2,
    color: colors.textPrimary,
  },
  toggleButtons: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: borderRadius.sm,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  toggleBtnActive: {
    backgroundColor: '#059669',
  },
  toggleBtnInactive: {
    backgroundColor: colors.error,
  },
  toggleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  modalSaveBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  centerBox: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  errorBox: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginVertical: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  emptyBox: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

export default HotelsManagementScreen;
