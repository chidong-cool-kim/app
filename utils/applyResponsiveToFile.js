/**
 * 기존 컴포넌트 파일에 반응형을 자동으로 적용하는 유틸리티
 * 
 * 사용법:
 * 1. 파일 상단에 import 추가
 * 2. 컴포넌트 내부에서 useResponsive() 호출
 * 3. StyleSheet.create의 결과를 responsive.applyAll()로 감싸기
 */

export const RESPONSIVE_IMPORT = `import { useResponsive } from './hooks/useResponsive';`;

export const USE_RESPONSIVE_HOOK = `  const responsive = useResponsive();`;

/**
 * 기존 스타일을 반응형으로 변환하는 예제
 */
export const EXAMPLE_BEFORE = `
const styles = StyleSheet.create({
  container: {
    padding: 20,
    margin: 10
  },
  text: {
    fontSize: 16
  }
});

return <View style={styles.container}>...</View>;
`;

export const EXAMPLE_AFTER = `
const baseStyles = StyleSheet.create({
  container: {
    padding: 20,
    margin: 10
  },
  text: {
    fontSize: 16
  }
});

const styles = responsive.applyAll(baseStyles);

return <View style={styles.container}>...</View>;
`;

/**
 * 파일에 반응형을 적용하는 방법 안내
 */
export function getInstructions() {
  return `
# 반응형 적용 가이드

## 1단계: Import 추가
파일 상단에 다음을 추가:
${RESPONSIVE_IMPORT}

## 2단계: Hook 사용
컴포넌트 함수 내부 상단에 추가:
${USE_RESPONSIVE_HOOK}

## 3단계: 스타일 변환
기존:
const styles = StyleSheet.create({ ... });

변경:
const baseStyles = StyleSheet.create({ ... });
const styles = responsive.applyAll(baseStyles);

또는 useMemo 사용 (권장):
const styles = useMemo(() => 
  responsive.applyAll(baseStyles), 
  [responsive]
);

## 4단계: 개별 스타일 적용 (선택사항)
특정 스타일만 반응형으로:
<View style={responsive.apply(styles.container)}>

## 완성!
이제 화면 크기에 따라 자동으로 조정됩니다.
  `;
}
