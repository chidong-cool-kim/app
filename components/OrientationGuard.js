import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { getScreenInfo, shouldBlockPortrait } from '../utils/responsive';

const OrientationGuard = ({ children, allowPortrait = false, screenName = '' }) => {
  const [screenInfo, setScreenInfo] = useState(getScreenInfo());
  const [shouldBlock, setShouldBlock] = useState(shouldBlockPortrait(allowPortrait));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const newScreenInfo = getScreenInfo();
      setScreenInfo(newScreenInfo);
      setShouldBlock(shouldBlockPortrait(allowPortrait));
    });

    return () => subscription?.remove();
  }, [allowPortrait]);

  if (shouldBlock) {
    return (
      <View style={styles.rotateContainer}>
        <StatusBar hidden />
        <View style={styles.rotateContent}>
          <Text style={styles.rotateIcon}>📱</Text>
          <Text style={styles.rotateTitle}>화면을 회전해주세요</Text>
          <Text style={styles.rotateText}>
            {screenName ? `${screenName}은(는) ` : '이 화면은 '}
            가로 모드에서만 사용할 수 있습니다.
          </Text>
          <View style={styles.rotateAnimation}>
            <Text style={styles.phoneIcon}>📱</Text>
            <Text style={styles.arrowIcon}>→</Text>
            <Text style={styles.phoneLandscapeIcon}>📱</Text>
          </View>
        </View>
      </View>
    );
  }

  return children;
};

const styles = StyleSheet.create({
  rotateContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotateContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  rotateIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  rotateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  rotateText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  rotateAnimation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  phoneIcon: {
    fontSize: 32,
    transform: [{ rotate: '0deg' }],
  },
  arrowIcon: {
    fontSize: 24,
    color: '#4A90E2',
  },
  phoneLandscapeIcon: {
    fontSize: 32,
    transform: [{ rotate: '90deg' }],
  },
});

export default OrientationGuard;
