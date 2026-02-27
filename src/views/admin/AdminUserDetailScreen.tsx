import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import colors from '../../theme/colors';
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
}

const Field: React.FC<FieldProps> = ({
  label,
  value,
  editable = false,
  onChange,
  secureTextEntry = false,
  rightIcon,
}) => (
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

// ─── Confirmation Modal (matching design) ───
interface ConfirmModalProps {
  visible: boolean;
  message: string;
  onYes: () => void;
  onNo: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ visible, message, onYes, onNo }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.confirmOverlay}>
      <View style={styles.confirmCard}>
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

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════

const AdminUserDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<DetailRoute>();
  const { uid } = route.params;

  const {
    detail,
    loading,
    saving,
    error,
    isEditing,
    showPassword,
    setShowPassword,
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
        <ActivityIndicator size="large" color={colors.primary} />
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
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Management</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.successContainer}>
          <PurpleGhost size={90} />
          <Text style={styles.successText}>{successMessage}</Text>
          <TouchableOpacity
            style={styles.successBtn}
            activeOpacity={0.7}
            onPress={() => {
              clearSuccess();
              navigation.goBack();
            }}
          >
            <Text style={styles.successBtnText}>Go back to menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
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
        <Field
          label="Username"
          value={detail.username}
          editable={isEditing}
          onChange={(v) => updateField('username', v)}
        />
        <Field
          label="Full Name"
          value={detail.fullName}
          editable={isEditing}
          onChange={(v) => updateField('fullName', v)}
        />
        <Field
          label="Email"
          value={detail.email}
          editable={isEditing}
          onChange={(v) => updateField('email', v)}
        />
        <Field label="User ID" value={detail.userId} />
        <Field
          label="Password"
          value={detail.password}
          secureTextEntry={!showPassword}
          rightIcon={
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          }
        />

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
              <ActivityIndicator size="small" color={colors.white} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
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
    color: colors.text,
  },
  headerSpacer: { width: 32 },

  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 48,
  },

  errorText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.error,
    marginBottom: 10,
  },

  // Field
  fieldWrapper: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
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
    color: colors.text,
    backgroundColor: colors.primaryMuted,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fieldInputReadOnly: {
    backgroundColor: colors.primaryMuted,
    color: colors.text,
  },
  fieldIcon: {
    position: 'absolute',
    right: 14,
  },

  // Status
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
    color: colors.text,
  },
  statusInactive: {
    color: colors.error,
  },
  sinceText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
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
    color: colors.text,
  },
  roleValue: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
    marginLeft: 4,
  },
  roleHighlight: {
    fontFamily: fonts.semiBold,
    color: colors.success,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  actionBtn: {
    borderWidth: 1.5,
    borderColor: colors.text,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 96,
    alignItems: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionBtnDanger: {
    borderColor: colors.text,
  },
  actionBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  actionBtnTextPrimary: {
    color: colors.white,
  },
  actionBtnTextDanger: {
    color: colors.text,
  },

  // ── Success View ──
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  successText: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 30,
    marginTop: 20,
    marginBottom: 32,
  },
  successBtn: {
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  successBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
  },

  // Confirmation Modal
  confirmOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  confirmCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  confirmText: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
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
    borderTopColor: colors.divider,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnYes: {
    borderRightWidth: 0.5,
    borderRightColor: colors.divider,
  },
  confirmBtnNo: {
    borderLeftWidth: 0.5,
    borderLeftColor: colors.divider,
  },
  confirmBtnText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
});

export default AdminUserDetailScreen;
