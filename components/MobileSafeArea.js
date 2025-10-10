import React from 'react';
import { SafeAreaView, StatusBar, Platform, View } from 'react-native';
import { getScreenInfo } from '../utils/responsive';

export default function MobileSafeArea({ children, style, backgroundColor = '#ffffff' }) {
  const screenInfo = getScreenInfo();
  
  // 모바일에서만 특별한 처리
  if (screenInfo.isPhone) {
    return (
      <>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor={backgroundColor}
          translucent={false}
        />
        <SafeAreaView 
          style={[
            { 
              flex: 1, 
              backgroundColor: backgroundColor,
              paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
            }, 
            style
          ]}
        >
          {children}
        </SafeAreaView>
      </>
    );
  }
  
  // 데스크톱에서는 기본 SafeAreaView 사용
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor }, style]}>
      {children}
    </SafeAreaView>
  );
}
