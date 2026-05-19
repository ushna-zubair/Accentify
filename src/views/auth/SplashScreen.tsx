import React, { useEffect, useMemo, useRef } from 'react';
import { View, Image, StyleSheet, Text, Animated } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../models';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);

  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(24)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo entrance: fade + spring bounce
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Title slides up after logo lands
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();

      // Gentle repeating pulse on the logo
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.04,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });

    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: Animated.multiply(logoScale, pulseScale) }],
          }}
        >
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          A C C E N T I F Y
        </Animated.Text>
      </View>
    </View>
  );
};

const createStyles = (tc: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tc.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 300,
    height: 300,
    marginBottom: 28,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: tc.accent,
    letterSpacing: 6,
  },
});

export default SplashScreen;
