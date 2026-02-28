import React, { useRef, useState , useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../models';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const slides = [
  {
    id: '1',
    image: require('../../../assets/2ndscreen-logo.png'),
    title: 'Speak Confidently',
    subtitle: 'Practice daily and improve pronunciation with real feedback.',
  },
  {
    id: '2',
    image: require('../../../assets/3rdscreelogo.png'),
    title: 'Learn Smartly',
    subtitle: 'Personalized lessons tailored to your speaking goals.',
  },
  {
    id: '3',
    image: require('../../../assets/4thscreenlogo.png'),
    title: 'Practice Daily',
    subtitle: 'Build consistency with fun, bite-sized sessions.',
  },
  {
    id: '4',
    image: require('../../../assets/5thscreenicon.png'),
    title: 'Start Today',
    subtitle: 'Join a community of confident English speakers.',
  },
];

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const { width } = useWindowDimensions();
  const [currentSlide, setCurrentSlide] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 });
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    const firstViewable = viewableItems.find((item) => item.index !== null);
    if (firstViewable?.index !== null && firstViewable?.index !== undefined) {
      setCurrentSlide(firstViewable.index);
    }
  });

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index !== currentSlide) {
      setCurrentSlide(index);
    }
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentSlide + 1, animated: true });
    } else {
      navigation.navigate('Login');
    }
  };

  const handleScrollToIndexFailed = (info: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) => {
    flatListRef.current?.scrollToOffset({
      offset: info.averageItemLength * info.index,
      animated: true,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={handleScroll}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        viewabilityConfig={viewabilityConfig.current}
        onViewableItemsChanged={onViewableItemsChanged.current}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Image source={item.image} style={styles.image} />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={styles.bottomContainer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, currentSlide === index && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          {currentSlide === slides.length - 1 ? (
            <Text style={styles.buttonText}>Get Started</Text>
          ) : (
            <FontAwesome5 name="arrow-right" size={20} color={tc.white} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (tc: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tc.background,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: tc.text,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  image: {
    width: 300,
    height: 300,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: tc.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: tc.textLight,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tc.inputBorder,
  },
  dotActive: {
    backgroundColor: tc.accent,
    width: 24,
  },
  nextButton: {
    minWidth: 56,
    height: 56,
    paddingHorizontal: 18,
    borderRadius: 28,
    backgroundColor: tc.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: tc.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: tc.white,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

export default OnboardingScreen;
