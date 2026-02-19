import React, { useState } from 'react';
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
import colors from '../theme/colors';

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
}) => {
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
					placeholderTextColor={colors.textMuted}
					value={value}
					onChangeText={onChangeText}
					secureTextEntry={isPassword && !isPasswordVisible}
					keyboardType={keyboardType}
					autoCapitalize={autoCapitalize}
					editable={editable}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
				/>

				{isPassword ? (
					<TouchableOpacity
						style={styles.iconRight}
						onPress={() => setIsPasswordVisible((prev) => !prev)}
						hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
					>
						<FontAwesome5
							name={showPassword ? 'eye-slash' : 'eye'}
							size={16}
							color={colors.textMuted}
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

const styles = StyleSheet.create({
	wrapper: {
		marginBottom: 4,
	},
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.inputBg,
		borderWidth: 1.5,
		borderColor: colors.inputBorder,
		borderRadius: 14,
		height: 56,
		paddingHorizontal: 16,
	},
	focusedContainer: {
		borderColor: colors.primary,
	},
	errorContainer: {
		borderColor: colors.error,
	},
	input: {
		flex: 1,
		color: colors.text,
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
		color: colors.error,
	},
});

export default CustomInput;
