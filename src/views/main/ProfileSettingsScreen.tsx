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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import colors from '../../theme/colors';
import { useProfileSettingsController, LEARNING_GOALS, COUNTRIES, TIME_ZONES } from '../../controllers';

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

// ------- Picker Modal -------
interface PickerModalProps {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const PickerModal: React.FC<PickerModalProps> = ({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={options}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.modalOption, selected === item && styles.modalOptionSelected]}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <Text
                style={[
                  styles.modalOptionText,
                  selected === item && styles.modalOptionTextSelected,
                ]}
              >
                {item}
              </Text>
              {selected === item && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: 350 }}
        />
      </View>
    </View>
  </Modal>
);

// ------- Main Screen -------
const ProfileSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    profile,
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
    fontSize: 28,
    fontWeight: '700',
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
    backgroundColor: '#7DC8E7',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  profileEmail: {
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  // Sections
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  accountRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountRowValue: {
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
    fontSize: 14,
    fontWeight: '500',
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
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  modalOptionSelected: {
    backgroundColor: colors.inputBg,
  },
  modalOptionText: {
    fontSize: 15,
    color: colors.text,
  },
  modalOptionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
});

export default ProfileSettingsScreen;
