import { useState } from 'react';
import { Alert } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useProfileData } from '../hooks/useProfileData';
import type { LearningGoal, ProfileState } from '../models';

// ------- Constants -------
export const LEARNING_GOALS: { label: LearningGoal; icon: string; iconSet: 'ionicons' | 'fa5' | 'mci' }[] = [
  { label: 'Pronunciation', icon: 'mic', iconSet: 'ionicons' },
  { label: 'Vocabulary', icon: 'language', iconSet: 'fa5' },
  { label: 'Fluency', icon: 'chat-processing-outline', iconSet: 'mci' },
];

export const COUNTRIES = [
  'Australia', 'Canada', 'Germany', 'India', 'Japan',
  'Pakistan', 'United Kingdom', 'United States',
];

export const TIME_ZONES = [
  'GMT-12', 'GMT-11', 'GMT-10', 'GMT-9', 'GMT-8', 'GMT-7', 'GMT-6', 'GMT-5',
  'GMT-4', 'GMT-3', 'GMT-2', 'GMT-1', 'GMT+0', 'GMT+1', 'GMT+2', 'GMT+3',
  'GMT+4', 'GMT+5', 'GMT+6', 'GMT+7', 'GMT+8', 'GMT+9', 'GMT+10', 'GMT+11', 'GMT+12',
];

export const useProfileSettingsController = () => {
  const { currentUser } = useAuth();
  const { userDoc, isLoading, error: fetchError } = useProfileData();

  // Derive the UI-facing ProfileState from the canonical UserDocument
  const profile: ProfileState = {
    username: userDoc?.profile?.fullName || userDoc?.profile?.nickName || '',
    email: userDoc?.email || currentUser?.email || '',
    country: userDoc?.profile?.country || 'Australia',
    timeZone: userDoc?.profile?.timeZone || 'GMT+10',
    learningGoals: (userDoc?.studyPlan?.learningGoals || []) as LearningGoal[],
    profilePictureUrl: userDoc?.profile?.profilePictureUrl || '',
  };

  // Local overrides so the UI stays snappy after a mutation
  const [localOverrides, setLocalOverrides] = useState<Partial<ProfileState>>({});
  const mergedProfile: ProfileState = { ...profile, ...localOverrides };

  const [editingField, setEditingField] = useState<'username' | 'password' | null>(null);
  const [fieldValue, setFieldValue] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [pickerModal, setPickerModal] = useState<{ visible: boolean; type: 'country' | 'timeZone' }>({
    visible: false,
    type: 'country',
  });

  const handleSaveUsername = async () => {
    if (!currentUser || !fieldValue.trim()) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        'profile.fullName': fieldValue.trim(),
      });
      setLocalOverrides((prev) => ({ ...prev, username: fieldValue.trim() }));
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
      setLocalOverrides((prev) => ({ ...prev, country }));
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
      setLocalOverrides((prev) => ({ ...prev, timeZone: tz }));
    } catch {
      Alert.alert('Error', 'Failed to update time zone.');
    }
  };

  const toggleLearningGoal = async (goal: LearningGoal) => {
    if (!currentUser) return;
    const current = mergedProfile.learningGoals;
    const updated = current.includes(goal)
      ? current.filter((g) => g !== goal)
      : [...current, goal];
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        'studyPlan.learningGoals': updated,
      });
      setLocalOverrides((prev) => ({ ...prev, learningGoals: updated }));
    } catch {
      Alert.alert('Error', 'Failed to update learning goals.');
    }
  };

  const handlePrivacyPress = (item: string) => {
    Alert.alert(item, `${item} coming soon!`);
  };

  const startEditUsername = () => {
    setEditingField('username');
    setFieldValue(mergedProfile.username);
  };

  const startEditPassword = () => {
    setEditingField('password');
    setFieldValue('');
    setCurrentPassword('');
  };

  const closeEditing = () => {
    setEditingField(null);
  };

  const openCountryPicker = () => {
    setPickerModal({ visible: true, type: 'country' });
  };

  const openTimeZonePicker = () => {
    setPickerModal({ visible: true, type: 'timeZone' });
  };

  const closePickerModal = () => {
    setPickerModal((prev) => ({ ...prev, visible: false }));
  };

  return {
    profile: mergedProfile,
    isLoading,
    error: fetchError,
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
  };
};
