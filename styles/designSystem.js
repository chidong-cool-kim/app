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
  isDesktop: (screenWidth) => screenWidth >= 1024,
  
  // 반응형 값 계산 헬퍼
  getValue: (phoneValue, tabletValue, desktopValue, screenWidth) => {
    if (screenWidth < 768) return phoneValue;
    if (screenWidth >= 768 && screenWidth < 1024) return tabletValue;
    return desktopValue;
  }
};

// 반응형 스타일 생성 함수
export const createResponsiveStyle = (baseStyle, phoneStyle = {}, tabletStyle = {}) => {
  return {
    base: baseStyle,
    phone: { ...baseStyle, ...phoneStyle },
    tablet: { ...baseStyle, ...tabletStyle }
  };
};

// 반응형 간격 (spacing) - 세밀한 화면 크기 대응
export const responsiveSpacing = {
  // 기존 호환성 유지
  xs: { phone: 3, tablet: 3, desktop: 4 },
  sm: { phone: 6, tablet: 7, desktop: 8 },
  md: { phone: 8, tablet: 10, desktop: 12 },
  lg: { phone: 11, tablet: 14, desktop: 16 },
  xl: { phone: 14, tablet: 17, desktop: 20 },
  '2xl': { phone: 17, tablet: 20, desktop: 24 },
  '3xl': { phone: 22, tablet: 27, desktop: 32 },
  '4xl': { phone: 28, tablet: 34, desktop: 40 },
  '5xl': { phone: 34, tablet: 41, desktop: 48 },
  '6xl': { phone: 45, tablet: 54, desktop: 64 }
};

// 세밀한 반응형 간격 (모든 화면 크기 대응)
export const detailedResponsiveSpacing = {
  xs: { 
    phoneSmall: 2.6, phoneMedium: 2.8, phoneLarge: 3, phoneXLarge: 3.1,
    tabletSmall: 3.3, tabletMedium: 3.4, tabletLarge: 3.6, tabletXLarge: 3.8,
    desktopSmall: 4, desktopMedium: 4, desktopLarge: 4
  },
  sm: { 
    phoneSmall: 5.2, phoneMedium: 5.6, phoneLarge: 6, phoneXLarge: 6.2,
    tabletSmall: 6.6, tabletMedium: 6.8, tabletLarge: 7.2, tabletXLarge: 7.4,
    desktopSmall: 8, desktopMedium: 8, desktopLarge: 8
  },
  md: { 
    phoneSmall: 7.8, phoneMedium: 8.4, phoneLarge: 9, phoneXLarge: 9.4,
    tabletSmall: 9.8, tabletMedium: 10.2, tabletLarge: 10.6, tabletXLarge: 11,
    desktopSmall: 12, desktopMedium: 12, desktopLarge: 12
  },
  lg: { 
    phoneSmall: 10.4, phoneMedium: 11.2, phoneLarge: 12, phoneXLarge: 12.5,
    tabletSmall: 13.1, tabletMedium: 13.6, tabletLarge: 14.1, tabletXLarge: 14.7,
    desktopSmall: 16, desktopMedium: 16, desktopLarge: 16
  },
  xl: { 
    phoneSmall: 13, phoneMedium: 14, phoneLarge: 15, phoneXLarge: 15.6,
    tabletSmall: 16.4, tabletMedium: 17, tabletLarge: 17.6, tabletXLarge: 18.4,
    desktopSmall: 20, desktopMedium: 20, desktopLarge: 20
  },
  '2xl': { 
    phoneSmall: 15.6, phoneMedium: 16.8, phoneLarge: 18, phoneXLarge: 18.7,
    tabletSmall: 19.7, tabletMedium: 20.4, tabletLarge: 21.1, tabletXLarge: 22,
    desktopSmall: 24, desktopMedium: 24, desktopLarge: 24
  },
  '3xl': { 
    phoneSmall: 20.8, phoneMedium: 22.4, phoneLarge: 24, phoneXLarge: 25,
    tabletSmall: 26.2, tabletMedium: 27.2, tabletLarge: 28.2, tabletXLarge: 29.4,
    desktopSmall: 32, desktopMedium: 32, desktopLarge: 32
  },
  '4xl': { 
    phoneSmall: 26, phoneMedium: 28, phoneLarge: 30, phoneXLarge: 31.2,
    tabletSmall: 32.8, tabletMedium: 34, tabletLarge: 35.2, tabletXLarge: 36.8,
    desktopSmall: 40, desktopMedium: 40, desktopLarge: 40
  },
  '5xl': { 
    phoneSmall: 31.2, phoneMedium: 33.6, phoneLarge: 36, phoneXLarge: 37.4,
    tabletSmall: 39.4, tabletMedium: 40.8, tabletLarge: 42.2, tabletXLarge: 44.2,
    desktopSmall: 48, desktopMedium: 48, desktopLarge: 48
  },
  '6xl': { 
    phoneSmall: 41.6, phoneMedium: 44.8, phoneLarge: 48, phoneXLarge: 49.9,
    tabletSmall: 52.5, tabletMedium: 54.4, tabletLarge: 56.3, tabletXLarge: 58.9,
    desktopSmall: 64, desktopMedium: 64, desktopLarge: 64
  }
};

