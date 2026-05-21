import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
    Platform,
    Alert,
    ScrollView,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
    FadeInDown,
} from 'react-native-reanimated';
import { AuthStackParamList } from '../../models';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyEmail'>;

const VerifyEmailScreen: React.FC<Props> = ({ route, navigation }) => {
    const { email } = route.params;
    const { colors: tc } = useAppTheme();
    const styles = useMemo(() => createStyles(tc), [tc]);
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    const { sendVerificationEmail, reloadUser, currentUser, signOut } = useAuth();

    const [resendCooldown, setResendCooldown] = useState(0);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // Floating animation for the icon
    const translateY = useSharedValue(0);

    useEffect(() => {
        translateY.value = withRepeat(
            withSequence(
                withTiming(-6, { duration: 2500, easing: Easing.bezier(0.42, 0, 0.58, 1) }),
                withTiming(0, { duration: 2500, easing: Easing.bezier(0.42, 0, 0.58, 1) })
            ),
            -1,
            true
        );
    }, []);

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    // Cooldown timer for resend
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (resendCooldown > 0) {
            timer = setInterval(() => {
                setResendCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleOpenEmail = async () => {
        if (Platform.OS === 'web') {
            window.open('https://mail.google.com', '_blank');
            return;
        }

        const urlsToTry = Platform.OS === 'ios'
            ? ['googlegmail://', 'message://']
            : ['googlegmail://'];

        for (const url of urlsToTry) {
            try {
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                    await Linking.openURL(url);
                    return;
                }
            } catch {
                continue;
            }
        }

        try {
            await Linking.openURL('https://mail.google.com');
        } catch {
            showAlert('Error', 'Could not open email app. Please check your email manually.');
        }
    };

    const handleResendEmail = async () => {
        if (resendCooldown > 0) return;
        setLoading(true);
        try {
            await sendVerificationEmail();
            setResendCooldown(60);
            showAlert('Success', 'Verification email resent successfully!');
        } catch (error: any) {
            let message = 'Failed to resend email.';
            if (error.code === 'auth/too-many-requests') {
                message = 'Too many requests. Please wait a few minutes before trying again.';
                setResendCooldown(60); // Set cooldown on rate limit error
            } else if (error.message) {
                message = error.message;
            }
            showAlert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    const checkVerificationStatus = useCallback(async () => {
        setVerifying(true);
        try {
            await reloadUser();
            if (!currentUser?.emailVerified) {
                showAlert('Not Verified', 'Please check your email and click the verification link before continuing.');
            }
        } catch (error: any) {
            showAlert('Error', 'Failed to check verification status.');
        } finally {
            setVerifying(false);
        }
    }, [currentUser, reloadUser, navigation]);

    const handleChangeEmail = async () => {
        try {
            await signOut();
        } catch (err) {
            console.warn('[VerifyEmail] signOut failed:', err);
        }
        // signOut clears auth state which causes AppNavigator to render AuthNavigator.
        // Explicitly reset this stack to Login in case we're already inside an AuthNavigator
        // (e.g. user pressed back during sign-up before AppNavigator switched stacks).
        try {
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        } catch {
            // If 'Login' isn't in this stack (verify-email gated stack), AppNavigator will swap us out
            // on the next render — nothing else to do.
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.overlay}>
                <Animated.View
                    entering={FadeInDown.duration(500).springify()}
                    style={styles.card}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Email Verification</Text>
                        <TouchableOpacity
                            onPress={handleChangeEmail}
                            activeOpacity={0.7}
                            style={styles.closeButton}
                        >
                            <FontAwesome5 name="times" size={20} color={tc.textLight} />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <View style={styles.cardContent}>
                        {/* Mockup-style Icon */}
                        <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
                            <View style={styles.envelopeWrap}>
                                <FontAwesome5 name="envelope" size={80} color={tc.accentMuted || "#CFD8FE"} solid />
                                <View style={styles.checkmarkBadge}>
                                    <FontAwesome5 name="check-circle" size={32} color={tc.success || "#3DC13C"} solid />
                                </View>
                            </View>
                        </Animated.View>

                        {/* Title */}
                        <Text style={styles.title}>Please confirm your email!</Text>

                        {/* Description */}
                        <Text style={styles.subtext}>
                            We've sent a confirmation email to {'\n'}
                            <Text style={styles.emailText}>{email}</Text>
                        </Text>

                        <Text style={styles.secondarySubtext}>
                            Click the link to verify your email address and log in
                        </Text>

                        {/* Action Buttons */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                onPress={checkVerificationStatus}
                                activeOpacity={0.8}
                                disabled={verifying}
                                style={[styles.okayButton, verifying && styles.disabledBtn]}
                            >
                                <Text style={styles.okayButtonText}>
                                    {verifying ? 'Checking...' : 'Okay'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleOpenEmail}
                                activeOpacity={0.7}
                                style={styles.openAppButton}
                            >
                                <Text style={styles.openAppButtonText}>Open Email App</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Resend Link */}
                        <TouchableOpacity
                            onPress={handleResendEmail}
                            disabled={resendCooldown > 0 || loading}
                            activeOpacity={0.7}
                            style={styles.resendLinkWrap}
                        >
                            <Text style={[styles.resendText, (resendCooldown > 0 || loading) && styles.disabledText]}>
                                {resendCooldown > 0
                                    ? `Resend in ${resendCooldown}s`
                                    : 'Resend Verification Email'}
                            </Text>
                        </TouchableOpacity>

                        {/* Back to Login */}
                        <TouchableOpacity
                            onPress={handleChangeEmail}
                            activeOpacity={0.7}
                            style={styles.backToLoginWrap}
                        >
                            <Text style={styles.backToLoginText}>Back to Login</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
};

const createStyles = (tc: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: tc.black + '1A', // Dim background behind the card
        },
        overlay: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
        },
        card: {
            width: '100%',
            maxWidth: 420,
            backgroundColor: tc.surfaceAlt || '#f8f9fe',
            borderRadius: 24,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 10,
        },
        /* ── Header ── */
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingVertical: 18,
            backgroundColor: tc.surface || '#FFFFFF',
        },
        headerTitle: {
            fontFamily: fonts.bold,
            fontSize: 22,
            color: tc.text,
            letterSpacing: -0.3,
        },
        closeButton: {
            padding: 4,
        },
        /* ── Card Content ── */
        cardContent: {
            paddingTop: 32,
            paddingBottom: 40,
            paddingHorizontal: 28,
            alignItems: 'center',
        },
        /* ── Styled Icon ── */
        iconContainer: {
            marginBottom: 32,
        },
        envelopeWrap: {
            position: 'relative',
        },
        checkmarkBadge: {
            position: 'absolute',
            bottom: -8,
            right: -12,
            backgroundColor: tc.surface || '#FFFFFF',
            borderRadius: 20,
            borderWidth: 3,
            borderColor: tc.surface || '#FFFFFF',
        },
        /* ── Typography ── */
        title: {
            fontFamily: fonts.bold,
            fontSize: 24,
            color: tc.text,
            marginBottom: 16,
            textAlign: 'center',
            letterSpacing: -0.5,
        },
        subtext: {
            fontFamily: fonts.regular,
            fontSize: 15,
            color: tc.textLight,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 8,
        },
        emailText: {
            fontFamily: fonts.bold,
            color: tc.text,
        },
        secondarySubtext: {
            fontFamily: fonts.regular,
            fontSize: 14,
            color: tc.textMuted,
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: 32,
        },
        /* ── Buttons ── */
        buttonContainer: {
            width: '100%',
            gap: 12,
        },
        okayButton: {
            height: 56,
            borderRadius: 16,
            backgroundColor: tc.accent,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 4,
            shadowColor: tc.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
        },
        okayButtonText: {
            fontFamily: fonts.semiBold,
            fontSize: 18,
            color: '#FFFFFF',
            letterSpacing: 0.5,
        },
        openAppButton: {
            height: 56,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: tc.accent + '30',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
        },
        openAppButtonText: {
            fontFamily: fonts.medium,
            fontSize: 16,
            color: tc.accent,
        },
        disabledBtn: {
            opacity: 0.6,
        },
        /* ── Footer Link ── */
        resendLinkWrap: {
            marginTop: 24,
            padding: 4,
        },
        resendText: {
            fontFamily: fonts.medium,
            fontSize: 13,
            color: tc.textLight,
            textDecorationLine: 'underline',
        },
        disabledText: {
            color: tc.textMuted,
        },
        backToLoginWrap: {
            marginTop: 8,
            padding: 4,
            alignItems: 'center',
        },
        backToLoginText: {
            fontFamily: fonts.medium,
            fontSize: 14,
            color: tc.textLight,
            textDecorationLine: 'underline',
        },
    });

export default VerifyEmailScreen;
