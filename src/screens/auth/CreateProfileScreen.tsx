import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import CustomInput from '../../components/CustomInput';
import colors from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'CreateProfile'>;

const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];

const CreateProfileScreen: React.FC<Props> = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [nickName, setNickName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [email, setEmail] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setDateOfBirth(date);
    }
  };

  const handleContinue = async () => {
    if (!fullName || !nickName || !dateOfBirth || !email || !selectedGender) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // TODO: Save profile data to Firebase
      Alert.alert('Success', 'Profile created! (Firebase integration pending)');
      navigation.navigate('ForgotPassword');
    } catch (error) {
      Alert.alert('Error', 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>← Create Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* Full Name Input */}
        <CustomInput
          placeholder="Full Name"
          value={fullName}
          onChangeText={setFullName}
          leftIcon={<Text style={styles.fieldIcon}>👤</Text>}
        />

        {/* Nick Name Input */}
        <CustomInput
          placeholder="Nick Name"
          value={nickName}
          onChangeText={setNickName}
        />

        {/* Date of Birth Input */}
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={styles.inputTouchable}
        >
          <View style={styles.dateInputContainer}>
            <Text style={styles.fieldIcon}>📅</Text>
            <Text style={[styles.inputPlaceholder, !dateOfBirth && styles.placeholderText]}>
              {dateOfBirth
                ? dateOfBirth.toLocaleDateString()
                : 'Date of Birth'}
            </Text>
          </View>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dateOfBirth || new Date()}
            mode="date"
            display="spinner"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Email Input */}
        <CustomInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          leftIcon={<Text style={styles.fieldIcon}>✉️</Text>}
        />

        {/* Country Selector */}
        <View style={styles.countryContainer}>
          <Text style={styles.countryFlag}>🇦🇺</Text>
          <Text style={styles.countryCode}>(+61)</Text>
        </View>

        {/* Gender Dropdown */}
        <TouchableOpacity
          onPress={() => setShowGenderModal(true)}
          style={styles.genderDropdown}
        >
          <Text style={[styles.genderText, !selectedGender && styles.placeholderText]}>
            {selectedGender || 'Gender'}
          </Text>
          <Text style={styles.dropdownIcon}>▼</Text>
        </TouchableOpacity>

        {/* Gender Modal */}
        <Modal
          visible={showGenderModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGenderModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowGenderModal(false)}
          >
            <View style={styles.modalContent}>
              <FlatList
                data={genders}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.genderOption}
                    onPress={() => {
                      setSelectedGender(item);
                      setShowGenderModal(false);
                    }}
                  >
                    <Text style={styles.genderOptionText}>{item}</Text>
                    {selectedGender === item && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButtonContainer}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <Text style={styles.arrowIcon}>→</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    marginBottom: 24,
  },
  backArrow: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 48,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#16A596',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 0,
    right: -10,
  },
  editIcon: {
    fontSize: 20,
  },
  fieldIcon: {
    fontSize: 18,
    marginRight: 4,
  },
  inputTouchable: {
    marginBottom: 16,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
  },
  inputPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    marginLeft: 8,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  countryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryCode: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  genderDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  genderText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  dropdownIcon: {
    fontSize: 14,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '80%',
    maxHeight: 300,
    paddingVertical: 8,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  genderOptionText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  checkmark: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  continueButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  arrowIcon: {
    fontSize: 20,
    color: colors.white,
  },
});

export default CreateProfileScreen;
