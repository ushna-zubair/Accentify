import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';

// ------- Types -------
type LearningGoal = 'Pronunciation' | 'Vocabulary' | 'Fluency';

interface ProfileState {
  username: string;
  email: string;
  country: string;
  timeZone: string;
  learningGoals: LearningGoal[];
  profilePictureUrl: string;
}

// ------- Constants -------
const LEARNING_GOALS: { label: LearningGoal; icon: string; iconSet: 'ionicons' | 'fa5' | 'mci' }[] = [
  { label: 'Pronunciation', icon: 'mic', iconSet: 'ionicons' },
  { label: 'Vocabulary', icon: 'language', iconSet: 'fa5' },
  { label: 'Fluency', icon: 'chat-processing-outline', iconSet: 'mci' },
];

const COUNTRIES = [
  'Australia', 'Canada', 'Germany', 'India', 'Japan',
  'Pakistan', 'United Kingdom', 'United States',
];

const TIME_ZONES = [
  'GMT-12', 'GMT-11', 'GMT-10', 'GMT-9', 'GMT-8', 'GMT-7', 'GMT-6', 'GMT-5',
  'GMT-4', 'GMT-3', 'GMT-2', 'GMT-1', 'GMT+0', 'GMT+1', 'GMT+2', 'GMT+3',
  'GMT+4', 'GMT+5', 'GMT+6', 'GMT+7', 'GMT+8', 'GMT+9', 'GMT+10', 'GMT+11', 'GMT+12',
];

// ------- Subcomponents -------

interface AccountRowProps {
  label: string;
  value: string;
  editable?: boolean;
  onEdit?: () => void;
  navigable?: boolean;
  onNavigate?: () => void;
  secureText?: boolean;
  tc: ThemeColors;
}

