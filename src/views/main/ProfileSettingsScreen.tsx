import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import colors from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { useProfileSettingsController, LEARNING_GOALS, COUNTRIES, TIME_ZONES } from '../../controllers';
import PickerModal from '../../components/PickerModal';
import type { SettingsStackParamList } from '../../models';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// ------- Subcomponents -------

interface AccountRowProps {
  label: string;
  value: string;
  editable?: boolean;
  onEdit?: () => void;
  navigable?: boolean;
  onNavigate?: () => void;
  secureText?: boolean;
}

const AccountRow: React.FC<AccountRowProps> = ({
  label,
  value,
  editable,
  onEdit,
  navigable,
  onNavigate,
  secureText,
}) => (
  <TouchableOpacity
    style={styles.accountRow}
    activeOpacity={editable || navigable ? 0.6 : 1}
    onPress={navigable ? onNavigate : editable ? onEdit : undefined}
    disabled={!editable && !navigable}
  >
    <Text style={styles.accountRowLabel}>{label}</Text>
    <View style={styles.accountRowRight}>
      <Text style={styles.accountRowValue}>
        {secureText ? '••••••••' : value}
      </Text>
      {editable && (
        <Feather name="edit-2" size={16} color={colors.textLight} style={{ marginLeft: 6 }} />
      )}
      {navigable && (
        <Ionicons name="chevron-forward" size={18} color={colors.textLight} style={{ marginLeft: 4 }} />
      )}
    </View>
  </TouchableOpacity>
);

// Inline import to avoid extra top-level import
import { Feather } from '@expo/vector-icons';

interface RadioCircleProps {
  selected: boolean;
}

const RadioCircle: React.FC<RadioCircleProps> = ({ selected }) => (
  <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
    {selected && <View style={styles.radioInner} />}
  </View>
);

type Props = NativeStackScreenProps<SettingsStackParamList, 'ProfileSettings'>;

// ------- Main Screen -------
const ProfileSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const {
    profile,
    isLoading,
    error,
    editingField,
    fieldValue,
    setFieldValue,
    currentPassword,
    setCurrentPassword,
    pickerModal,
    handleSaveUsername,
    handleSavePassword,
    handleCountrySelect,
    handleTimeZoneSelect,
    toggleLearningGoal,
    handlePrivacyPress,
    startEditUsername,
    startEditPassword,
    closeEditing,
    openCountryPicker,
    openTimeZonePicker,
    closePickerModal,
  } = useProfileSettingsController();

  // ------- Goal icon renderer -------
  const renderGoalIcon = (goal: typeof LEARNING_GOALS[number]) => {
    const size = 20;
    const color = colors.primary;
    if (goal.iconSet === 'ionicons')
      return <Ionicons name={goal.icon as any} size={size} color={color} />;
    if (goal.iconSet === 'fa5')
      return <FontAwesome5 name={goal.icon as any} size={size} color={color} />;
    return <MaterialCommunityIcons name={goal.icon as any} size={size} color={color} />;
  };

  // ------- Loading state -------
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ------- Error state -------
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorBackBtn}>
            <Text style={styles.errorBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Profile Settings</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={
              profile.profilePictureUrl
                ? { uri: profile.profilePictureUrl }
                : require('../../../assets/icon.png')
            }
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.username || 'User'}</Text>
            <Text style={styles.profileEmail}>{profile.email}</Text>
            <TouchableOpacity
              style={styles.editProfileBtn}
              activeOpacity={0.7}
              onPress={startEditUsername}
            >
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Details */}
        <Text style={styles.sectionTitle}>Account Details</Text>
        <View style={styles.card}>
          <AccountRow
            label="Username"
            value={profile.username}
            editable
            onEdit={startEditUsername}
          />
          <View style={styles.divider} />
          <AccountRow
            label="Password"
            value=""
            secureText
            editable
            onEdit={startEditPassword}
          />
          <View style={styles.divider} />
          <AccountRow
            label="Country"
            value={profile.country}
            navigable
            onNavigate={openCountryPicker}
          />
          <View style={styles.divider} />
          <AccountRow
            label="Time Zone"
            value={profile.timeZone}
            navigable
            onNavigate={openTimeZonePicker}
          />
        </View>

        {/* Learning Goals */}
        <Text style={styles.sectionTitle}>Learning Goals</Text>
        <View style={styles.card}>
          {LEARNING_GOALS.map((goal, idx) => {
            const selected = profile.learningGoals.includes(goal.label);
            return (
              <React.Fragment key={goal.label}>
                {idx > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.goalRow}
                  activeOpacity={0.7}
                  onPress={() => toggleLearningGoal(goal.label)}
                >
                  <View style={styles.goalLeft}>
                    {renderGoalIcon(goal)}
                    <Text style={styles.goalLabel}>{goal.label}</Text>
                  </View>
                  <RadioCircle selected={selected} />
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        {/* Privacy & Security */}
        <Text style={styles.sectionTitle}>Privacy & Security</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.privacyRow}
            activeOpacity={0.7}
            onPress={() => handlePrivacyPress('Login Devices')}
          >
            <Text style={styles.privacyLabel}>Login Devices</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.privacyRow}
            activeOpacity={0.7}
            onPress={() => handlePrivacyPress('Two-Factor Authentication')}
          >
            <Text style={styles.privacyLabel}>Two-Factor Authentication</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit field modal */}
      <Modal
        visible={editingField !== null}
        transparent
        animationType="slide"
        onRequestClose={closeEditing}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingField === 'username' ? 'Edit Username' : 'Change Password'}
              </Text>
              <TouchableOpacity onPress={closeEditing}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {editingField === 'password' && (
              <TextInput
                style={styles.modalInput}
                placeholder="Current password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
            )}

            <TextInput
              style={styles.modalInput}
              placeholder={editingField === 'username' ? 'Enter new username' : 'Enter new password'}
              placeholderTextColor={colors.textMuted}
              secureTextEntry={editingField === 'password'}
              value={fieldValue}
              onChangeText={setFieldValue}
              autoFocus
            />

            <TouchableOpacity
              style={styles.modalSaveBtn}
              activeOpacity={0.7}
              onPress={editingField === 'username' ? handleSaveUsername : handleSavePassword}
            >
              <Text style={styles.modalSaveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Country / TimeZone picker */}
      <PickerModal
        visible={pickerModal.visible}
        title={pickerModal.type === 'country' ? 'Select Country' : 'Select Time Zone'}
        options={pickerModal.type === 'country' ? COUNTRIES : TIME_ZONES}
        selected={pickerModal.type === 'country' ? profile.country : profile.timeZone}
        onSelect={pickerModal.type === 'country' ? handleCountrySelect : handleTimeZoneSelect}
        onClose={closePickerModal}
      />
    </SafeAreaView>
  );
};

// ------- Styles -------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.text,
    fontStyle: 'italic',
  },
  // Profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.avatarBg,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
  },
  profileEmail: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 8,
  },
  editProfileBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: colors.text,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  editProfileBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
  },
  // Sections
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.inputBorder,
  },
  // Account rows
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  accountRowLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  accountRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountRowValue: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textLight,
  },
  // Learning Goals
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  goalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goalLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.text,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.text,
  },
  // Privacy
  privacyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  privacyLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.inputBg,
    marginBottom: 12,
  },
  modalSaveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  modalSaveBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.white,
  },
  // Loading & error states
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textLight,
    marginTop: 12,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  errorBackBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  errorBackBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.white,
  },
});

export default ProfileSettingsScreen;
