import { Dimensions } from 'react-native';

// 화면 크기 기준점 - 더 세밀한 반응형 지원
const BREAKPOINTS = {
  PHONE_SMALL: 320,      // 작은 폰 (iPhone SE 등)
  PHONE_MEDIUM: 375,     // 중간 폰 (iPhone 12/13 등)
  PHONE_LARGE: 414,      // 큰 폰 (iPhone 14 Pro Max 등)
  PHONE_XLARGE: 480,     // 매우 큰 폰
  TABLET_SMALL: 600,     // 작은 태블릿
  TABLET_MEDIUM: 768,    // 중간 태블릿 (iPad 등)
  TABLET_LARGE: 834,     // 큰 태블릿 (iPad Pro 11" 등)
  TABLET_XLARGE: 1024,   // 매우 큰 태블릿 (iPad Pro 12.9" 등)
  DESKTOP_SMALL: 1280,   // 작은 데스크톱
  DESKTOP_MEDIUM: 1440,  // 중간 데스크톱
  DESKTOP_LARGE: 1920,   // 큰 데스크톱
};

// 현재 화면 정보 가져오기 (확장된 정보)
export const getScreenInfo = () => {
  const { width, height } = Dimensions.get('window');
  const isLandscape = width > height;
  const isPortrait = height > width;
  
  // 기기 타입 세밀하게 구분
  const isPhoneSmall = width < BREAKPOINTS.PHONE_MEDIUM;
  const isPhoneMedium = width >= BREAKPOINTS.PHONE_MEDIUM && width < BREAKPOINTS.PHONE_LARGE;
  const isPhoneLarge = width >= BREAKPOINTS.PHONE_LARGE && width < BREAKPOINTS.PHONE_XLARGE;
  const isPhoneXLarge = width >= BREAKPOINTS.PHONE_XLARGE && width < BREAKPOINTS.TABLET_SMALL;
  
  const isTabletSmall = width >= BREAKPOINTS.TABLET_SMALL && width < BREAKPOINTS.TABLET_MEDIUM;
  const isTabletMedium = width >= BREAKPOINTS.TABLET_MEDIUM && width < BREAKPOINTS.TABLET_LARGE;
  const isTabletLarge = width >= BREAKPOINTS.TABLET_LARGE && width < BREAKPOINTS.TABLET_XLARGE;
  const isTabletXLarge = width >= BREAKPOINTS.TABLET_XLARGE && width < BREAKPOINTS.DESKTOP_SMALL;
  
  const isDesktopSmall = width >= BREAKPOINTS.DESKTOP_SMALL && width < BREAKPOINTS.DESKTOP_MEDIUM;
  const isDesktopMedium = width >= BREAKPOINTS.DESKTOP_MEDIUM && width < BREAKPOINTS.DESKTOP_LARGE;
  const isDesktopLarge = width >= BREAKPOINTS.DESKTOP_LARGE;
  
  // 기존 호환성을 위한 기본 분류
  const isPhone = width < BREAKPOINTS.TABLET_SMALL;
  const isTablet = width >= BREAKPOINTS.TABLET_SMALL && width < BREAKPOINTS.DESKTOP_SMALL;
  const isDesktop = width >= BREAKPOINTS.DESKTOP_SMALL;
  
  return {
    width,
    height,
    isLandscape,
    isPortrait,
    // 기존 호환성
    isPhone,
    isTablet,
    isDesktop,
    // 세밀한 분류
    isPhoneSmall,
    isPhoneMedium,
    isPhoneLarge,
    isPhoneXLarge,
    isTabletSmall,
    isTabletMedium,
    isTabletLarge,
    isTabletXLarge,
    isDesktopSmall,
    isDesktopMedium,
    isDesktopLarge,
  };
};

// 반응형 스타일 생성 헬퍼
export const createResponsiveStyles = (baseStyles, phoneStyles = {}, tabletStyles = {}) => {
  const screenInfo = getScreenInfo();
  
  let responsiveStyles = { ...baseStyles };
  
  if (screenInfo.isPhone) {
    responsiveStyles = { ...responsiveStyles, ...phoneStyles };
  } else if (screenInfo.isTablet) {
    responsiveStyles = { ...responsiveStyles, ...tabletStyles };
  }
  
  return responsiveStyles;
};

