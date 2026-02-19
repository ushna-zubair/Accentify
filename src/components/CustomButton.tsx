import React from 'react';
import {
	TouchableOpacity,
	Text,
	StyleSheet,
	ActivityIndicator,
	ViewStyle,
	TextStyle,
} from 'react-native';
import colors from '../theme/colors';

interface CustomButtonProps {
	title: string;
	onPress: () => void;
	loading?: boolean;
	disabled?: boolean;
	variant?: 'primary' | 'outline';
	style?: ViewStyle;
	textStyle?: TextStyle;
}

const CustomButton: React.FC<CustomButtonProps> = ({
	title,
	onPress,
	loading = false,
	disabled = false,
	variant = 'primary',
	style,
	textStyle,
}) => {
	const isPrimary = variant === 'primary';
	const isDisabled = disabled || loading;

	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={isDisabled}
			activeOpacity={0.8}
			style={[
				styles.button,
				isPrimary ? styles.primaryButton : styles.outlineButton,
				isDisabled && styles.disabledButton,
				style,
			]}
		>
			{loading ? (
				<ActivityIndicator color={isPrimary ? colors.white : colors.primary} size="small" />
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

const styles = StyleSheet.create({
	button: {
		height: 56,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	primaryButton: {
		backgroundColor: colors.primary,
		shadowColor: colors.primary,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.25,
		shadowRadius: 8,
		elevation: 6,
	},
	outlineButton: {
		backgroundColor: 'transparent',
		borderWidth: 1.5,
		borderColor: colors.primary,
	},
	disabledButton: {
		opacity: 0.5,
	},
	buttonText: {
		fontSize: 16,
		fontWeight: '600',
		letterSpacing: 0.3,
	},
	primaryText: {
		color: colors.white,
	},
	outlineText: {
		color: colors.primary,
	},
	disabledText: {
		opacity: 0.7,
	},
});

export default CustomButton;
