import { useState } from 'react';
import { Alert, ActionSheetIOS, Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useProfileData } from '../hooks/useProfileData';
import type { LearningGoal, ProfileState } from '../models';

const isWeb = Platform.OS === 'web';

/** Web-safe alert (window.alert on web, Alert.alert on native) */
const webAlert = (title: string, message?: string) => {
  if (isWeb) {
    window.alert(message ? `${title}\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
};

/** Web-safe confirm dialog. Returns true if confirmed. */
const webConfirm = (title: string, message?: string): Promise<boolean> => {
  if (isWeb) {
    return Promise.resolve(window.confirm(message ? `${title}\n${message}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'OK', onPress: () => resolve(true) },
    ]);
  });
};

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
  const [photoUploading, setPhotoUploading] = useState(false);

  // ------- Photo helpers -------

  const pickAndUploadPhoto = async (source: 'camera' | 'library') => {
    if (!currentUser) return;

    // Request permission
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        webAlert('Permission Required', 'Camera access is needed to take a photo.');
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        webAlert('Permission Required', 'Photo library access is needed to select a photo.');
        return;
      }
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });

    if (result.canceled || !result.assets?.length) return;

    setPhotoUploading(true);
    try {
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `profilePhotos/${currentUser.uid}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'users', currentUser.uid), {
        'profile.profilePictureUrl': downloadURL,
      });
      setLocalOverrides((prev) => ({ ...prev, profilePictureUrl: downloadURL }));
    } catch (e: any) {
      webAlert('Error', e.message || 'Failed to upload photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentUser) return;

    const confirmed = await webConfirm('Remove Photo', 'Are you sure you want to remove your profile photo?');
    if (!confirmed) return;

    setPhotoUploading(true);
    try {
      // Delete from Storage (ignore if doesn't exist)
      try {
        const storageRef = ref(storage, `profilePhotos/${currentUser.uid}`);
        await deleteObject(storageRef);
      } catch { /* file may not exist */ }

      await updateDoc(doc(db, 'users', currentUser.uid), {
        'profile.profilePictureUrl': '',
      });
      setLocalOverrides((prev) => ({ ...prev, profilePictureUrl: '' }));
    } catch (e: any) {
      webAlert('Error', e.message || 'Failed to remove photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePhotoPress = () => {
    if (isWeb) {
      // On web, use file input for photo selection
      pickAndUploadPhoto('library');
    } else if (Platform.OS === 'ios') {
      const options = mergedProfile.profilePictureUrl
        ? ['Take Photo', 'Choose from Library', 'Remove Photo', 'Cancel']
        : ['Take Photo', 'Choose from Library', 'Cancel'];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: mergedProfile.profilePictureUrl ? 2 : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) pickAndUploadPhoto('camera');
          else if (buttonIndex === 1) pickAndUploadPhoto('library');
          else if (buttonIndex === 2 && mergedProfile.profilePictureUrl) handleRemovePhoto();
        },
      );
    } else {
      // Android – use Alert as action sheet
      const buttons: any[] = [
        { text: 'Take Photo', onPress: () => pickAndUploadPhoto('camera') },
        { text: 'Choose from Library', onPress: () => pickAndUploadPhoto('library') },
      ];
      if (mergedProfile.profilePictureUrl) {
        buttons.push({ text: 'Remove Photo', style: 'destructive', onPress: handleRemovePhoto });
      }
      buttons.push({ text: 'Cancel', style: 'cancel' });
      Alert.alert('Profile Photo', 'Choose an option', buttons);
    }
  };

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
      webAlert('Error', 'Failed to update username.');
    }
  };

  const handleSavePassword = async () => {
    if (!currentUser || !fieldValue || !currentPassword) return;
    if (fieldValue.length < 6) {
      webAlert('Error', 'Password must be at least 6 characters.');
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, fieldValue);
      webAlert('Success', 'Password updated successfully.');
      setEditingField(null);
      setFieldValue('');
      setCurrentPassword('');
    } catch (e: any) {
      webAlert('Error', e.message || 'Failed to update password.');
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
      webAlert('Error', 'Failed to update country.');
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
      webAlert('Error', 'Failed to update time zone.');
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
      webAlert('Error', 'Failed to update learning goals.');
    }
  };

  const handlePrivacyPress = (item: string) => {
    webAlert(item, `${item} coming soon!`);
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
  };
};
