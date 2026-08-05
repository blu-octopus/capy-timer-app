import React from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts } from '@/src/theme/tokens';
import { Text } from './Text';

export interface FieldProps extends TextInputProps {
  label: string;
}

/** Underline-only input — no box, matching the category naming sheet. */
export function Field({ label, style, ...rest }: FieldProps) {
  return (
    <View style={styles.root}>
      <Text variant="body">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.grey}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
    width: 248,
    maxWidth: '100%',
  },
  input: {
    width: '100%',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.black,
    fontFamily: fonts.body,
    // 16pt avoids the focus-zoom mobile browsers apply to smaller inputs.
    fontSize: 16,
    color: colors.black,
  },
});
