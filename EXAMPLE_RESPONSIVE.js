// ============================================
// 중앙 집중식 반응형 스타일 적용 예제
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
import { getScreenInfo } from './utils/responsive';
import { useGlobalResponsiveStyles, getAIResponsiveStyles } from './styles/globalResponsiveStyles';
import OrientationLock from './components/OrientationLock';

export default function ExampleScreen() {
  // 1. 스타일 가져오기
  const globalStyles = useGlobalResponsiveStyles();  // 공통 스타일
  const aiStyles = getAIResponsiveStyles();          // AI 화면 전용 스타일
  const styles = { ...globalStyles, ...aiStyles };   // 병합
  
  // 2. 화면 정보
  const [screenInfo, setScreenInfo] = useState(getScreenInfo());
  const [sidebarVisible, setSidebarVisible] = useState(!screenInfo.isPhone);
  
  // 3. 화면 크기 변경 감지
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      const newScreenInfo = getScreenInfo();
      setScreenInfo(newScreenInfo);
      setSidebarVisible(!newScreenInfo.isPhone);
    });
    return () => subscription?.remove();
  }, []);
  
  return (
    <OrientationLock isNoteScreen={false}>
      <SafeAreaView style={styles.safeArea}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.hamburgerButton} 
              onPress={() => setSidebarVisible(!sidebarVisible)}
            >
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
            </TouchableOpacity>
            <Text style={styles.title}>StudyTime</Text>
            <Text style={styles.homeText}>예제 화면</Text>
          </View>
        </View>
        
        {/* 컨테이너 */}
        <View style={styles.container}>
          {/* 데스크톱 사이드바 */}
          {!screenInfo.isPhone && sidebarVisible && (
            <View style={styles.sidebar}>
              <Text>데스크톱 사이드바</Text>
            </View>
          )}
          
          {/* 메인 콘텐츠 */}
          <View style={[
            styles.mainContent, 
            !sidebarVisible && styles.mainContentExpanded
          ]}>
            <Text>메인 콘텐츠</Text>
          </View>
          
          {/* 모바일 사이드바 */}
          {screenInfo.isPhone && sidebarVisible && (
            <View style={styles.mobileSidebar}>
              <View style={styles.mobileSidebarContent}>
                <Text>모바일 사이드바</Text>
              </View>
              <TouchableOpacity 
                style={styles.mobileSidebarOverlay}
                onPress={() => setSidebarVisible(false)}
                activeOpacity={1}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    </OrientationLock>
  );
}

// ============================================
// 기존 방식 (제거할 코드)
// ============================================
/*
const baseStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { ... },
  // 수백 줄의 스타일...
});

const styles = baseStyles;
*/

// ============================================
// 새로운 방식 (위 코드 참고)
// ============================================
/*
1. import 추가:
   import { useGlobalResponsiveStyles, getAIResponsiveStyles } from './styles/globalResponsiveStyles';
   import { getScreenInfo } from './utils/responsive';

2. 컴포넌트 내부에서:
   const globalStyles = useGlobalResponsiveStyles();
   const aiStyles = getAIResponsiveStyles();
   const styles = { ...globalStyles, ...aiStyles };

3. baseStyles 삭제

끝!
*/
