// StudyTime 앱 통일 디자인 시스템

export const colors = {
  // Primary Colors
  primary: '#007AFF',
  primaryLight: '#4A90E2',
  primaryDark: '#0056CC',
  
  // Background Colors
  background: '#F8F9FA',
  backgroundSecondary: '#FFFFFF',
  backgroundTertiary: '#F5F5F5',
  
  // Text Colors
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  
  // Border Colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderDark: '#D1D5DB',
  
  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Special Colors
  accent: '#8B5CF6',
  highlight: '#FEF3C7',
  
  // Dark Mode (수능 모드용)
  dark: {
    background: '#1C1C1E',
    backgroundSecondary: '#2C2C2E',
    backgroundTertiary: '#3A3A3C',
    textPrimary: '#FFFFFF',
    textSecondary: '#999999',
    border: '#444444',
    accent: '#BB86FC'
  }
};

export const typography = {
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36
  },
  
  // Font Weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75
  }
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64
};

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16
  }
};

// 공통 컴포넌트 스타일
export const components = {
  // 헤더 스타일
  header: {
    height: 60,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  
  // 버튼 스타일
  button: {
    primary: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center'
    },
    secondary: {
      backgroundColor: colors.backgroundTertiary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border
    },
    text: {
      primary: {
        color: colors.textInverse,
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold
      },
      secondary: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold
      }
    }
  },
  
  // 카드 스타일
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  
  // 입력 필드 스타일
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary
  }
};

// 반응형 유틸리티
export const responsive = {
  isPhone: (screenWidth) => screenWidth < 768,
  isTablet: (screenWidth) => screenWidth >= 768 && screenWidth < 1024,
  isDesktop: (screenWidth) => screenWidth >= 1024
};

// 테마 생성 함수
export const createTheme = (isDark = false) => {
  if (isDark) {
    return {
      colors: {
        ...colors,
        background: colors.dark.background,
        backgroundSecondary: colors.dark.backgroundSecondary,
        backgroundTertiary: colors.dark.backgroundTertiary,
        textPrimary: colors.dark.textPrimary,
        textSecondary: colors.dark.textSecondary,
        border: colors.dark.border,
        accent: colors.dark.accent
      },
      typography,
      spacing,
      borderRadius,
      shadows,
      components: {
        ...components,
        header: {
          ...components.header,
          backgroundColor: colors.dark.backgroundSecondary,
          borderBottomColor: colors.dark.border
        }
      }
    };
  }
  
  return {
    colors,
    typography,
    spacing,
    borderRadius,
    shadows,
    components
  };
};