// 화면 방향 제한 체크
export const shouldBlockPortrait = (allowPortrait = false) => {
  const { isPortrait, isPhone } = getScreenInfo();
  return isPhone && isPortrait && !allowPortrait;
};

// 세밀한 반응형 배율 계산 (기존 디자인 유지하면서 크기만 조절)
const getResponsiveMultiplier = (screenInfo) => {
  // 폰트 크기 배율
  const fontMultiplier = 
    screenInfo.isPhoneSmall ? 0.75 :
    screenInfo.isPhoneMedium ? 0.8 :
    screenInfo.isPhoneLarge ? 0.85 :
    screenInfo.isPhoneXLarge ? 0.88 :
    screenInfo.isTabletSmall ? 0.9 :
    screenInfo.isTabletMedium ? 0.92 :
    screenInfo.isTabletLarge ? 0.95 :
    screenInfo.isTabletXLarge ? 0.97 :
    screenInfo.isDesktopSmall ? 1.0 :
    screenInfo.isDesktopMedium ? 1.05 :
    1.1; // desktopLarge
  
  // 간격(spacing) 배율
  const spacingMultiplier = 
    screenInfo.isPhoneSmall ? 0.65 :
    screenInfo.isPhoneMedium ? 0.7 :
    screenInfo.isPhoneLarge ? 0.75 :
    screenInfo.isPhoneXLarge ? 0.78 :
    screenInfo.isTabletSmall ? 0.82 :
    screenInfo.isTabletMedium ? 0.85 :
    screenInfo.isTabletLarge ? 0.88 :
    screenInfo.isTabletXLarge ? 0.92 :
    screenInfo.isDesktopSmall ? 1.0 :
    screenInfo.isDesktopMedium ? 1.0 :
    1.0; // desktopLarge
  
  // 크기(size) 배율
  const sizeMultiplier = 
    screenInfo.isPhoneSmall ? 0.7 :
    screenInfo.isPhoneMedium ? 0.75 :
    screenInfo.isPhoneLarge ? 0.8 :
    screenInfo.isPhoneXLarge ? 0.83 :
    screenInfo.isTabletSmall ? 0.86 :
    screenInfo.isTabletMedium ? 0.9 :
    screenInfo.isTabletLarge ? 0.93 :
    screenInfo.isTabletXLarge ? 0.95 :
    screenInfo.isDesktopSmall ? 1.0 :
    screenInfo.isDesktopMedium ? 1.0 :
    1.0; // desktopLarge
  
  return { fontMultiplier, spacingMultiplier, sizeMultiplier };
};

// 반응형 값 계산
export const responsive = {
  // 폰트 크기
  fontSize: (base, customMultipliers = {}) => {
    const screenInfo = getScreenInfo();
    const { fontMultiplier } = getResponsiveMultiplier(screenInfo);
    return Math.round(base * fontMultiplier);
  },
  
  // 패딩/마진
  spacing: (base, customMultipliers = {}) => {
    const screenInfo = getScreenInfo();
    const { spacingMultiplier } = getResponsiveMultiplier(screenInfo);
    return Math.round(base * spacingMultiplier);
  },
  
  // 너비/높이
  size: (base, customMultipliers = {}) => {
    const screenInfo = getScreenInfo();
    const { sizeMultiplier } = getResponsiveMultiplier(screenInfo);
    return Math.round(base * sizeMultiplier);
  },
  
  // 화면 너비 기준 퍼센트
  widthPercent: (percent) => {
    const { width } = getScreenInfo();
    return Math.round(width * (percent / 100));
  },
  
  // 화면 높이 기준 퍼센트
  heightPercent: (percent) => {
    const { height } = getScreenInfo();
    return Math.round(height * (percent / 100));
  },
  
  // 세밀한 값 선택 (모든 화면 크기에 대응)
  getValue: (values) => {
    const screenInfo = getScreenInfo();
    if (screenInfo.isPhoneSmall && values.phoneSmall !== undefined) return values.phoneSmall;
    if (screenInfo.isPhoneMedium && values.phoneMedium !== undefined) return values.phoneMedium;
    if (screenInfo.isPhoneLarge && values.phoneLarge !== undefined) return values.phoneLarge;
    if (screenInfo.isPhoneXLarge && values.phoneXLarge !== undefined) return values.phoneXLarge;
    if (screenInfo.isTabletSmall && values.tabletSmall !== undefined) return values.tabletSmall;
    if (screenInfo.isTabletMedium && values.tabletMedium !== undefined) return values.tabletMedium;
    if (screenInfo.isTabletLarge && values.tabletLarge !== undefined) return values.tabletLarge;
    if (screenInfo.isTabletXLarge && values.tabletXLarge !== undefined) return values.tabletXLarge;
    if (screenInfo.isDesktopSmall && values.desktopSmall !== undefined) return values.desktopSmall;
    if (screenInfo.isDesktopMedium && values.desktopMedium !== undefined) return values.desktopMedium;
    if (screenInfo.isDesktopLarge && values.desktopLarge !== undefined) return values.desktopLarge;
    
    // 폴백: 기본 분류 사용
    if (screenInfo.isPhone && values.phone !== undefined) return values.phone;
    if (screenInfo.isTablet && values.tablet !== undefined) return values.tablet;
    if (screenInfo.isDesktop && values.desktop !== undefined) return values.desktop;
    
    return values.default || values.desktop || values.tablet || values.phone || 0;
  }
};

