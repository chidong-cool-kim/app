# 반응형 디자인 시스템 사용 가이드

## 📱 개요
기존 CSS를 **전혀 건드리지 않고** 화면 크기에 따라 자동으로 간격과 크기를 조절하는 반응형 시스템입니다.

---

## 🚀 빠른 시작

### 1. 기본 사용법 (가장 간단)

```javascript
import { useResponsiveStyle } from './styles/designSystem';
import { Dimensions } from 'react-native';

function MyComponent() {
  const screenWidth = Dimensions.get('window').width;
  const responsive = useResponsiveStyle(screenWidth);
  
  // 기존 스타일을 반응형으로 자동 변환
  const myStyle = {
    padding: 20,
    fontSize: 16,
    marginTop: 10
  };
  
  return (
    <View style={responsive.apply(myStyle)}>
      <Text>자동으로 반응형 적용!</Text>
    </View>
  );
}
```

### 2. 여러 스타일 객체 한번에 변환

```javascript
const styles = StyleSheet.create({
  container: {
    padding: 20,
    margin: 10
  },
  text: {
    fontSize: 16,
    marginBottom: 8
  },
  card: {
    padding: 16,
    borderRadius: 12
  }
});

// 모든 스타일을 반응형으로 변환
const responsiveStyles = responsive.applyAll(styles);

<View style={responsiveStyles.container}>
  <Text style={responsiveStyles.text}>반응형 텍스트</Text>
</View>
```

---

## 💡 주요 기능

### 1. `useResponsiveStyle` - 올인원 헬퍼

```javascript
const responsive = useResponsiveStyle(screenWidth);

// 간격 가져오기
responsive.spacing('lg')           // 'lg' 간격을 화면 크기에 맞게
responsive.spacingDetailed('xl')   // 더 세밀한 조정

// 폰트 크기 가져오기
responsive.fontSize('base')        // 기본 폰트 크기를 화면에 맞게
responsive.fontSizeDetailed('2xl') // 더 세밀한 조정

// 스타일 변환
responsive.apply(styleObject)      // 단일 스타일 객체
responsive.applyAll(styles)        // 여러 스타일 객체

// 커스텀 값 스케일링
responsive.scale(100)              // 100을 화면 크기에 맞게 조정

// 디바이스 타입 확인
responsive.isPhone                 // true/false
responsive.isTablet                // true/false
responsive.isDesktop               // true/false
responsive.deviceType              // 'phone', 'tablet', 'desktop'

// 컴포넌트 스타일 가져오기
responsive.components()            // 반응형 적용된 모든 컴포넌트 스타일
```

### 2. 개별 함수 사용

```javascript
import { 
  getResponsiveSpacing,
  getResponsiveFontSize,
  applyResponsive,
  getDeviceType 
} from './styles/designSystem';

// 간격 계산
const padding = getResponsiveSpacing('lg', screenWidth);

// 폰트 크기 계산
const fontSize = getResponsiveFontSize('base', screenWidth);

// 스타일 변환
const responsiveStyle = applyResponsive(myStyle, screenWidth);

// 디바이스 타입
const deviceType = getDeviceType(screenWidth); // 'phone', 'tablet', 'desktop'
```

### 3. 레이아웃 헬퍼

```javascript
import { getResponsiveLayout } from './styles/designSystem';

const layout = getResponsiveLayout(screenWidth);

<View style={{
  flexDirection: layout.flexDirection,  // phone: 'column', tablet/desktop: 'row'
  gap: layout.gap,                      // 자동 조정된 간격
  padding: layout.containerPadding,     // 컨테이너 패딩
  maxWidth: layout.maxWidth             // 최대 너비
}}>
  {/* 컬럼 개수: layout.columns (1, 2, 3) */}
</View>
```

---

## 📐 브레이크포인트

```javascript
import { breakpoints } from './styles/designSystem';

// 사용 가능한 브레이크포인트
breakpoints.phoneSmall    // 320px  - iPhone SE
breakpoints.phoneMedium   // 375px  - iPhone 12/13
breakpoints.phoneLarge    // 414px  - iPhone 12 Pro Max
breakpoints.phoneXLarge   // 480px  - 큰 폰
breakpoints.tabletSmall   // 600px  - 작은 태블릿
breakpoints.tabletMedium  // 768px  - iPad
breakpoints.tabletLarge   // 900px  - 큰 태블릿
breakpoints.tabletXLarge  // 1024px - iPad Pro
breakpoints.desktopSmall  // 1280px
breakpoints.desktopMedium // 1440px
breakpoints.desktopLarge  // 1920px
```

