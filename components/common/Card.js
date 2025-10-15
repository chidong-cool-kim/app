import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, shadows, components } from '../../styles/designSystem';
import { responsive } from '../../utils/responsive';

export default function Card({ 
  children, 
  style, 
  variant = 'default', // default, elevated, outlined
  padding = 'default', // none, small, default, large
  isDark = false 
}) {
  const theme = isDark ? {
    backgroundColor: colors.dark.backgroundSecondary,
    borderColor: colors.dark.border
  } : {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.borderLight
  };

  const getCardStyle = () => {
    const baseStyle = {
      backgroundColor: theme.backgroundColor,
      borderRadius: responsive.size(borderRadius.lg)
    };

    // Padding variations with responsive values
    const paddingStyles = {
      none: {},
      small: { padding: responsive.spacing(spacing.sm) },
      default: { padding: responsive.spacing(spacing.lg) },
      large: { padding: responsive.spacing(spacing.xl) }
    };

    // Variant styles
    const variantStyles = {
      default: {
        ...shadows.sm,
        borderWidth: 1,
        borderColor: theme.borderColor
      },
      elevated: {
        ...shadows.md,
        borderWidth: 0
      },
      outlined: {
        borderWidth: 1,
        borderColor: theme.borderColor,
        shadowOpacity: 0,
        elevation: 0
      }
    };

    return [baseStyle, paddingStyles[padding], variantStyles[variant]];
  };

  return (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  );
}
