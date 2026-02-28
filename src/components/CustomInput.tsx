import React, { useState , useMemo} from 'react';
import {
	View,
	TextInput,
	Text,
	TouchableOpacity,
	StyleSheet,
	KeyboardTypeOptions,
	ViewStyle,
} from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useAppTheme, type ThemeColors } from '../hooks/useAppTheme';
import { fonts } from '../theme/typography';

interface CustomInputProps {
	placeholder?: string;
	value: string;
	onChangeText: (text: string) => void;
	secureTextEntry?: boolean;
	error?: string;
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
	keyboardType?: KeyboardTypeOptions;
	style?: ViewStyle;
	autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
	editable?: boolean;
	/** Accessibility label for screen readers */
	accessibilityLabel?: string;
}

const CustomInput: React.FC<CustomInputProps> = ({
	placeholder,
	value,
	onChangeText,
	secureTextEntry = false,
	error,
	leftIcon,
	rightIcon,
	keyboardType = 'default',
	style,
	autoCapitalize = 'none',
	editable = true,
	accessibilityLabel,
}) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const [isFocused, setIsFocused] = useState(false);

	const isPassword = secureTextEntry;
	const showPassword = isPassword && isPasswordVisible;

	return (
		<View style={[styles.wrapper, style]}>
			<View
				style={[
					styles.container,
					isFocused && styles.focusedContainer,
					!!error && styles.errorContainer,
				]}
			>
				{leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

				<TextInput
					style={[styles.input, leftIcon ? styles.inputWithLeft : null]}
					placeholder={placeholder}
					placeholderTextColor={tc.textMuted}
					value={value}
					onChangeText={onChangeText}
					secureTextEntry={isPassword && !isPasswordVisible}
					keyboardType={keyboardType}
					autoCapitalize={autoCapitalize}
					editable={editable}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
					accessibilityLabel={accessibilityLabel || placeholder}
				/>

				{isPassword ? (
					<TouchableOpacity
						style={styles.iconRight}
						onPress={() => setIsPasswordVisible((prev) => !prev)}
						hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
						accessibilityRole="button"
						accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
					>
						<FontAwesome5
							name={showPassword ? 'eye-slash' : 'eye'}
							size={16}
							color={tc.textMuted}
						/>
					</TouchableOpacity>
				) : (
					rightIcon && <View style={styles.iconRight}>{rightIcon}</View>
				)}
			</View>

			{!!error && <Text style={styles.errorText}>{error}</Text>}
		</View>
	);
};

const createStyles = (tc: ThemeColors) => StyleSheet.create({
	wrapper: {
		marginBottom: 4,
	},
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: tc.inputBg,
		borderWidth: 1.5,
		borderColor: tc.inputBorder,
		borderRadius: 14,
		height: 56,
		paddingHorizontal: 16,
	},
	focusedContainer: {
		borderColor: tc.accent,
	},
	errorContainer: {
		borderColor: tc.error,
	},
	input: {
		flex: 1,
		color: tc.text,
		fontFamily: fonts.regular,
		fontSize: 15,
		paddingVertical: 0,
	},
	inputWithLeft: {
		marginLeft: 8,
	},
	iconLeft: {
		marginRight: 4,
		justifyContent: 'center',
		alignItems: 'center',
	},
	iconRight: {
		marginLeft: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	errorText: {
		marginTop: 4,
		marginLeft: 4,
		fontSize: 12,
		color: tc.error,
	},
});

export default CustomInput;
