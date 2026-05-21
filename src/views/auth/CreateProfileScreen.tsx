import React, { useEffect, useState , useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import * as ImagePicker from 'expo-image-picker';
import { AuthStackParamList } from '../../models';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useAuth } from '../../context/AuthContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'CreateProfile'>;

const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];
const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type CountryItem = {
  name: string;
  code: string;
  callingCode: string;
};

const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const CreateProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { colors: tc } = useAppTheme();
  const { currentUser } = useAuth();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const [fullName, setFullName] = useState('');
  const [nickName, setNickName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [selectedGender, setSelectedGender] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [countryQuery, setCountryQuery] = useState('');
  const [countryLoading, setCountryLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryItem | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear() - 18);

  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: 100 }, (_, i) => currentYear - i),
    [currentYear],
  );

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setDateOfBirth(date);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getStartDay = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const selectDate = (day: number) => {
    setDateOfBirth(new Date(calendarYear, calendarMonth, day));
    setShowDatePicker(false);
  };

  useEffect(() => {
    if (showDatePicker && Platform.OS === 'web') {
      const baseDate = dateOfBirth || new Date(currentYear - 18, 0, 1);
      setCalendarMonth(baseDate.getMonth());
      setCalendarYear(baseDate.getFullYear());
    }
  }, [showDatePicker, dateOfBirth, currentYear]);

  useEffect(() => {
    let isMounted = true;

    const fetchCountries = async () => {
      setCountryLoading(true);
      try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd');
        const data = await response.json();
        if (!isMounted) return;

        const mapped: CountryItem[] = data
          .map((item: any) => {
            const root = item?.idd?.root || '';
            const suffix = Array.isArray(item?.idd?.suffixes) ? item.idd.suffixes[0] : '';
            const callingCode = `${root}${suffix}` || '';
            return {
              name: item?.name?.common || 'Unknown',
              code: item?.cca2 || '',
              callingCode,
            };
          })
          .filter((item: CountryItem) => item.code)
          .sort((a: CountryItem, b: CountryItem) => a.name.localeCompare(b.name));

        setCountries(mapped);
      } catch (error) {
        if (isMounted) {
          Alert.alert('Error', 'Failed to load countries');
        }
      } finally {
        if (isMounted) {
          setCountryLoading(false);
        }
      }
    };

    fetchCountries();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCountries = countries.filter((country) =>
    country.name.toLowerCase().includes(countryQuery.trim().toLowerCase())
  );

  const handleContinue = async () => {
    if (!fullName || !nickName || !dateOfBirth || !selectedGender) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Format date of birth as YYYY-MM-DD
    const formattedDOB = dateOfBirth.toISOString().split('T')[0];

    // Compose phone number with country calling code
    const callingCode = selectedCountry?.callingCode || '+1';
    const fullPhoneNumber = phoneNumber ? `${callingCode}${phoneNumber}` : '';

    // Convert avatar to base64 data URI if one was picked
    let profilePictureUrl = '';
    if (avatarUri) {
      setLoading(true);
      try {
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        const reader = new FileReader();
        profilePictureUrl = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        setLoading(false);
        Alert.alert(
          'Profile photo failed',
          'We couldn\'t save your photo. You can continue without it or try again.',
          [
            { text: 'Try again', style: 'cancel' },
            { text: 'Continue without photo', onPress: () => navigation.navigate('LearningGoals', {
              profile: {
                fullName,
                nickName,
                dateOfBirth: formattedDOB,
                phoneNumber: fullPhoneNumber,
                gender: selectedGender,
                profilePictureUrl: '',
              },
            }) },
          ],
        );
        return;
      }
      setLoading(false);
    }

    // Pass collected profile data to the next screen (LearningGoals)
    navigation.navigate('LearningGoals', {
      profile: {
        fullName,
        nickName,
        dateOfBirth: formattedDOB,
        phoneNumber: fullPhoneNumber,
        gender: selectedGender,
        profilePictureUrl,
      },
    });
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to take a photo.');
      return false;
    }
    return true;
  };

  const requestMediaPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Media library permission is required to choose a photo.');
      return false;
    }
    return true;
  };

  const handlePickImage = async () => {
    const hasPermission = await requestMediaPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setAvatarUri(result.assets[0].uri);
    }
    setImageModalVisible(false);
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setAvatarUri(result.assets[0].uri);
    }
    setImageModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <View style={styles.backRow}>
              <FontAwesome5 name="chevron-left" size={16} color={tc.text} />
              <Text style={styles.backArrow}>Create Profile</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarPlaceholder}
            onPress={() => setImageModalVisible(true)}
            activeOpacity={0.8}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarInner}>
                <FontAwesome5 name="user" size={34} color={tc.accent} />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setImageModalVisible(true)}
          >
            <FontAwesome5 name="pen" size={14} color={tc.white} />
          </TouchableOpacity>
        </View>

        <CustomInput
          placeholder="Full Name"
          value={fullName}
          onChangeText={setFullName}
          leftIcon={<FontAwesome5 name="user" size={18} color={tc.accent} />}
        />

        <CustomInput
          placeholder="Nick Name"
          value={nickName}
          onChangeText={setNickName}
          leftIcon={<FontAwesome5 name="user-circle" size={18} color={tc.accent} />}
        />

        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={styles.inputTouchable}
        >
          <View style={styles.dateInputContainer}>
            <FontAwesome5 name="calendar-alt" size={18} color={tc.accent} />
            <Text style={[styles.inputPlaceholder, !dateOfBirth && styles.placeholderText]}>
              {dateOfBirth ? dateOfBirth.toLocaleDateString() : 'Date of Birth'}
            </Text>
          </View>
        </TouchableOpacity>

        {showDatePicker && Platform.OS !== 'web' && (
          <View style={styles.datePickerWrap}>
            <DateTimePicker
              value={dateOfBirth || new Date(currentYear - 18, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(currentYear - 100, 0, 1)}
            />
          </View>
        )}

        <Modal
          visible={showDatePicker && Platform.OS === 'web'}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.dateModalContent}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  style={styles.calendarNav}
                  onPress={() => {
                    const newMonth = calendarMonth - 1;
                    if (newMonth < 0) {
                      setCalendarMonth(11);
                      setCalendarYear(calendarYear - 1);
                    } else {
                      setCalendarMonth(newMonth);
                    }
                  }}
                >
                  <FontAwesome5 name="chevron-left" size={14} color={tc.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowYearPicker(true)}>
                  <Text style={styles.calendarTitle}>
                    {monthNames[calendarMonth]} {calendarYear} ▾
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calendarNav}
                  onPress={() => {
                    const newMonth = calendarMonth + 1;
                    if (newMonth > 11) {
                      setCalendarMonth(0);
                      setCalendarYear(calendarYear + 1);
                    } else {
                      setCalendarMonth(newMonth);
                    }
                  }}
                >
                  <FontAwesome5 name="chevron-right" size={14} color={tc.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.weekRow}>
                {weekDays.map((day) => (
                  <Text key={day} style={styles.weekDay}>
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {Array.from({ length: getStartDay(calendarYear, calendarMonth) }).map((_, idx) => (
                  <View key={`empty-${idx}`} style={styles.dayCell} />
                ))}
                {Array.from({ length: getDaysInMonth(calendarYear, calendarMonth) }).map((_, idx) => {
                  const day = idx + 1;
                  const isSelected =
                    dateOfBirth &&
                    dateOfBirth.getFullYear() === calendarYear &&
                    dateOfBirth.getMonth() === calendarMonth &&
                    dateOfBirth.getDate() === day;
                  return (
                    <TouchableOpacity
                      key={`day-${day}`}
                      style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                      onPress={() => selectDate(day)}
                    >
                      <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.dateModalActions}>
                <TouchableOpacity
                  style={styles.dateModalButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.dateModalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {currentUser?.email ? (
          <View style={styles.emailDisplay}>
            <FontAwesome5 name="envelope" size={16} color={tc.textMuted} />
            <Text style={styles.emailDisplayText} numberOfLines={1}>
              {currentUser.email}
            </Text>
            <FontAwesome5 name="lock" size={12} color={tc.textMuted} />
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.countryContainer}
          onPress={() => setCountryModalVisible(true)}
        >
          <View style={styles.countryBadge}>
            <Text style={styles.countryFlag}>
              {getFlagEmoji(selectedCountry?.code || 'AU')}
            </Text>
            <Text style={styles.countryBadgeText}>
              {selectedCountry?.code || 'AU'}
            </Text>
          </View>
          <Text style={styles.countryCode}>
            {selectedCountry?.callingCode
              ? `(${selectedCountry.callingCode})`
              : '(+61)'}
          </Text>
          <Text
            style={[
              styles.countryName,
              !selectedCountry && styles.placeholderText,
            ]}
          >
            {selectedCountry?.name || 'Select Country'}
          </Text>
        </TouchableOpacity>

        <CustomInput
          placeholder="Phone Number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          leftIcon={<FontAwesome5 name="phone" size={18} color={tc.accent} />}
        />

        <TouchableOpacity
          onPress={() => setShowGenderModal(true)}
          style={styles.genderDropdown}
        >
          <Text style={[styles.genderText, !selectedGender && styles.placeholderText]}>
            {selectedGender || 'Gender'}
          </Text>
          <FontAwesome5 name="chevron-down" size={12} color={tc.textMuted} />
        </TouchableOpacity>

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
                      <FontAwesome5 name="check" size={14} color={tc.accent} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal
          visible={countryModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setCountryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.countryModalContent}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search country"
                placeholderTextColor={tc.textMuted}
                value={countryQuery}
                onChangeText={setCountryQuery}
              />

              {countryLoading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={tc.accent} />
                </View>
              ) : (
                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item) => item.code}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.countryOption}
                      onPress={() => {
                        setSelectedCountry(item);
                        setCountryModalVisible(false);
                      }}
                    >
                      <View style={styles.countryOptionLeft}>
                        <Text style={styles.countryOptionFlag}>
                          {getFlagEmoji(item.code)}
                        </Text>
                        <Text style={styles.countryOptionText}>{item.name}</Text>
                      </View>
                      <Text style={styles.countryOptionCode}>
                        {item.callingCode ? `(${item.callingCode})` : ''}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}

              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setCountryModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={imageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImageModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.imageModalContent}>
              <Text style={styles.modalTitle}>Profile Photo</Text>
              <TouchableOpacity style={styles.imageAction} onPress={handleTakePhoto}>
                <FontAwesome5 name="camera" size={16} color={tc.accent} />
                <Text style={styles.imageActionText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageAction} onPress={handlePickImage}>
                <FontAwesome5 name="image" size={16} color={tc.accent} />
                <Text style={styles.imageActionText}>Choose from Library</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setImageModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showYearPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowYearPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowYearPicker(false)}
          >
            <View style={styles.yearModalContent}>
              <Text style={styles.modalTitle}>Select Year</Text>
              <FlatList
                data={years}
                keyExtractor={(item) => String(item)}
                initialScrollIndex={Math.max(0, years.indexOf(calendarYear))}
                getItemLayout={(_, index) => ({ length: 44, offset: 44 * index, index })}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.yearOption}
                    onPress={() => {
                      setCalendarYear(item);
                      setShowYearPicker(false);
                    }}
                  >
                    <Text style={[styles.yearOptionText, item === calendarYear && styles.yearOptionTextActive]}>
                      {item}
                    </Text>
                    {item === calendarYear && (
                      <FontAwesome5 name="check" size={14} color={tc.accent} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        <View style={styles.continueButtonContainer}>
          <CustomButton title="Continue" onPress={handleContinue} loading={loading} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (tc: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tc.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    marginBottom: 24,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backArrow: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: tc.text,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: tc.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tc.success,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 0,
    right: -6,
  },
  inputTouchable: {
    marginBottom: 16,
  },
  datePickerWrap: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: tc.white,
    borderWidth: 1,
    borderColor: tc.inputBorder,
  },
  dateModalContent: {
    backgroundColor: tc.white,
    borderRadius: 16,
    width: 320,
    padding: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: tc.text,
  },
  calendarNav: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tc.inputBg,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  weekDay: {
    width: '14.2%',
    textAlign: 'center',
    fontFamily: fonts.semiBold,
    fontSize: 10,
    color: tc.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    borderRadius: 6,
  },
  dayCellSelected: {
    backgroundColor: tc.accent,
  },
  dayText: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    color: tc.text,
  },
  dayTextSelected: {
    color: tc.white,
  },
  dateInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tc.inputBorder,
    backgroundColor: tc.inputBg,
    paddingHorizontal: 12,
    color: tc.text,
  },
  dateModalActions: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  dateModalButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dateModalButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: tc.accent,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tc.inputBg,
    borderWidth: 1.5,
    borderColor: tc.inputBorder,
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
  },
  inputPlaceholder: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: tc.text,
    marginLeft: 8,
  },
  placeholderText: {
    color: tc.textMuted,
  },
  countryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tc.inputBg,
    borderWidth: 1.5,
    borderColor: tc.inputBorder,
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  countryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: tc.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countryFlag: {
    fontSize: 14,
  },
  countryBadgeText: {
    fontFamily: fonts.bold,
    color: tc.white,
    fontSize: 12,
  },
  countryCode: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: tc.text,
  },
  countryName: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: tc.text,
    textAlign: 'right',
  },
  genderDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tc.inputBg,
    borderWidth: 1.5,
    borderColor: tc.inputBorder,
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  genderText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: tc.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: tc.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: tc.white,
    borderRadius: 16,
    width: '80%',
    maxHeight: 300,
    paddingVertical: 8,
  },
  imageModalContent: {
    backgroundColor: tc.white,
    borderRadius: 16,
    width: '85%',
    padding: 16,
  },
  imageAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: tc.inputBorder,
  },
  imageActionText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: tc.text,
  },
  countryModalContent: {
    backgroundColor: tc.white,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 16,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: tc.text,
    marginBottom: 12,
  },
  searchInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tc.inputBorder,
    backgroundColor: tc.inputBg,
    paddingHorizontal: 12,
    marginBottom: 12,
    color: tc.text,
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  countryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: tc.inputBorder,
  },
  countryOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryOptionFlag: {
    fontSize: 16,
  },
  countryOptionText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: tc.text,
  },
  countryOptionCode: {
    fontSize: 12,
    color: tc.textMuted,
  },
  modalClose: {
    marginTop: 12,
    alignSelf: 'center',
  },
  modalCloseText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: tc.accent,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: tc.inputBorder,
  },
  genderOptionText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: tc.text,
  },
  continueButtonContainer: {
    marginTop: 20,
  },
  emailDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: tc.inputBg,
    borderWidth: 1.5,
    borderColor: tc.inputBorder,
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 16,
    opacity: 0.7,
  },
  emailDisplayText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: tc.textMuted,
  },
  yearModalContent: {
    backgroundColor: tc.white,
    borderRadius: 16,
    width: '70%',
    maxHeight: 360,
    padding: 16,
  },
  yearOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: tc.inputBorder,
  },
  yearOptionText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: tc.text,
  },
  yearOptionTextActive: {
    fontFamily: fonts.bold,
    color: tc.accent,
  },
});

export default CreateProfileScreen;