const AccountRow: React.FC<AccountRowProps> = ({
  label,
  value,
  editable,
  onEdit,
  navigable,
  onNavigate,
  secureText,
  tc,
}) => (
  <TouchableOpacity
    style={styles.accountRow}
    activeOpacity={editable || navigable ? 0.6 : 1}
    onPress={navigable ? onNavigate : editable ? onEdit : undefined}
    disabled={!editable && !navigable}
  >
    <Text style={[styles.accountRowLabel, { color: tc.text }]}>{label}</Text>
    <View style={styles.accountRowRight}>
      <Text style={[styles.accountRowValue, { color: tc.textLight }]}>
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

// Inline import to avoid extra top-level import
import { Feather } from '@expo/vector-icons';

interface RadioCircleProps {
  selected: boolean;
  tc: ThemeColors;
}

const RadioCircle: React.FC<RadioCircleProps> = ({ selected, tc }) => (
  <View style={[styles.radioOuter, { borderColor: tc.textLight }, selected && { borderColor: tc.text }]}>
    {selected && <View style={[styles.radioInner, { backgroundColor: tc.text }]} />}
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
  tc: ThemeColors;
}

const PickerModal: React.FC<PickerModalProps> = ({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  tc,
}) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, { backgroundColor: tc.surface }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: tc.text }]}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={tc.text} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={options}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.modalOption, { borderBottomColor: tc.inputBorder }, selected === item && { backgroundColor: tc.inputBg }]}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <Text
                style={[
                  styles.modalOptionText,
                  { color: tc.text },
                  selected === item && { fontWeight: '600', color: tc.accent },
                ]}
              >
                {item}
              </Text>
              {selected === item && (
                <Ionicons name="checkmark" size={20} color={tc.accent} />
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
  const { currentUser } = useAuth();
  const { colors: tc } = useAppTheme();

  const [profile, setProfile] = useState<ProfileState>({
    username: '',
    email: '',
    country: 'Australia',
    timeZone: 'GMT+10',
    learningGoals: [],
    profilePictureUrl: '',
  });

  const [editingField, setEditingField] = useState<'username' | 'password' | null>(null);
  const [fieldValue, setFieldValue] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [pickerModal, setPickerModal] = useState<{ visible: boolean; type: 'country' | 'timeZone' }>({
    visible: false,
    type: 'country',
  });

  // Load profile from Firestore
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            username: data.profile?.fullName || data.profile?.nickName || '',
            email: currentUser.email || '',
            country: data.profile?.country || 'Australia',
            timeZone: data.profile?.timeZone || 'GMT+10',
            learningGoals: (data.studyPlan?.learningGoals || []) as LearningGoal[],
            profilePictureUrl: data.profile?.profilePictureUrl || '',
          });
        }
      } catch (e) {
        console.warn('Failed to load profile', e);
      }
    })();
  }, [currentUser]);

  // ------- Handlers -------

  const handleSaveUsername = async () => {
    if (!currentUser || !fieldValue.trim()) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        'profile.fullName': fieldValue.trim(),
      });
      setProfile((prev) => ({ ...prev, username: fieldValue.trim() }));
      setEditingField(null);
      setFieldValue('');
    } catch (e) {
      Alert.alert('Error', 'Failed to update username.');
    }
  };

  const handleSavePassword = async () => {
    if (!currentUser || !fieldValue || !currentPassword) return;
    if (fieldValue.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, fieldValue);
      Alert.alert('Success', 'Password updated successfully.');
      setEditingField(null);
      setFieldValue('');
      setCurrentPassword('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update password.');
    }
  };

  const handleCountrySelect = async (country: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        'profile.country': country,
      });
      setProfile((prev) => ({ ...prev, country }));
    } catch {
      Alert.alert('Error', 'Failed to update country.');
    }
  };

  const handleTimeZoneSelect = async (tz: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        'profile.timeZone': tz,
      });
      setProfile((prev) => ({ ...prev, timeZone: tz }));
    } catch {
      Alert.alert('Error', 'Failed to update time zone.');
    }
  };

  const toggleLearningGoal = async (goal: LearningGoal) => {
    if (!currentUser) return;
    const updated = profile.learningGoals.includes(goal)
      ? profile.learningGoals.filter((g) => g !== goal)
      : [...profile.learningGoals, goal];
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        'studyPlan.learningGoals': updated,
      });
      setProfile((prev) => ({ ...prev, learningGoals: updated }));
    } catch {
      Alert.alert('Error', 'Failed to update learning goals.');
    }
  };

  const handlePrivacyPress = (item: string) => {
    Alert.alert(item, `${item} coming soon!`);
  };

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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: tc.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={tc.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: tc.text }]}>Profile Settings</Text>
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
            <Text style={[styles.profileName, { color: tc.text }]}>{profile.username || 'User'}</Text>
            <Text style={[styles.profileEmail, { color: tc.textLight }]}>{profile.email}</Text>
            <TouchableOpacity
              style={[styles.editProfileBtn, { borderColor: tc.text }]}
              activeOpacity={0.7}
              onPress={() => {
                setEditingField('username');
                setFieldValue(profile.username);
              }}
            >
              <Text style={[styles.editProfileBtnText, { color: tc.text }]}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Details */}
        <Text style={[styles.sectionTitle, { color: tc.text }]}>Account Details</Text>
        <View style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.accentLight }]}>
          <AccountRow
            label="Username"
            value={profile.username}
            editable
            onEdit={() => {
              setEditingField('username');
              setFieldValue(profile.username);
            }}
            tc={tc}
          />
          <View style={[styles.divider, { backgroundColor: tc.inputBorder }]} />
          <AccountRow
            label="Password"
            value=""
            secureText
            editable
            onEdit={() => {
              setEditingField('password');
              setFieldValue('');
              setCurrentPassword('');
            }}
            tc={tc}
          />
          <View style={[styles.divider, { backgroundColor: tc.inputBorder }]} />
          <AccountRow
            label="Country"
            value={profile.country}
            navigable
            onNavigate={() => setPickerModal({ visible: true, type: 'country' })}
            tc={tc}
          />
          <View style={[styles.divider, { backgroundColor: tc.inputBorder }]} />
          <AccountRow
            label="Time Zone"
            value={profile.timeZone}
            navigable
            onNavigate={() => setPickerModal({ visible: true, type: 'timeZone' })}
            tc={tc}
          />
        </View>

        {/* Learning Goals */}
        <Text style={[styles.sectionTitle, { color: tc.text }]}>Learning Goals</Text>
        <View style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.accentLight }]}>
          {LEARNING_GOALS.map((goal, idx) => {
            const selected = profile.learningGoals.includes(goal.label);
            return (
              <React.Fragment key={goal.label}>
                {idx > 0 && <View style={[styles.divider, { backgroundColor: tc.inputBorder }]} />}
                <TouchableOpacity
                  style={styles.goalRow}
                  activeOpacity={0.7}
                  onPress={() => toggleLearningGoal(goal.label)}
                >
                  <View style={styles.goalLeft}>
                    {renderGoalIcon(goal)}
                    <Text style={[styles.goalLabel, { color: tc.text }]}>{goal.label}</Text>
                  </View>
                  <RadioCircle selected={selected} tc={tc} />
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        {/* Privacy & Security */}
        <Text style={[styles.sectionTitle, { color: tc.text }]}>Privacy & Security</Text>
        <View style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.accentLight }]}>
          <TouchableOpacity
            style={styles.privacyRow}
            activeOpacity={0.7}
            onPress={() => handlePrivacyPress('Login Devices')}
          >
            <Text style={[styles.privacyLabel, { color: tc.text }]}>Login Devices</Text>
            <Ionicons name="chevron-forward" size={20} color={tc.textLight} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: tc.inputBorder }]} />
          <TouchableOpacity
            style={styles.privacyRow}
            activeOpacity={0.7}
            onPress={() => handlePrivacyPress('Two-Factor Authentication')}
          >
            <Text style={[styles.privacyLabel, { color: tc.text }]}>Two-Factor Authentication</Text>
            <Ionicons name="chevron-forward" size={20} color={tc.textLight} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit field modal */}
      <Modal
        visible={editingField !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingField(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: tc.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: tc.text }]}>
                {editingField === 'username' ? 'Edit Username' : 'Change Password'}
              </Text>
              <TouchableOpacity onPress={() => setEditingField(null)}>
                <Ionicons name="close" size={24} color={tc.text} />
              </TouchableOpacity>
            </View>

            {editingField === 'password' && (
              <TextInput
                style={[styles.modalInput, { borderColor: tc.inputBorder, color: tc.text, backgroundColor: tc.inputBg }]}
                placeholder="Current password"
                placeholderTextColor={tc.textMuted}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
            )}

            <TextInput
              style={[styles.modalInput, { borderColor: tc.inputBorder, color: tc.text, backgroundColor: tc.inputBg }]}
              placeholder={editingField === 'username' ? 'Enter new username' : 'Enter new password'}
              placeholderTextColor={tc.textMuted}
              secureTextEntry={editingField === 'password'}
              value={fieldValue}
              onChangeText={setFieldValue}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: tc.accent }]}
              activeOpacity={0.7}
              onPress={editingField === 'username' ? handleSaveUsername : handleSavePassword}
            >
              <Text style={[styles.modalSaveBtnText, { color: tc.white }]}>Save</Text>
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
        onClose={() => setPickerModal({ ...pickerModal, visible: false })}
        tc={tc}
      />
    </SafeAreaView>
  );
};

// ------- Styles -------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
  },
  profileEmail: {
    fontSize: 13,
    marginBottom: 8,
  },
  editProfileBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Sections
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  divider: {
    height: 1,
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
  },
  accountRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountRowValue: {
    fontSize: 14,
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
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
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
  },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  modalSaveBtn: {
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  modalSaveBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 15,
  },
});

export default ProfileSettingsScreen;
