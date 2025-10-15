import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

/**
 * 화면 방향 고정 컴포넌트
 * 
 * 규칙:
 * 1. 태블릿: 무조건 가로모드만
 * 2. 핸드폰: 무조건 세로모드만
 * 3. 예외: 핸드폰의 노트 기능만 가로모드
 */
export default function OrientationLock({ children, isNoteScreen = false }) {
  useEffect(() => {
    const lockOrientation = async () => {
      const { width } = Dimensions.get('window');
      const isTablet = width >= 600;

      try {
        if (isTablet) {
          // 태블릿: 가로모드 고정
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.LANDSCAPE
          );
        } else {
          // 핸드폰
          if (isNoteScreen) {
            // 노트 화면: 가로모드 고정
            await ScreenOrientation.lockAsync(
              ScreenOrientation.OrientationLock.LANDSCAPE
            );
          } else {
            // 일반 화면: 세로모드 고정
            await ScreenOrientation.lockAsync(
              ScreenOrientation.OrientationLock.PORTRAIT
            );
          }
        }
      } catch (error) {
        console.log('Orientation lock error:', error);
      }
    };

    lockOrientation();

    // 컴포넌트 언마운트 시 방향 잠금 해제
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, [isNoteScreen]);

  return <>{children}</>;
}