---

## 🎯 실전 예제

### 예제 1: 기존 컴포넌트에 반응형 추가

```javascript
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useResponsiveStyle } from './styles/designSystem';

function ProfileCard() {
  const screenWidth = Dimensions.get('window').width;
  const responsive = useResponsiveStyle(screenWidth);
  
  // 기존 스타일 (건드리지 않음)
  const styles = StyleSheet.create({
    card: {
      padding: 20,
      margin: 16,
      borderRadius: 12,
      backgroundColor: '#fff'
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8
    },
    description: {
      fontSize: 14,
      color: '#666'
    }
  });
  
  // 반응형 적용
  const responsiveStyles = responsive.applyAll(styles);
  
  return (
    <View style={responsiveStyles.card}>
      <Text style={responsiveStyles.title}>프로필</Text>
      <Text style={responsiveStyles.description}>설명 텍스트</Text>
    </View>
  );
}
```

### 예제 2: 조건부 레이아웃

```javascript
function Dashboard() {
  const screenWidth = Dimensions.get('window').width;
  const responsive = useResponsiveStyle(screenWidth);
  const layout = getResponsiveLayout(screenWidth);
  
  return (
    <View style={{
      flexDirection: layout.flexDirection,
      gap: layout.gap,
      padding: layout.containerPadding
    }}>
      {responsive.isPhone && (
        <Text>모바일 전용 콘텐츠</Text>
      )}
      
      {responsive.isTablet && (
        <Text>태블릿 전용 콘텐츠</Text>
      )}
      
      {responsive.isDesktop && (
        <Text>데스크톱 전용 콘텐츠</Text>
      )}
    </View>
  );
}
```

### 예제 3: 커스텀 스케일링

```javascript
function CustomComponent() {
  const screenWidth = Dimensions.get('window').width;
  const responsive = useResponsiveStyle(screenWidth);
  
  // 커스텀 스케일 옵션
  const iconSize = responsive.scale(48, {
    phoneScale: 0.7,   // 폰: 70%
    tabletScale: 1.0,  // 태블릿: 100%
    desktopScale: 1.3, // 데스크톱: 130%
    min: 0.5,          // 최소 50%
    max: 1.5           // 최대 150%
  });
  
  return (
    <View style={{
      width: iconSize,
      height: iconSize
    }}>
      <Icon size={iconSize} />
    </View>
  );
}
```

### 예제 4: 반응형 Grid

```javascript
function ProductGrid({ products }) {
  const screenWidth = Dimensions.get('window').width;
  const layout = getResponsiveLayout(screenWidth);
  
  return (
    <View style={{
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: layout.gap,
      padding: layout.containerPadding
    }}>
      {products.map(product => (
        <View 
          key={product.id}
          style={{
            width: layout.cardWidth,  // phone: 100%, tablet: 48%, desktop: 32%
            marginBottom: layout.gap
          }}
        >
          <ProductCard product={product} />
        </View>
      ))}
    </View>
  );
}
```

### 예제 5: 전체 앱에 적용

```javascript
// App.js 또는 최상위 컴포넌트
import React, { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { useResponsiveStyle } from './styles/designSystem';

function App() {
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    
    return () => subscription?.remove();
  }, []);
  
  const responsive = useResponsiveStyle(screenWidth);
  
  return (
    <ResponsiveContext.Provider value={responsive}>
      <YourApp />
    </ResponsiveContext.Provider>
  );
}

// 다른 컴포넌트에서 사용
function SomeComponent() {
  const responsive = useContext(ResponsiveContext);
  
  const myStyle = responsive.apply({
    padding: 20,
    fontSize: 16
  });
  
  return <View style={myStyle}>...</View>;
}
```

---

## 🎨 스타일 변환 규칙

### 자동 변환되는 속성들

#### 간격 속성 (85% → 100% → 115%)
- `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`
- `paddingHorizontal`, `paddingVertical`
- `margin`, `marginTop`, `marginRight`, `marginBottom`, `marginLeft`
- `marginHorizontal`, `marginVertical`
- `gap`, `rowGap`, `columnGap`
- `width`, `height`, `minWidth`, `minHeight`, `maxWidth`, `maxHeight`

#### 폰트 크기 (90% → 100% → 110%)
- `fontSize`

#### 테두리 반경 (90% → 100% → 110%)
- `borderRadius`

### 변환 비율