// 기존 스타일을 유지하면서 반응형 스타일 적용하는 헬퍼 (세밀한 조정)
export const applyResponsiveStyle = (baseStyle, screenInfo = null) => {
  const info = screenInfo || getScreenInfo();
  const { fontMultiplier, spacingMultiplier, sizeMultiplier } = getResponsiveMultiplier(info);
  
  // 스타일 복사
  const responsiveStyle = { ...baseStyle };
  
  // 폰트 크기 조정
  if (responsiveStyle.fontSize) {
    responsiveStyle.fontSize = Math.round(responsiveStyle.fontSize * fontMultiplier);
  }
  
  // 패딩 조정
  if (responsiveStyle.padding) {
    responsiveStyle.padding = Math.round(responsiveStyle.padding * spacingMultiplier);
  }
  if (responsiveStyle.paddingHorizontal) {
    responsiveStyle.paddingHorizontal = Math.round(responsiveStyle.paddingHorizontal * spacingMultiplier);
  }
  if (responsiveStyle.paddingVertical) {
    responsiveStyle.paddingVertical = Math.round(responsiveStyle.paddingVertical * spacingMultiplier);
  }
  if (responsiveStyle.paddingTop) {
    responsiveStyle.paddingTop = Math.round(responsiveStyle.paddingTop * spacingMultiplier);
  }
  if (responsiveStyle.paddingBottom) {
    responsiveStyle.paddingBottom = Math.round(responsiveStyle.paddingBottom * spacingMultiplier);
  }
  if (responsiveStyle.paddingLeft) {
    responsiveStyle.paddingLeft = Math.round(responsiveStyle.paddingLeft * spacingMultiplier);
  }
  if (responsiveStyle.paddingRight) {
    responsiveStyle.paddingRight = Math.round(responsiveStyle.paddingRight * spacingMultiplier);
  }
  
  // 마진 조정
  if (responsiveStyle.margin) {
    responsiveStyle.margin = Math.round(responsiveStyle.margin * spacingMultiplier);
  }
  if (responsiveStyle.marginHorizontal) {
    responsiveStyle.marginHorizontal = Math.round(responsiveStyle.marginHorizontal * spacingMultiplier);
  }
  if (responsiveStyle.marginVertical) {
    responsiveStyle.marginVertical = Math.round(responsiveStyle.marginVertical * spacingMultiplier);
  }
  if (responsiveStyle.marginTop) {
    responsiveStyle.marginTop = Math.round(responsiveStyle.marginTop * spacingMultiplier);
  }
  if (responsiveStyle.marginBottom) {
    responsiveStyle.marginBottom = Math.round(responsiveStyle.marginBottom * spacingMultiplier);
  }
  if (responsiveStyle.marginLeft) {
    responsiveStyle.marginLeft = Math.round(responsiveStyle.marginLeft * spacingMultiplier);
  }
  if (responsiveStyle.marginRight) {
    responsiveStyle.marginRight = Math.round(responsiveStyle.marginRight * spacingMultiplier);
  }
  
  // 크기 조정
  if (responsiveStyle.width && typeof responsiveStyle.width === 'number') {
    responsiveStyle.width = Math.round(responsiveStyle.width * sizeMultiplier);
  }
  if (responsiveStyle.height && typeof responsiveStyle.height === 'number') {
    responsiveStyle.height = Math.round(responsiveStyle.height * sizeMultiplier);
  }
  if (responsiveStyle.minWidth && typeof responsiveStyle.minWidth === 'number') {
    responsiveStyle.minWidth = Math.round(responsiveStyle.minWidth * sizeMultiplier);
  }
  if (responsiveStyle.minHeight && typeof responsiveStyle.minHeight === 'number') {
    responsiveStyle.minHeight = Math.round(responsiveStyle.minHeight * sizeMultiplier);
  }
  if (responsiveStyle.maxWidth && typeof responsiveStyle.maxWidth === 'number') {
    responsiveStyle.maxWidth = Math.round(responsiveStyle.maxWidth * sizeMultiplier);
  }
  if (responsiveStyle.maxHeight && typeof responsiveStyle.maxHeight === 'number') {
    responsiveStyle.maxHeight = Math.round(responsiveStyle.maxHeight * sizeMultiplier);
  }
  
  // 간격(gap) 조정
  if (responsiveStyle.gap) {
    responsiveStyle.gap = Math.round(responsiveStyle.gap * spacingMultiplier);
  }
  if (responsiveStyle.rowGap) {
    responsiveStyle.rowGap = Math.round(responsiveStyle.rowGap * spacingMultiplier);
  }
  if (responsiveStyle.columnGap) {
    responsiveStyle.columnGap = Math.round(responsiveStyle.columnGap * spacingMultiplier);
  }
  
  // 보더 반경 조정
  if (responsiveStyle.borderRadius && typeof responsiveStyle.borderRadius === 'number') {
    responsiveStyle.borderRadius = Math.round(responsiveStyle.borderRadius * sizeMultiplier);
  }
  if (responsiveStyle.borderTopLeftRadius) {
    responsiveStyle.borderTopLeftRadius = Math.round(responsiveStyle.borderTopLeftRadius * sizeMultiplier);
  }
  if (responsiveStyle.borderTopRightRadius) {
    responsiveStyle.borderTopRightRadius = Math.round(responsiveStyle.borderTopRightRadius * sizeMultiplier);
  }
  if (responsiveStyle.borderBottomLeftRadius) {
    responsiveStyle.borderBottomLeftRadius = Math.round(responsiveStyle.borderBottomLeftRadius * sizeMultiplier);
  }
  if (responsiveStyle.borderBottomRightRadius) {
    responsiveStyle.borderBottomRightRadius = Math.round(responsiveStyle.borderBottomRightRadius * sizeMultiplier);
  }
  
  // 라인 높이 조정 (숫자인 경우만)
  if (responsiveStyle.lineHeight && typeof responsiveStyle.lineHeight === 'number') {
    responsiveStyle.lineHeight = Math.round(responsiveStyle.lineHeight * fontMultiplier);
  }
  
  return responsiveStyle;
};

// 여러 스타일을 한번에 반응형으로 변환
export const createResponsiveStyleSheet = (styles) => {
  const screenInfo = getScreenInfo();
  const responsiveStyles = {};
  
  Object.keys(styles).forEach(key => {
    responsiveStyles[key] = applyResponsiveStyle(styles[key], screenInfo);
  });
  
  return responsiveStyles;
};

// 간편한 반응형 스타일 적용 헬퍼 (기존 스타일시트에 쉽게 적용)
export const r = {
  // 폰트 크기
  f: (size) => responsive.fontSize(size),
  // 간격 (spacing)
  s: (size) => responsive.spacing(size),
  // 크기 (width, height 등)
  z: (size) => responsive.size(size),
  // 화면 너비 퍼센트
  wp: (percent) => responsive.widthPercent(percent),
  // 화면 높이 퍼센트
  hp: (percent) => responsive.heightPercent(percent),
  // 값 선택
  v: (values) => responsive.getValue(values)
};

export default {
  getScreenInfo,
  createResponsiveStyles,
  shouldBlockPortrait,
  responsive,
  BREAKPOINTS,
  applyResponsiveStyle,
  createResponsiveStyleSheet,
  r
};
