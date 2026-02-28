import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, type ThemeColors } from '../hooks/useAppTheme';
import { fonts } from '../theme/typography';

interface PickerModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Title displayed at the top of the picker */
  title: string;
  /** Array of option strings to choose from */
  options: string[];
  /** Currently selected option */
  selected: string;
  /** Called when an option is selected */
  onSelect: (value: string) => void;
  /** Called to dismiss the modal */
  onClose: () => void;
}

/**
 * Reusable bottom-sheet style picker modal with checkmark selection.
 */
const PickerModal: React.FC<PickerModalProps> = ({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);

  return (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.overlay}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close picker"
          >
            <Ionicons name="close" size={24} color={tc.text} />
          </TouchableOpacity>
        </View>

        {/* Options */}
        <FlatList
          data={options}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.option, selected === item && styles.optionSelected]}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: selected === item }}
            >
              <Text
                style={[
                  styles.optionText,
                  selected === item && styles.optionTextSelected,
                ]}
              >
                {item}
              </Text>
              {selected === item && (
                <Ionicons name="checkmark" size={20} color={tc.accent} />
              )}
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: 350 }}
        />
      </View>
    </View>
  </Modal>
  );
};

const createStyles = (tc: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: tc.overlay,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: tc.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: tc.text,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  optionSelected: {
    backgroundColor: tc.accentMuted,
  },
  optionText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: tc.text,
  },
  optionTextSelected: {
    fontFamily: fonts.semiBold,
    color: tc.accent,
  },
});

export default PickerModal;