// 반응형 폰트 크기 - Galaxy S20 5G 기준으로 통일
export const responsiveFontSize = {
  xs: { phone: 12, tablet: 11, desktop: 12 },
  sm: { phone: 14, tablet: 13, desktop: 14 },
  base: { phone: 16, tablet: 15, desktop: 16 },
  lg: { phone: 18, tablet: 16, desktop: 18 },
  xl: { phone: 20, tablet: 18, desktop: 20 },
  '2xl': { phone: 20, tablet: 22, desktop: 24 },
  '3xl': { phone: 25, tablet: 27, desktop: 30 },
  '4xl': { phone: 30, tablet: 33, desktop: 36 }
};

// 세밀한 반응형 폰트 크기 - Galaxy S20 5G 기준으로 통일 (모든 폰에서 동일)
export const detailedResponsiveFontSize = {
  xs: { 
    phoneSmall: 12, phoneMedium: 12, phoneLarge: 12, phoneXLarge: 12,
    tabletSmall: 10.8, tabletMedium: 11, tabletLarge: 11.4, tabletXLarge: 11.6,
    desktopSmall: 12, desktopMedium: 12.6, desktopLarge: 13.2
  },
  sm: { 
    phoneSmall: 14, phoneMedium: 14, phoneLarge: 14, phoneXLarge: 14,
    tabletSmall: 12.6, tabletMedium: 12.9, tabletLarge: 13.3, tabletXLarge: 13.6,
    desktopSmall: 14, desktopMedium: 14.7, desktopLarge: 15.4
  },
  base: { 
    phoneSmall: 16, phoneMedium: 16, phoneLarge: 16, phoneXLarge: 16,
    tabletSmall: 14.4, tabletMedium: 14.7, tabletLarge: 15.2, tabletXLarge: 15.5,
    desktopSmall: 16, desktopMedium: 16.8, desktopLarge: 17.6
  },
  lg: { 
    phoneSmall: 18, phoneMedium: 18, phoneLarge: 18, phoneXLarge: 18,
    tabletSmall: 16.2, tabletMedium: 16.6, tabletLarge: 17.1, tabletXLarge: 17.5,
    desktopSmall: 18, desktopMedium: 18.9, desktopLarge: 19.8
  },
  xl: { 
    phoneSmall: 20, phoneMedium: 20, phoneLarge: 20, phoneXLarge: 20,
    tabletSmall: 18, tabletMedium: 18.4, tabletLarge: 19, tabletXLarge: 19.4,
    desktopSmall: 20, desktopMedium: 21, desktopLarge: 22
  },
  '2xl': { 
    phoneSmall: 24, phoneMedium: 24, phoneLarge: 24, phoneXLarge: 24,
    tabletSmall: 21.6, tabletMedium: 22.1, tabletLarge: 22.8, tabletXLarge: 23.3,
    desktopSmall: 24, desktopMedium: 25.2, desktopLarge: 26.4
  },
  '3xl': { 
    phoneSmall: 30, phoneMedium: 30, phoneLarge: 30, phoneXLarge: 30,
    tabletSmall: 27, tabletMedium: 27.6, tabletLarge: 28.5, tabletXLarge: 29.1,
    desktopSmall: 30, desktopMedium: 31.5, desktopLarge: 33
  },
  '4xl': { 
    phoneSmall: 36, phoneMedium: 36, phoneLarge: 36, phoneXLarge: 36,
    tabletSmall: 32.4, tabletMedium: 33.1, tabletLarge: 34.2, tabletXLarge: 34.9,
    desktopSmall: 36, desktopMedium: 37.8, desktopLarge: 39.6
  }
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

// ============================================================================
// 반응형 자동 처리 시스템 (기존 CSS 건드리지 않고 사용)
// ============================================================================

// 화면 크기 브레이크포인트
export const breakpoints = {
  phoneSmall: 320,    // iPhone SE
  phoneMedium: 375,   // iPhone 12/13
  phoneLarge: 414,    // iPhone 12 Pro Max
  phoneXLarge: 480,   // 큰 폰
  tabletSmall: 600,   // 작은 태블릿
  tabletMedium: 768,  // iPad
  tabletLarge: 900,   // 큰 태블릿
  tabletXLarge: 1024, // iPad Pro
  desktopSmall: 1280,
  desktopMedium: 1440,
  desktopLarge: 1920
};

// 현재 화면 크기 카테고리 감지
export const getDeviceType = (width) => {
  if (width < breakpoints.tabletSmall) return 'phone';
  if (width < breakpoints.tabletXLarge) return 'tablet';
  return 'desktop';
};

// 정확한 화면 크기 카테고리 감지 (세밀한 제어용)
export const getDetailedDeviceType = (width) => {
  if (width < breakpoints.phoneMedium) return 'phoneSmall';
  if (width < breakpoints.phoneLarge) return 'phoneMedium';
  if (width < breakpoints.phoneXLarge) return 'phoneLarge';
  if (width < breakpoints.tabletSmall) return 'phoneXLarge';
  if (width < breakpoints.tabletMedium) return 'tabletSmall';
  if (width < breakpoints.tabletLarge) return 'tabletMedium';
  if (width < breakpoints.tabletXLarge) return 'tabletLarge';
  if (width < breakpoints.desktopSmall) return 'tabletXLarge';
  if (width < breakpoints.desktopMedium) return 'desktopSmall';
  if (width < breakpoints.desktopLarge) return 'desktopMedium';
  return 'desktopLarge';
};

// 반응형 간격 자동 계산 (기존 스타일 건드리지 않고 사용)
export const getResponsiveSpacing = (size, screenWidth) => {
  const deviceType = getDeviceType(screenWidth);
  return responsiveSpacing[size]?.[deviceType] || spacing[size] || size;
};

// 세밀한 반응형 간격 자동 계산
export const getDetailedResponsiveSpacing = (size, screenWidth) => {
  const deviceType = getDetailedDeviceType(screenWidth);
  return detailedResponsiveSpacing[size]?.[deviceType] || spacing[size] || size;
};

// 반응형 폰트 크기 자동 계산
export const getResponsiveFontSize = (size, screenWidth) => {
  const deviceType = getDeviceType(screenWidth);
  return responsiveFontSize[size]?.[deviceType] || typography.fontSize[size] || size;
};

// 세밀한 반응형 폰트 크기 자동 계산
export const getDetailedResponsiveFontSize = (size, screenWidth) => {
  const deviceType = getDetailedDeviceType(screenWidth);
  return detailedResponsiveFontSize[size]?.[deviceType] || typography.fontSize[size] || size;
};

// 반응형 스타일 자동 적용 (기존 스타일 객체를 반응형으로 변환)
export const applyResponsive = (styleObj, screenWidth, options = {}) => {
  const { detailed = false } = options;
  const getSpacing = detailed ? getDetailedResponsiveSpacing : getResponsiveSpacing;
  const getFontSize = detailed ? getDetailedResponsiveFontSize : getResponsiveFontSize;
  
  const result = { ...styleObj };
  
  // 간격 관련 속성들 자동 변환
  const spacingProps = [
    'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'paddingHorizontal', 'paddingVertical',
    'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'marginHorizontal', 'marginVertical',
    'gap', 'rowGap', 'columnGap',
    'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight'
  ];
  
  spacingProps.forEach(prop => {
    if (styleObj[prop] !== undefined) {
      const value = styleObj[prop];
      // spacing 객체의 키인지 확인
      if (typeof value === 'string' && spacing[value] !== undefined) {
        result[prop] = getSpacing(value, screenWidth);
      } else if (typeof value === 'number') {
        // 숫자 값은 화면 크기에 비례하여 조정
        const scale = screenWidth < breakpoints.tabletSmall ? 0.85 : 
                     screenWidth < breakpoints.tabletXLarge ? 1.0 : 1.15;
        result[prop] = Math.round(value * scale);
      }
    }
  });
  
  // 폰트 크기 자동 변환
  if (styleObj.fontSize !== undefined) {
    const value = styleObj.fontSize;
    if (typeof value === 'string' && typography.fontSize[value] !== undefined) {
      result.fontSize = getFontSize(value, screenWidth);
    } else if (typeof value === 'number') {
      const scale = screenWidth < breakpoints.tabletSmall ? 0.9 : 
                   screenWidth < breakpoints.tabletXLarge ? 1.0 : 1.1;
      result.fontSize = Math.round(value * scale);
    }
  }
  
  // borderRadius 자동 변환
  if (styleObj.borderRadius !== undefined) {
    const value = styleObj.borderRadius;
    if (typeof value === 'string' && borderRadius[value] !== undefined) {
      const scale = screenWidth < breakpoints.tabletSmall ? 0.9 : 
                   screenWidth < breakpoints.tabletXLarge ? 1.0 : 1.1;
      result.borderRadius = Math.round(borderRadius[value] * scale);
    } else if (typeof value === 'number' && value !== 9999) {
      const scale = screenWidth < breakpoints.tabletSmall ? 0.9 : 
                   screenWidth < breakpoints.tabletXLarge ? 1.0 : 1.1;
      result.borderRadius = Math.round(value * scale);
    }
  }
  
  return result;
};

// 여러 스타일 객체를 반응형으로 변환 (배열 또는 객체)
export const applyResponsiveToStyles = (styles, screenWidth, options = {}) => {
  if (Array.isArray(styles)) {
    return styles.map(style => 
      typeof style === 'object' && style !== null 
        ? applyResponsive(style, screenWidth, options)
        : style
    );
  }
  
  if (typeof styles === 'object' && styles !== null) {
    const result = {};
    Object.keys(styles).forEach(key => {
      if (typeof styles[key] === 'object' && styles[key] !== null) {
        result[key] = applyResponsive(styles[key], screenWidth, options);
      } else {
        result[key] = styles[key];
      }
    });
    return result;
  }
  
  return styles;
};

// 반응형 값 직접 계산 (커스텀 값용)
export const scaleValue = (value, screenWidth, options = {}) => {
  const { min = 0.7, max = 1.3, phoneScale = 0.85, tabletScale = 1.0, desktopScale = 1.15 } = options;
  
  let scale;
  if (screenWidth < breakpoints.tabletSmall) {
    scale = phoneScale;
  } else if (screenWidth < breakpoints.tabletXLarge) {
    scale = tabletScale;
  } else {
    scale = desktopScale;
  }
  
  // min, max 범위 제한
  scale = Math.max(min, Math.min(max, scale));
  
  return Math.round(value * scale);
};

// 반응형 컴포넌트 스타일 생성 (기존 components 객체 기반)
export const getResponsiveComponents = (screenWidth) => {
  return applyResponsiveToStyles(components, screenWidth, { detailed: true });
};

// Hook처럼 사용할 수 있는 반응형 스타일 생성기
export const useResponsiveStyle = (screenWidth, options = {}) => {
  return {
    // 간격 가져오기
    spacing: (size) => getResponsiveSpacing(size, screenWidth),
    spacingDetailed: (size) => getDetailedResponsiveSpacing(size, screenWidth),
    
    // 폰트 크기 가져오기
    fontSize: (size) => getResponsiveFontSize(size, screenWidth),
    fontSizeDetailed: (size) => getDetailedResponsiveFontSize(size, screenWidth),
    
    // 스타일 객체 변환
    apply: (styleObj) => applyResponsive(styleObj, screenWidth, options),
    applyAll: (styles) => applyResponsiveToStyles(styles, screenWidth, options),
    
    // 값 스케일링
    scale: (value, customOptions = {}) => scaleValue(value, screenWidth, { ...options, ...customOptions }),
    
    // 컴포넌트 스타일 가져오기
    components: () => getResponsiveComponents(screenWidth),
    
    // 디바이스 타입
    deviceType: getDeviceType(screenWidth),
    detailedDeviceType: getDetailedDeviceType(screenWidth),
    
    // 브레이크포인트 체크
    isPhone: screenWidth < breakpoints.tabletSmall,
    isTablet: screenWidth >= breakpoints.tabletSmall && screenWidth < breakpoints.tabletXLarge,
    isDesktop: screenWidth >= breakpoints.tabletXLarge
  };
};

// 반응형 Grid/Flex 레이아웃 헬퍼
export const getResponsiveLayout = (screenWidth) => {
  const isPhone = screenWidth < breakpoints.tabletSmall;
  const isTablet = screenWidth >= breakpoints.tabletSmall && screenWidth < breakpoints.tabletXLarge;
  
  return {
    // 컬럼 개수
    columns: isPhone ? 1 : isTablet ? 2 : 3,
    columnsMax: isPhone ? 2 : isTablet ? 3 : 4,
    
    // 방향
    flexDirection: isPhone ? 'column' : 'row',
    
    // 간격
    gap: getResponsiveSpacing(isPhone ? 'md' : isTablet ? 'lg' : 'xl', screenWidth),
    
    // 컨테이너 패딩
    containerPadding: getResponsiveSpacing(isPhone ? 'md' : isTablet ? 'lg' : '2xl', screenWidth),
    
    // 카드 너비 (Grid용)
    cardWidth: isPhone ? '100%' : isTablet ? '48%' : '32%',
    
    // 최대 너비
    maxWidth: isPhone ? '100%' : isTablet ? 720 : 1200
  };
};
