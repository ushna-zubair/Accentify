import React, { useMemo } from 'react';
import {
	TouchableOpacity,
	Text,
	StyleSheet,
	ActivityIndicator,
	ViewStyle,
	TextStyle,
} from 'react-native';
import { useAppTheme, type ThemeColors } from '../hooks/useAppTheme';
import { fonts } from '../theme/typography';

interface CustomButtonProps {
	title: string;
	onPress: () => void;
	loading?: boolean;
	disabled?: boolean;
	variant?: 'primary' | 'outline';
	style?: ViewStyle;
	textStyle?: TextStyle;
	/** Accessibility label override — defaults to title */
	accessibilityLabel?: string;
}

const CustomButton: React.FC<CustomButtonProps> = ({
	title,
	onPress,
	loading = false,
	disabled = false,
	variant = 'primary',
	style,
	textStyle,
	accessibilityLabel,
}) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
	const isPrimary = variant === 'primary';
	const isDisabled = disabled || loading;

	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={isDisabled}
			activeOpacity={0.8}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel || title}
			accessibilityState={{ disabled: isDisabled }}
			style={[
				styles.button,
				isPrimary ? styles.primaryButton : styles.outlineButton,
				isDisabled && styles.disabledButton,
				style,
			]}
		>
			{loading ? (
				<ActivityIndicator color={isPrimary ? tc.white : tc.accent} size="small" />
			) : (
				<Text
					style={[
						styles.buttonText,
						isPrimary ? styles.primaryText : styles.outlineText,
						isDisabled && styles.disabledText,
						textStyle,
					]}
				>
					{title}
				</Text>
			)}
		</TouchableOpacity>
	);
};

const createStyles = (tc: ThemeColors) => StyleSheet.create({
	button: {
		height: 56,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	primaryButton: {
		backgroundColor: tc.accent,
		shadowColor: tc.accent,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.25,
		shadowRadius: 8,
		elevation: 6,
	},
	outlineButton: {
		backgroundColor: 'transparent',
		borderWidth: 1.5,
		borderColor: tc.accent,
	},
	disabledButton: {
		opacity: 0.5,
	},
	buttonText: {
		fontFamily: fonts.semiBold,
		fontSize: 16,
		letterSpacing: 0.3,
	},
	primaryText: {
		color: tc.white,
	},
	outlineText: {
		color: tc.accent,
	},
	disabledText: {
		opacity: 0.7,
	},
});

export default CustomButton;
