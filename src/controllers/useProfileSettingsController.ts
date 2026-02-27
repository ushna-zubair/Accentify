import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
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

  const startEditUsername = () => {
    setEditingField('username');
    setFieldValue(profile.username);
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
  };
};
