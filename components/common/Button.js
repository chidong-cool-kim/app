import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, typography, spacing, components } from '../../styles/designSystem';
import { responsive } from '../../utils/responsive';

export default function Button({ 
  title, 
  onPress, 
  variant = 'primary', // primary, secondary, outline, text
  size = 'medium', // small, medium, large
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon
}) {
  const getButtonStyle = () => {
    const baseStyle = {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      borderRadius: responsive.size(components.button.primary.borderRadius)
    };

    // Size variations with responsive values
    const sizeStyles = {
      small: {
        paddingHorizontal: responsive.spacing(spacing.sm),
        paddingVertical: responsive.spacing(spacing.xs),
        minHeight: responsive.size(32)
      },
      medium: {
        paddingHorizontal: responsive.spacing(spacing.lg),
        paddingVertical: responsive.spacing(spacing.md),
        minHeight: responsive.size(44)
      },
      large: {
        paddingHorizontal: responsive.spacing(spacing.xl),
        paddingVertical: responsive.spacing(spacing.lg),
        minHeight: responsive.size(52)
      }
    };

    // Variant styles
    const variantStyles = {
      primary: {
        backgroundColor: disabled ? colors.textTertiary : colors.primary
      },
      secondary: {
        backgroundColor: disabled ? colors.borderLight : colors.backgroundTertiary,
        borderWidth: 1,
        borderColor: disabled ? colors.border : colors.borderDark
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled ? colors.border : colors.primary
      },
      text: {
        backgroundColor: 'transparent'
      }
    };

    return [baseStyle, sizeStyles[size], variantStyles[variant]];
  };

  const getTextStyle = () => {
    const baseTextStyle = {
      fontWeight: typography.fontWeight.semibold,
      textAlign: 'center'
    };

    // Size text styles with responsive font sizes
    const sizeTextStyles = {
      small: { fontSize: responsive.fontSize(typography.fontSize.sm) },
      medium: { fontSize: responsive.fontSize(typography.fontSize.base) },
      large: { fontSize: responsive.fontSize(typography.fontSize.lg) }
    };

    // Variant text styles
    const variantTextStyles = {
      primary: {
        color: disabled ? colors.textSecondary : colors.textInverse
      },
      secondary: {
        color: disabled ? colors.textSecondary : colors.textPrimary
      },
      outline: {
        color: disabled ? colors.textSecondary : colors.primary
      },
      text: {
        color: disabled ? colors.textSecondary : colors.primary
      }
    };

    return [baseTextStyle, sizeTextStyles[size], variantTextStyles[variant]];
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' ? colors.textInverse : colors.primary} 
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={[getTextStyle(), textStyle, icon && { marginLeft: responsive.spacing(spacing.xs) }]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
