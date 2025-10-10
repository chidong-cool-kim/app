import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius, components } from '../../styles/designSystem';

export default function Input({ 
  label,
  placeholder,
  value,
  onChangeText,
  error,
  helperText,
  multiline = false,
  numberOfLines = 1,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  style,
  inputStyle,
  isDark = false,
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);

  const theme = isDark ? {
    backgroundColor: colors.dark.backgroundTertiary,
    borderColor: colors.dark.border,
    textColor: colors.dark.textPrimary,
    placeholderColor: colors.dark.textSecondary,
    labelColor: colors.dark.textPrimary,
    errorColor: colors.error
  } : {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
    textColor: colors.textPrimary,
    placeholderColor: colors.textTertiary,
    labelColor: colors.textSecondary,
    errorColor: colors.error
  };

  const getBorderColor = () => {
    if (error) return theme.errorColor;
    if (isFocused) return colors.primary;
    return theme.borderColor;
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: theme.labelColor }]}>
          {label}
        </Text>
      )}
      
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundColor,
            borderColor: getBorderColor(),
            color: theme.textColor,
            minHeight: multiline ? 80 : 44
          },
          inputStyle
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.placeholderColor}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        multiline={multiline}
        numberOfLines={numberOfLines}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
      
      {error && (
        <Text style={[styles.errorText, { color: theme.errorColor }]}>
          {error}
        </Text>
      )}
      
      {helperText && !error && (
        <Text style={[styles.helperText, { color: theme.labelColor }]}>
          {helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs
  },
  input: {
    ...components.input,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    borderWidth: 1.5
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
    fontWeight: typography.fontWeight.medium
  },
  helperText: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs
  }
});
