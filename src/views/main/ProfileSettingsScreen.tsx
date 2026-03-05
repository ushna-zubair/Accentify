import React, { useMemo } from 'react';
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
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import { useProfileSettingsController, LEARNING_GOALS, COUNTRIES, TIME_ZONES } from '../../controllers';
import PickerModal from '../../components/PickerModal';
import type { SettingsStackParamList } from '../../models';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

const isWeb = Platform.OS === 'web';

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
}) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc, 400), [tc]);
  return (
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
        <Feather name="edit-2" size={16} color={tc.textLight} style={{ marginLeft: 6 }} />
      )}
      {navigable && (
        <Ionicons name="chevron-forward" size={18} color={tc.textLight} style={{ marginLeft: 4 }} />
      )}
    </View>
  </TouchableOpacity>
  );
};

interface RadioCircleProps {
  selected: boolean;
}

const RadioCircle: React.FC<RadioCircleProps> = ({ selected }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc, 400), [tc]);
  return (
  <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
    {selected && <View style={styles.radioInner} />}
  </View>
  );
};

type Props = NativeStackScreenProps<SettingsStackParamList, 'ProfileSettings'>;

// ------- Main Screen -------
const ProfileSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors: tc, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const isWide = isWeb && width >= 700;
  const styles = useMemo(() => createStyles(tc, width), [tc, width]);
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
    photoUploading,
    handleSaveUsername,
    handleSavePassword,
    handleCountrySelect,
    handleTimeZoneSelect,
    toggleLearningGoal,
    handlePrivacyPress,
    handlePhotoPress,
    startEditUsername,
    startEditPassword,
    closeEditing,
    openCountryPicker,
    openTimeZonePicker,
    closePickerModal,
  } = useProfileSettingsController();
  const { handleScroll } = useTabBarScroll();

  // ------- Goal icon renderer -------
  const renderGoalIcon = (goal: typeof LEARNING_GOALS[number]) => {
    const size = 20;
    const color = tc.accent;
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
          <ActivityIndicator size="large" color={tc.accent} />
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
          <Ionicons name="alert-circle-outline" size={48} color={tc.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorBackBtn}>
            <Text style={styles.errorBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ------- Shared section renderers -------
  const renderProfileCard = () => (
    <View style={styles.profileCard}>
      <TouchableOpacity
        style={styles.avatarWrapper}
        activeOpacity={0.8}
        onPress={handlePhotoPress}
        disabled={photoUploading}
      >
        {profile.profilePictureUrl ? (
          <Image source={{ uri: profile.profilePictureUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitials}>
              {(profile.username || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.cameraBadge}>
          {photoUploading ? (
            <ActivityIndicator size={14} color={tc.white} />
          ) : (
            <Ionicons name="camera" size={14} color={tc.white} />
          )}
        </View>
      </TouchableOpacity>
      <Text style={styles.profileName}>{profile.username || 'User'}</Text>
      <Text style={styles.profileEmail}>{profile.email}</Text>
      <View style={styles.profileActions}>
        <TouchableOpacity style={styles.editProfileBtn} activeOpacity={0.7} onPress={startEditUsername}>
          <Feather name="edit-2" size={14} color={tc.accent} />
          <Text style={styles.editProfileBtnText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.changePhotoBtn}
          activeOpacity={0.7}
          onPress={handlePhotoPress}
          disabled={photoUploading}
        >
          <Ionicons name="image-outline" size={14} color={tc.text} />
          <Text style={styles.changePhotoBtnText}>
            {profile.profilePictureUrl ? 'Change Photo' : 'Add Photo'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAccountDetails = () => (
    <>
      <Text style={styles.sectionTitle}>Account Details</Text>
      <View style={styles.card}>
        <AccountRow label="Username" value={profile.username} editable onEdit={startEditUsername} />
        <View style={styles.divider} />
        <AccountRow label="Password" value="" secureText editable onEdit={startEditPassword} />
        <View style={styles.divider} />
        <AccountRow label="Country" value={profile.country} navigable onNavigate={openCountryPicker} />
        <View style={styles.divider} />
        <AccountRow label="Time Zone" value={profile.timeZone} navigable onNavigate={openTimeZonePicker} />
      </View>
    </>
  );

  const renderLearningGoals = () => (
    <>
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
    </>
  );

  const renderPrivacySecurity = () => (
    <>
      <Text style={styles.sectionTitle}>Privacy & Security</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.privacyRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('LoginDevices')}
        >
          <Text style={styles.privacyLabel}>Login Devices</Text>
          <Ionicons name="chevron-forward" size={20} color={tc.textLight} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.privacyRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('TwoFactorSettings')}
        >
          <Text style={styles.privacyLabel}>Two-Factor Authentication</Text>
          <Ionicons name="chevron-forward" size={20} color={tc.textLight} />
        </TouchableOpacity>
      </View>
    </>
  );

  const renderModals = () => (
    <>
      <Modal
        visible={editingField !== null}
        transparent
        animationType={isWeb ? 'fade' : 'slide'}
        onRequestClose={closeEditing}
      >
        <View style={[styles.modalOverlay, isWide && styles.modalOverlayCenter]}>
          <View style={[styles.modalContent, isWide && styles.modalContentWeb]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingField === 'username' ? 'Edit Username' : 'Change Password'}
              </Text>
              <TouchableOpacity onPress={closeEditing}>
                <Ionicons name="close" size={24} color={tc.text} />
              </TouchableOpacity>
            </View>
            {editingField === 'password' && (
              <TextInput
                style={styles.modalInput}
                placeholder="Current password"
                placeholderTextColor={tc.textMuted}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
            )}
            <TextInput
              style={styles.modalInput}
              placeholder={editingField === 'username' ? 'Enter new username' : 'Enter new password'}
              placeholderTextColor={tc.textMuted}
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
      <PickerModal
        visible={pickerModal.visible}
        title={pickerModal.type === 'country' ? 'Select Country' : 'Select Time Zone'}
        options={pickerModal.type === 'country' ? COUNTRIES : TIME_ZONES}
        selected={pickerModal.type === 'country' ? profile.country : profile.timeZone}
        onSelect={pickerModal.type === 'country' ? handleCountrySelect : handleTimeZoneSelect}
        onClose={closePickerModal}
      />
    </>
  );

  // ─── Web two-column layout ───
  if (isWide) {
    return (
      <View style={styles.webContainer}>
        <ScrollView contentContainerStyle={styles.webScrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.webHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={tc.text} />
            </TouchableOpacity>
            <Text style={styles.webTitle}>Profile Settings</Text>
          </View>
          <View style={styles.webColumns}>
            <View style={styles.webLeftCol}>
              <View style={styles.webCard}>{renderProfileCard()}</View>
            </View>
            <View style={styles.webRightCol}>
              <View style={styles.webCard}>{renderAccountDetails()}</View>
              <View style={styles.webCard}>{renderLearningGoals()}</View>
              <View style={styles.webCard}>{renderPrivacySecurity()}</View>
            </View>
          </View>
        </ScrollView>
        {renderModals()}
      </View>
    );
  }

  // ─── Mobile Layout ───
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={tc.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Profile Settings</Text>
          <View style={{ width: 36 }} />
        </View>
        {renderProfileCard()}
        {renderAccountDetails()}
        {renderLearningGoals()}
        {renderPrivacySecurity()}
      </ScrollView>
      {renderModals()}
    </SafeAreaView>
  );
};

// ------- Styles -------
const createStyles = (tc: ThemeColors, screenWidth: number) => {
  const isWide = isWeb && screenWidth >= 700;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: tc.background,
    },
    container: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 100,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: tc.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: 20,
      color: tc.text,
    },

    // ─── Web Layout ───
    webContainer: {
      flex: 1,
      backgroundColor: tc.background,
    },
    webScrollContent: {
      paddingHorizontal: screenWidth >= 1100 ? 48 : 32,
      paddingTop: 28,
      paddingBottom: 48,
    },
    webHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 24,
    },
    webTitle: {
      fontFamily: fonts.bold,
      fontSize: 28,
      color: tc.text,
    },
    webColumns: {
      flexDirection: screenWidth >= 900 ? 'row' : 'column',
      gap: 24,
    },
    webLeftCol: {
      width: screenWidth >= 900 ? 320 : ('100%' as any),
    },
    webRightCol: {
      flex: 1,
      gap: 0,
    },
    webCard: {
      backgroundColor: tc.surface,
      borderRadius: 16,
      padding: 24,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: tc.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
    },

    // Profile card – centered layout
    profileCard: {
      alignItems: 'center',
      marginBottom: isWide ? 0 : 28,
      paddingVertical: 16,
    },
    avatarWrapper: {
      position: 'relative',
      marginBottom: 14,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: tc.accentLight,
    },
    avatarPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: {
      fontFamily: fonts.bold,
      fontSize: 38,
      color: tc.white,
    },
    cameraBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: tc.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2.5,
      borderColor: tc.white,
    },
    profileName: {
      fontFamily: fonts.bold,
      fontSize: 20,
      color: tc.text,
      marginBottom: 2,
    },
    profileEmail: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: tc.textLight,
      marginBottom: 14,
    },
    profileActions: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    editProfileBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderColor: tc.accent,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 18,
    },
    editProfileBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: tc.accent,
    },
    changePhotoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderColor: tc.cardBorder,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 18,
    },
    changePhotoBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: tc.text,
    },
    // Sections
    sectionTitle: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: tc.text,
      marginBottom: 10,
    },
    card: {
      backgroundColor: tc.surface,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: tc.accentLight,
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    divider: {
      height: 1,
      backgroundColor: tc.inputBorder,
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
      color: tc.text,
    },
    accountRowRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    accountRowValue: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: tc.textLight,
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
      color: tc.text,
    },
    radioOuter: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: tc.textLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOuterSelected: {
      borderColor: tc.accent,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: tc.accent,
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
      color: tc.text,
    },
    // Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: tc.overlay,
      justifyContent: 'flex-end',
    },
    modalOverlayCenter: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: tc.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 36,
    },
    modalContentWeb: {
      borderRadius: 20,
      width: '100%' as any,
      maxWidth: 440,
      paddingBottom: 28,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
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
      color: tc.text,
    },
    modalInput: {
      borderWidth: 1.5,
      borderColor: tc.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontFamily: fonts.regular,
      fontSize: 15,
      color: tc.text,
      backgroundColor: tc.inputBg,
      marginBottom: 12,
      ...(isWeb ? { outlineStyle: 'none' as any } : {}),
    },
    modalSaveBtn: {
      backgroundColor: tc.accent,
      borderRadius: 24,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    modalSaveBtnText: {
      fontFamily: fonts.bold,
      fontSize: 16,
      color: tc.white,
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
      color: tc.textLight,
      marginTop: 12,
    },
    errorText: {
      fontFamily: fonts.medium,
      fontSize: 16,
      color: tc.error,
      textAlign: 'center',
      marginTop: 12,
      marginBottom: 20,
    },
    errorBackBtn: {
      backgroundColor: tc.accent,
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 28,
    },
    errorBackBtnText: {
      fontFamily: fonts.bold,
      fontSize: 14,
      color: tc.white,
    },
  });
};

export default ProfileSettingsScreen;
