import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useUserDetailController } from '../../controllers';
import type { AdminStackParamList } from '../../models';

type DetailRoute = RouteProp<AdminStackParamList, 'AdminUserDetail'>;

// ═══════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════

// ─── Purple Ghost Icon (matches design) ───
const PurpleGhost: React.FC<{ size?: number }> = ({ size = 80 }) => (
  <Svg width={size} height={size} viewBox="0 0 120 120">
    {/* Body */}
    <Path
      d="M30 95 C30 95 30 50 60 30 C90 50 90 95 90 95
         C85 90 80 95 75 90 C70 95 65 90 60 95
         C55 90 50 95 45 90 C40 95 35 90 30 95Z"
      fill="#9B6DD7"
    />
    {/* Head blob */}
    <Circle cx="60" cy="48" r="28" fill="#9B6DD7" />
    {/* Swirl on top */}
    <Path
      d="M52 28 C52 20 62 18 66 24 C68 28 64 30 60 28"
      stroke="#7B4DB8"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
    {/* Left eye */}
    <Circle cx="50" cy="50" r="3" fill="#FFFFFF" />
    {/* Right eye */}
    <Circle cx="70" cy="50" r="3" fill="#FFFFFF" />
    {/* Smile */}
    <Path
      d="M50 60 Q55 66 60 60 Q65 66 70 60"
      stroke="#FFFFFF"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
    />
  </Svg>
);

// ─── Read-only / Editable Field ───
interface FieldProps {
  label: string;
  value: string;
  editable?: boolean;
  onChange?: (val: string) => void;
  secureTextEntry?: boolean;
  rightIcon?: React.ReactNode;
  isWide?: boolean;
}

const Field: React.FC<FieldProps> = ({
  label,
  value,
  editable = false,
  onChange,
  secureTextEntry = false,
  rightIcon,
  isWide = false,
}) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc, isWide ? 900 : 400), [tc, isWide]);
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputRow}>
        <TextInput
          style={[styles.fieldInput, !editable && styles.fieldInputReadOnly]}
          value={value}
          onChangeText={onChange}
          editable={editable}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
        />
        {rightIcon && <View style={styles.fieldIcon}>{rightIcon}</View>}
      </View>
    </View>
  );
};

// ─── Confirmation Modal (matching design) ───
interface ConfirmModalProps {
  visible: boolean;
  message: string;
  onYes: () => void;
  onNo: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ visible, message, onYes, onNo }) => {
  const { colors: tc } = useAppTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width >= 600;
  const styles = useMemo(() => createStyles(tc, width), [tc, width]);
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.confirmOverlay, isWeb && styles.confirmOverlayWeb]}>
        <View style={[styles.confirmCard, isWeb && styles.confirmCardWeb]}>
          <Text style={styles.confirmText}>{message}</Text>
          <Text style={styles.confirmEmoji}>😖</Text>
          <View style={styles.confirmBtnRow}>
            <TouchableOpacity
              style={[styles.confirmBtn, styles.confirmBtnYes]}
              onPress={onYes}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmBtnText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, styles.confirmBtnNo]}
              onPress={onNo}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmBtnText}>No</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════