| 화면 크기 | 간격 | 폰트 | 테두리 |
|----------|------|------|--------|
| Phone (<600px) | 85% | 90% | 90% |
| Tablet (600-1024px) | 100% | 100% | 100% |
| Desktop (>1024px) | 115% | 110% | 110% |

---

## ⚙️ 고급 옵션

### 세밀한 반응형 (11단계 브레이크포인트)

```javascript
// 기본 (3단계: phone, tablet, desktop)
const responsive = useResponsiveStyle(screenWidth);

// 세밀한 조정 (11단계)
const responsive = useResponsiveStyle(screenWidth, { detailed: true });

// 세밀한 간격
responsive.spacingDetailed('lg');

// 세밀한 폰트
responsive.fontSizeDetailed('base');
```

### 디바이스 타입 확인

```javascript
import { getDeviceType, getDetailedDeviceType } from './styles/designSystem';

// 기본 (3단계)
const type = getDeviceType(screenWidth);
// 'phone', 'tablet', 'desktop'

// 세밀한 (11단계)
const detailedType = getDetailedDeviceType(screenWidth);
// 'phoneSmall', 'phoneMedium', 'phoneLarge', 'phoneXLarge',
// 'tabletSmall', 'tabletMedium', 'tabletLarge', 'tabletXLarge',
// 'desktopSmall', 'desktopMedium', 'desktopLarge'
```

---

## 🔧 기존 프로젝트 마이그레이션

### 단계 1: 화면 너비 추적 추가

```javascript
import { Dimensions } from 'react-native';

const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

useEffect(() => {
  const subscription = Dimensions.addEventListener('change', ({ window }) => {
    setScreenWidth(window.width);
  });
  return () => subscription?.remove();
}, []);
```

### 단계 2: 반응형 적용

```javascript
import { useResponsiveStyle } from './styles/designSystem';

const responsive = useResponsiveStyle(screenWidth);

// 기존 스타일
const styles = StyleSheet.create({ ... });

// 반응형 변환
const responsiveStyles = responsive.applyAll(styles);

// 기존 코드는 그대로, style만 교체
<View style={responsiveStyles.container}>
```

### 단계 3: 점진적 적용

```javascript
// 일부 컴포넌트만 먼저 적용
<View style={responsive.apply(styles.container)}>
  <Text style={styles.text}>이건 아직 고정</Text>
  <Text style={responsive.apply(styles.title)}>이건 반응형</Text>
</View>
```

---

## 💯 베스트 프랙티스

### ✅ 권장사항

1. **Context로 전역 관리**
```javascript
const ResponsiveContext = createContext();

// App.js
<ResponsiveContext.Provider value={responsive}>
  <YourApp />
</ResponsiveContext.Provider>

// 다른 컴포넌트
const responsive = useContext(ResponsiveContext);
```

2. **Custom Hook 만들기**
```javascript
function useResponsive() {
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);
  
  return useResponsiveStyle(screenWidth);
}

// 사용
function MyComponent() {
  const responsive = useResponsive();
  // ...
}
```

3. **메모이제이션**
```javascript
const responsiveStyles = useMemo(
  () => responsive.applyAll(styles),
  [screenWidth]
);
```

### ❌ 피해야 할 것

1. 매 렌더링마다 `Dimensions.get()` 호출
2. 반응형 변환을 render 함수 안에서 반복 실행
3. 불필요하게 세밀한 브레이크포인트 사용

---

## 🐛 문제 해결

### Q: 스타일이 변경되지 않아요
A: `Dimensions.addEventListener`로 화면 크기 변화를 추적하고 있는지 확인하세요.

### Q: 성능이 느려요
A: `useMemo`로 반응형 스타일을 메모이제이션하세요.

### Q: 특정 속성만 반응형으로 하고 싶어요
A: 개별 함수를 사용하세요:
```javascript
<View style={{
  ...styles.container,
  padding: responsive.spacing('lg'),
  fontSize: responsive.fontSize('base')
}}>
```

### Q: 기존 스타일을 유지하면서 일부만 반응형으로?
A: 스프레드 연산자로 병합하세요:
```javascript
<View style={[
  styles.container,
  { padding: responsive.spacing('lg') }
]}>
```

---

## 📚 추가 리소스

- `designSystem.js` - 전체 디자인 시스템 정의
- `breakpoints` - 브레이크포인트 상수
- `responsiveSpacing` - 반응형 간격 테이블
- `responsiveFontSize` - 반응형 폰트 크기 테이블

---

**기존 CSS는 절대 건드리지 않고, 이 시스템만 추가하면 모든 스타일이 자동으로 반응형이 됩니다! 🎉**
