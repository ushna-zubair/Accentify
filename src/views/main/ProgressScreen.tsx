import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../theme/colors';
import { fonts } from '../../theme/typography';

const ProgressScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Progress</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.semiBold,
    fontSize: 24,
    color: colors.text,
  },
});

export default ProgressScreen;
