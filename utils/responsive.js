import { Dimensions } from 'react-native';

// 화면 크기 기준점
const BREAKPOINTS = {
  PHONE_WIDTH: 480,
  TABLET_WIDTH: 768,
  DESKTOP_WIDTH: 1024,
};

// 현재 화면 정보 가져오기
export const getScreenInfo = () => {
  const { width, height } = Dimensions.get('window');
  const isLandscape = width > height;
  const isPortrait = height > width;
  
  return {
    width,
    height,
    isLandscape,
    isPortrait,
    isPhone: width < BREAKPOINTS.PHONE_WIDTH,
    isTablet: width >= BREAKPOINTS.PHONE_WIDTH && width < BREAKPOINTS.DESKTOP_WIDTH,
    isDesktop: width >= BREAKPOINTS.DESKTOP_WIDTH,
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

// 반응형 값 계산
export const responsive = {
  // 폰트 크기
  fontSize: (base, phoneMultiplier = 0.8, tabletMultiplier = 0.9) => {
    const { isPhone, isTablet } = getScreenInfo();
    if (isPhone) return Math.round(base * phoneMultiplier);
    if (isTablet) return Math.round(base * tabletMultiplier);
    return base;
  },
  
  // 패딩/마진
  spacing: (base, phoneMultiplier = 0.7, tabletMultiplier = 0.85) => {
    const { isPhone, isTablet } = getScreenInfo();
    if (isPhone) return Math.round(base * phoneMultiplier);
    if (isTablet) return Math.round(base * tabletMultiplier);
    return base;
  },
  
  // 너비/높이
  size: (base, phoneMultiplier = 0.8, tabletMultiplier = 0.9) => {
    const { isPhone, isTablet } = getScreenInfo();
    if (isPhone) return Math.round(base * phoneMultiplier);
    if (isTablet) return Math.round(base * tabletMultiplier);
    return base;
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
  }
};

export default {
  getScreenInfo,
  createResponsiveStyles,
  shouldBlockPortrait,
  responsive,
  BREAKPOINTS
};
