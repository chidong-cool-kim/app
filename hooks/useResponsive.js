import { useContext } from 'react';
import { ResponsiveContext } from '../App';

/**
 * 반응형 스타일을 사용하기 위한 Hook
 * App.js에서 제공하는 ResponsiveContext를 사용합니다.
 * 
 * @returns {Object} responsive - 반응형 유틸리티 객체
 * 
 * @example
 * function MyComponent() {
 *   const responsive = useResponsive();
 *   
 *   const myStyle = responsive.apply({
 *     padding: 20,
 *     fontSize: 16
 *   });
 *   
 *   return <View style={myStyle}>...</View>;
 * }
 */
export function useResponsive() {
  const responsive = useContext(ResponsiveContext);
  
  if (!responsive) {
    console.warn('useResponsive must be used within ResponsiveContext.Provider');
    // Fallback: 기본 반응형 객체 반환
    return {
      spacing: (size) => size,
      fontSize: (size) => size,
      apply: (style) => style,
      applyAll: (styles) => styles,
      scale: (value) => value,
      components: () => ({}),
      deviceType: 'phone',
      isPhone: true,
      isTablet: false,
      isDesktop: false
    };
  }
  
  return responsive;
}
