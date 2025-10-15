import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, components } from '../../styles/designSystem';
import { responsive } from '../../utils/responsive';

export default function Header({ 
  title, 
  subtitle, 
  showBack = false, 
  showHamburger = false, 
  onHamburgerPress,
  rightComponent,
  isDark = false 
}) {
  const navigation = useNavigation();
  
  const theme = isDark ? {
    backgroundColor: colors.dark.backgroundSecondary,
    borderBottomColor: colors.dark.border,
    titleColor: colors.dark.textPrimary,
    subtitleColor: colors.dark.textSecondary
  } : {
    backgroundColor: colors.backgroundSecondary,
    borderBottomColor: colors.border,
    titleColor: colors.textPrimary,
    subtitleColor: colors.textSecondary
  };

  return (
    <View style={[styles.header, { 
      backgroundColor: theme.backgroundColor,
      borderBottomColor: theme.borderBottomColor 
    }]}>
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>
              ← 뒤로
            </Text>
          </TouchableOpacity>
        )}
        
        {showHamburger && (
          <TouchableOpacity 
            style={styles.hamburgerButton} 
            onPress={onHamburgerPress}
          >
            <View style={[styles.hamburgerLine, isDark && { backgroundColor: colors.dark.textSecondary }]} />
            <View style={[styles.hamburgerLine, isDark && { backgroundColor: colors.dark.textSecondary }]} />
            <View style={[styles.hamburgerLine, isDark && { backgroundColor: colors.dark.textSecondary }]} />
          </TouchableOpacity>
        )}
        
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.titleColor }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.subtitleColor }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      
      {rightComponent && (
        <View style={styles.rightSection}>
          {rightComponent}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    ...components.header,
    paddingVertical: responsive.spacing(spacing.md),
    height: responsive.size(60)
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  backButton: {
    marginRight: responsive.spacing(spacing.md)
  },
  backButtonText: {
    fontSize: responsive.fontSize(typography.fontSize.base),
    fontWeight: typography.fontWeight.medium
  },
  hamburgerButton: {
    width: responsive.size(24),
    height: responsive.size(24),
    justifyContent: 'space-between',
    paddingVertical: responsive.spacing(2),
    marginRight: responsive.spacing(spacing.md)
  },
  hamburgerLine: {
    width: '100%',
    height: responsive.size(2),
    backgroundColor: colors.textSecondary,
    borderRadius: 1
  },
  titleContainer: {
    flex: 1
  },
  title: {
    fontSize: responsive.fontSize(typography.fontSize.lg),
    fontWeight: typography.fontWeight.bold,
    lineHeight: responsive.fontSize(typography.lineHeight.tight * typography.fontSize.lg)
  },
  subtitle: {
    fontSize: responsive.fontSize(typography.fontSize.sm),
    fontWeight: typography.fontWeight.normal,
    marginTop: responsive.spacing(2)
  }
});