const AdminUserDetailScreen: React.FC = () => {
  const { colors: tc } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWide = isWeb && width >= 600;
  const styles = useMemo(() => createStyles(tc, width), [tc, width]);
  const navigation = useNavigation();
  const route = useRoute<DetailRoute>();
  const { uid } = route.params;

  const {
    detail,
    loading,
    saving,
    error,
    isEditing,
    toggleEdit,
    updateField,
    saveEdits,
    resetPassword,
    toggleAccountStatus,
    successMessage,
    clearSuccess,
  } = useUserDetailController(uid);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<() => void>(() => () => {});

  const showConfirm = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setConfirmVisible(true);
  };

  const handleReset = () => {
    showConfirm(
      'Are you sure you want to reset the password for this account?',
      () => {
        resetPassword();
        setConfirmVisible(false);
      },
    );
  };

  const handleDeactivate = () => {
    const action = detail.status === 'active' ? 'deactivate' : 'reactivate';
    showConfirm(
      `Are you sure you want to ${action} this account?`,
      () => {
        toggleAccountStatus();
        setConfirmVisible(false);
      },
    );
  };

  const handleEditPress = () => {
    if (isEditing) {
      saveEdits();
    } else {
      toggleEdit();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tc.accent} />
      </View>
    );
  }

  const isActive = detail.status === 'active';
  const roleLabel =
    detail.role === 'admin'
      ? 'Admin'
      : detail.role === 'content_author'
        ? 'Content Author'
        : 'Standard User';

  // ── Success View ──
  if (successMessage) {
    return (
      <View style={styles.container}>
        {/* ── Header (mobile) ── */}
        {!isWide && (
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity onPress={() => { if (navigation.canGoBack()) navigation.goBack(); }} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={tc.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>User Management</Text>
            <View style={styles.headerSpacer} />
          </View>
        )}

        <View style={[styles.successContainer, isWide && styles.successContainerWeb]}>
          {isWide && (
            <View style={styles.successCard}>
              <PurpleGhost size={90} />
              <Text style={styles.successText}>{successMessage}</Text>
              <TouchableOpacity
                style={styles.successBtn}
                activeOpacity={0.7}
                onPress={() => {
                  clearSuccess();
                  if (navigation.canGoBack()) navigation.goBack();
                }}
              >
                <Text style={styles.successBtnText}>Go back to menu</Text>
              </TouchableOpacity>
            </View>
          )}
          {!isWide && (
            <>
              <PurpleGhost size={90} />
              <Text style={styles.successText}>{successMessage}</Text>
              <TouchableOpacity
                style={styles.successBtn}
                activeOpacity={0.7}
                onPress={() => {
                  clearSuccess();
                  if (navigation.canGoBack()) navigation.goBack();
                }}
              >
                <Text style={styles.successBtnText}>Go back to menu</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  // ── Web: two col layout ──
  if (isWide) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.webScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Breadcrumb / Back */}
          <View style={styles.webBreadcrumb}>
            <TouchableOpacity
              onPress={() => { if (navigation.canGoBack()) navigation.goBack(); }}
              style={styles.webBackBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={tc.accent} />
              <Text style={styles.webBackText}>Back to Users</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.webPageTitle}>User Details</Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.webTwoCols}>
            {/* Left: User Info Card */}
            <View style={styles.webInfoCard}>
              <View style={styles.webCardHeader}>
                <View style={styles.webUserAvatar}>
                  <Text style={styles.webAvatarText}>
                    {detail.fullName.split(' ').map(n => n[0] || '').join('').toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.webUserName}>{detail.fullName}</Text>
                  <Text style={styles.webUserEmail}>{detail.email}</Text>
                </View>
                <View style={[styles.webStatusPill, isActive ? styles.webStatusActive : styles.webStatusInactive]}>
                  <View style={[styles.webStatusDot, { backgroundColor: isActive ? tc.success : tc.error }]} />
                  <Text style={[styles.webStatusText, { color: isActive ? tc.success : tc.error }]}>
                    {isActive ? 'Active' : 'Deactivated'}
                  </Text>
                </View>
              </View>

              <View style={styles.webFieldsGrid}>
                <Field label="Username" value={detail.username} editable={isEditing} onChange={(v) => updateField('username', v)} isWide />
                <Field label="Full Name" value={detail.fullName} editable={isEditing} onChange={(v) => updateField('fullName', v)} isWide />
                <Field label="Email" value={detail.email} editable={isEditing} onChange={(v) => updateField('email', v)} isWide />
                <Field label="User ID" value={detail.userId} isWide />
                <Field label="Auth Provider" value={detail.authProvider === 'google' ? 'Google' : detail.authProvider === 'apple' ? 'Apple' : 'Email'} isWide />
                <Field label="Email Verified" value={detail.emailVerified ? 'Yes' : 'No'} isWide />
                <Field label="2FA" value={detail.twoFactorEnabled ? `Enabled (${detail.twoFactorMethod})` : 'Disabled'} isWide />
                <Field label="Last Login" value={detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleString() : 'Never'} isWide />
              </View>
            </View>

            {/* Right: Status & Actions Card */}
            <View style={styles.webActionsCard}>
              <Text style={styles.webCardTitle}>Account Status</Text>

              <View style={styles.webStatusSection}>
                <View style={styles.webStatusMetaRow}>
                  <Text style={styles.webMetaLabel}>Status</Text>
                  <Text style={[styles.webMetaValue, { color: isActive ? tc.success : tc.error }]}>
                    {isActive ? 'Active' : 'Deactivated'}
                  </Text>
                </View>
                <View style={styles.webStatusMetaRow}>
                  <Text style={styles.webMetaLabel}>Active Since</Text>
                  <Text style={styles.webMetaValue}>{detail.activeSince || '—'}</Text>
                </View>
                <View style={styles.webStatusMetaRow}>
                  <Text style={styles.webMetaLabel}>Role</Text>
                  <Text style={styles.webMetaValue}>{roleLabel}</Text>
                </View>
                <View style={styles.webStatusMetaRow}>
                  <Text style={styles.webMetaLabel}>Auth Provider</Text>
                  <Text style={styles.webMetaValue}>
                    {detail.authProvider === 'google' ? 'Google' : detail.authProvider === 'apple' ? 'Apple' : 'Email'}
                  </Text>
                </View>
                <View style={styles.webStatusMetaRow}>
                  <Text style={styles.webMetaLabel}>Email Verified</Text>
                  <Text style={[styles.webMetaValue, { color: detail.emailVerified ? tc.success : tc.warning }]}>
                    {detail.emailVerified ? 'Yes' : 'No'}
                  </Text>
                </View>
                <View style={styles.webStatusMetaRow}>
                  <Text style={styles.webMetaLabel}>2FA</Text>
                  <Text style={styles.webMetaValue}>
                    {detail.twoFactorEnabled ? `Enabled (${detail.twoFactorMethod})` : 'Disabled'}
                  </Text>
                </View>
                <View style={styles.webStatusMetaRow}>
                  <Text style={styles.webMetaLabel}>Last Login</Text>
                  <Text style={styles.webMetaValue}>
                    {detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleString() : 'Never'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.webCardTitle, { marginTop: 24 }]}>Actions</Text>

              <View style={styles.webActionsGrid}>
                <TouchableOpacity
                  style={[styles.webActionBtn, isEditing && styles.webActionBtnPrimary]}
                  onPress={handleEditPress}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  {saving && isEditing ? (
                    <ActivityIndicator size="small" color={tc.white} />
                  ) : (
                    <>
                      <Ionicons
                        name={isEditing ? 'checkmark-circle-outline' : 'create-outline'}
                        size={18}
                        color={isEditing ? tc.white : tc.accent}
                      />
                      <Text style={[styles.webActionBtnText, isEditing && { color: tc.white }]}>
                        {isEditing ? 'Save Changes' : 'Edit User'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.webActionBtn}
                  onPress={handleReset}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <Ionicons name="key-outline" size={18} color={tc.warning} />
                  <Text style={styles.webActionBtnText}>Reset Password</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.webActionBtn, styles.webActionBtnDanger]}
                  onPress={handleDeactivate}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isActive ? 'close-circle-outline' : 'checkmark-circle-outline'}
                    size={18}
                    color={tc.error}
                  />
                  <Text style={[styles.webActionBtnText, { color: tc.error }]}>
                    {isActive ? 'Deactivate Account' : 'Activate Account'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        <ConfirmModal
          visible={confirmVisible}
          message={confirmMessage}
          onYes={confirmAction}
          onNo={() => setConfirmVisible(false)}
        />
      </View>
    );
  }

  // ── Mobile layout ──
  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => { if (navigation.canGoBack()) navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={tc.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* ── Fields ── */}
        <Field label="Username" value={detail.username} editable={isEditing} onChange={(v) => updateField('username', v)} />
        <Field label="Full Name" value={detail.fullName} editable={isEditing} onChange={(v) => updateField('fullName', v)} />
        <Field label="Email" value={detail.email} editable={isEditing} onChange={(v) => updateField('email', v)} />
        <Field label="User ID" value={detail.userId} />
        <Field label="Auth Provider" value={detail.authProvider === 'google' ? 'Google' : detail.authProvider === 'apple' ? 'Apple' : 'Email'} />
        <Field label="Email Verified" value={detail.emailVerified ? 'Yes' : 'No'} />
        <Field label="2FA" value={detail.twoFactorEnabled ? `Enabled (${detail.twoFactorMethod})` : 'Disabled'} />
        <Field label="Last Login" value={detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleString() : 'Never'} />

        {/* ── Status & Role ── */}
        <View style={styles.statusSection}>
          <View style={styles.statusRow}>
            <Text style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
              {isActive ? '****ACTIVE***ACCOUNT' : '**DEACTIVATED**ACCOUNT'}
            </Text>
            <Text style={styles.sinceText}>{detail.activeSince}</Text>
          </View>
          <View style={styles.roleRow}>
            <Text style={styles.roleLabel}>Role</Text>
            <Text style={styles.roleValue}>
              {detail.role === 'admin' ? 'Admin' : (
                <>
                  Admin/
                  <Text style={styles.roleHighlight}>{roleLabel}</Text>
                </>
              )}
            </Text>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleReset}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, isEditing && styles.actionBtnPrimary]}
            onPress={handleEditPress}
            disabled={saving}
            activeOpacity={0.7}
          >
            {saving && isEditing ? (
              <ActivityIndicator size="small" color={tc.white} />
            ) : (
              <Text style={[styles.actionBtnText, isEditing && styles.actionBtnTextPrimary]}>
                {isEditing ? 'Save' : 'Edit'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={handleDeactivate}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>
              {isActive ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Confirmation Modal ── */}
      <ConfirmModal
        visible={confirmVisible}
        message={confirmMessage}
        onYes={confirmAction}
        onNo={() => setConfirmVisible(false)}
      />
    </View>
  );
};

// ═══════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════

const createStyles = (tc: ThemeColors, screenWidth: number) => {
  const isWide = Platform.OS === 'web' && screenWidth >= 600;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isWide ? '#F5F6FA' : tc.background,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: isWide ? '#F5F6FA' : tc.background,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // ── Header (mobile) ──
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 10,
    },
    backBtn: { padding: 4 },
    headerTitle: {
      fontFamily: fonts.bold,
      fontSize: 20,
      color: tc.text,
    },
    headerSpacer: { width: 32 },

    // ── Mobile scroll ──
    scrollContent: {
      paddingHorizontal: 28,
      paddingTop: 16,
      paddingBottom: 48,
    },

    errorText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: tc.error,
      marginBottom: 10,
    },

    // ── Field ──
    fieldWrapper: {
      marginBottom: 14,
    },
    fieldLabel: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: tc.text,
      marginBottom: 6,
    },
    fieldInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    fieldInput: {
      flex: 1,
      fontFamily: fonts.regular,
      fontSize: 15,
      color: tc.text,
      backgroundColor: tc.accentMuted,
      borderRadius: isWide ? 10 : 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: 'transparent',
      ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
    },
    fieldInputReadOnly: {
      backgroundColor: tc.accentMuted,
      color: tc.text,
    },
    fieldIcon: {
      position: 'absolute',
      right: 14,
    },

    // ── Status (mobile) ──
    statusSection: {
      marginTop: 8,
      marginBottom: 24,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 4,
    },
    statusBadge: {
      fontFamily: fonts.bold,
      fontSize: 12,
    },
    statusActive: {
      color: tc.text,
    },
    statusInactive: {
      color: tc.error,
    },
    sinceText: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: tc.textMuted,
    },
    roleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 0,
      marginTop: 2,
    },
    roleLabel: {
      fontFamily: fonts.bold,
      fontSize: 13,
      color: tc.text,
    },
    roleValue: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: tc.text,
      marginLeft: 4,
    },
    roleHighlight: {
      fontFamily: fonts.semiBold,
      color: tc.success,
    },

    // ── Actions (mobile) ──
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 14,
    },
    actionBtn: {
      borderWidth: 1.5,
      borderColor: tc.text,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 24,
      minWidth: 96,
      alignItems: 'center',
    },
    actionBtnPrimary: {
      backgroundColor: tc.accent,
      borderColor: tc.accent,
    },
    actionBtnDanger: {
      borderColor: tc.text,
    },
    actionBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: tc.text,
    },
    actionBtnTextPrimary: {
      color: tc.white,
    },
    actionBtnTextDanger: {
      color: tc.text,
    },

    // ── Success View ──
    successContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 60,
      paddingHorizontal: 40,
    },
    successContainerWeb: {
      justifyContent: 'center',
      paddingTop: 0,
    },
    successCard: {
      backgroundColor: tc.white,
      borderRadius: 20,
      padding: 48,
      alignItems: 'center',
      maxWidth: 480,
      width: '100%',
      ...(Platform.OS === 'web'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
          }
        : {}),
    },
    successText: {
      fontFamily: fonts.bold,
      fontSize: 22,
      color: tc.text,
      textAlign: 'center',
      lineHeight: 30,
      marginTop: 20,
      marginBottom: 32,
    },
    successBtn: {
      borderWidth: 1.5,
      borderColor: tc.accentLight,
      borderRadius: 24,
      paddingVertical: 12,
      paddingHorizontal: 32,
    },
    successBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      color: tc.text,
    },

    // ── Confirmation Modal ──
    confirmOverlay: {
      flex: 1,
      backgroundColor: tc.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    confirmOverlayWeb: {
      paddingHorizontal: 0,
    },
    confirmCard: {
      backgroundColor: tc.white,
      borderRadius: 18,
      paddingVertical: 28,
      paddingHorizontal: 24,
      alignItems: 'center',
      width: '100%',
      maxWidth: 320,
    },
    confirmCardWeb: {
      maxWidth: 400,
      ...(Platform.OS === 'web'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
          }
        : {}),
    },
    confirmText: {
      fontFamily: fonts.bold,
      fontSize: 20,
      color: tc.text,
      textAlign: 'center',
      lineHeight: 28,
      marginBottom: 12,
    },
    confirmEmoji: {
      fontSize: 40,
      marginBottom: 16,
    },
    confirmBtnRow: {
      flexDirection: 'row',
      width: '100%',
      borderTopWidth: 1,
      borderTopColor: tc.divider,
    },
    confirmBtn: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
    },
    confirmBtnYes: {
      borderRightWidth: 0.5,
      borderRightColor: tc.divider,
    },
    confirmBtnNo: {
      borderLeftWidth: 0.5,
      borderLeftColor: tc.divider,
    },
    confirmBtnText: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: tc.text,
    },

    // ═══════════════════════════════════════════
    //  WEB-SPECIFIC STYLES
    // ═══════════════════════════════════════════

    webScrollContent: {
      paddingHorizontal: 32,
      paddingTop: 24,
      paddingBottom: 48,
      maxWidth: 1200,
      alignSelf: 'center' as const,
      width: '100%' as unknown as number,
    },
    webBreadcrumb: {
      marginBottom: 8,
    },
    webBackBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    webBackText: {
      fontFamily: fonts.medium,
      fontSize: 14,
      color: tc.accent,
    },
    webPageTitle: {
      fontFamily: fonts.bold,
      fontSize: 28,
      color: tc.text,
      marginBottom: 20,
    },
    webTwoCols: {
      flexDirection: 'row',
      gap: 24,
    },

    // Left card: User Info
    webInfoCard: {
      flex: 2,
      backgroundColor: tc.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: tc.cardBorder,
      padding: 28,
      ...(Platform.OS === 'web'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
          }
        : {}),
    },
    webCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 24,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: tc.divider,
    },
    webUserAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: tc.accentMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    webAvatarText: {
      fontFamily: fonts.bold,
      fontSize: 20,
      color: tc.accent,
    },
    webUserName: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: tc.text,
    },
    webUserEmail: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: tc.textLight,
      marginTop: 2,
    },
    webStatusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 20,
    },
    webStatusActive: {
      backgroundColor: tc.successBg,
    },
    webStatusInactive: {
      backgroundColor: tc.errorBg,
    },
    webStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    webStatusText: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
    },
    webFieldsGrid: {
      gap: 12,
    },

    // Right card: Status & Actions
    webActionsCard: {
      flex: 1,
      backgroundColor: tc.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: tc.cardBorder,
      padding: 28,
      alignSelf: 'flex-start',
      ...(Platform.OS === 'web'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
          }
        : {}),
    },
    webCardTitle: {
      fontFamily: fonts.bold,
      fontSize: 16,
      color: tc.text,
      marginBottom: 16,
    },
    webStatusSection: {
      gap: 12,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: tc.divider,
    },
    webStatusMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    webMetaLabel: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: tc.textLight,
    },
    webMetaValue: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: tc.text,
    },
    webActionsGrid: {
      gap: 10,
    },
    webActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: tc.cardBorder,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: tc.white,
    },
    webActionBtnPrimary: {
      backgroundColor: tc.accent,
      borderColor: tc.accent,
    },
    webActionBtnDanger: {
      borderColor: tc.errorBg,
    },
    webActionBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: tc.text,
    },
  });
};

export default AdminUserDetailScreen;
