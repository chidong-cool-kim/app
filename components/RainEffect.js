import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const RainDrop = ({ duration }) => {
  const fallAnimation = useRef(new Animated.Value(0)).current;
  const opacityAnimation = useRef(new Animated.Value(0.7)).current;
  
  // 빗줄기 속성
  const width = Math.random() * 2 + 1; // 1-3px 두께
  const height = Math.random() * 20 + 15; // 15-35px 길이
  const initialX = Math.random() * screenWidth;
  const fallSpeed = Math.random() * 1500 + 800; // 0.8-2.3초 떨어지는 시간 (빠르게)
  const delay = Math.random() * 2000; // 0-2초 지연
  
  // 비 색상 (회색 계열)
  const rainColors = [
    'rgba(173, 216, 230, 0.8)', // 연한 파랑
    'rgba(135, 206, 235, 0.7)', // 하늘색
    'rgba(176, 196, 222, 0.8)', // 연한 강철색
    'rgba(119, 136, 153, 0.7)', // 연한 슬레이트 회색
    'rgba(112, 128, 144, 0.8)', // 슬레이트 회색
  ];
  const rainColor = rainColors[Math.floor(Math.random() * rainColors.length)];

  useEffect(() => {
    const fall = () => {
      fallAnimation.setValue(0);
      opacityAnimation.setValue(0.7);
      
      // 떨어지는 애니메이션
      Animated.parallel([
        Animated.timing(fallAnimation, {
          toValue: 1,
          duration: fallSpeed,
          useNativeDriver: true,
          delay: delay,
        }),
        // 투명도 변화 (떨어지면서 점점 흐려짐)
        Animated.timing(opacityAnimation, {
          toValue: 0.2,
          duration: fallSpeed,
          useNativeDriver: true,
          delay: delay,
        })
      ]).start(({ finished }) => {
        if (finished) {
          setTimeout(() => {
            fall();
          }, Math.random() * 500);
        }
      });
    };

    fall();
  }, [fallSpeed, delay]);

  const translateY = fallAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-height, screenHeight + 50], // 화면 위쪽에서 시작해서 아래로
  });

  return (
    <Animated.View
      style={[
        styles.rainDrop,
        {
          width: width,
          height: height,
          left: initialX,
          backgroundColor: rainColor,
          transform: [{ translateY }],
          opacity: opacityAnimation,
        },
      ]}
    />
  );
};

const RainEffect = ({ active = false, intensity = 25, duration = 3000 }) => {
  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: intensity }).map((_, index) => (
        <RainDrop 
          key={`rain-${index}`} 
          duration={duration}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    overflow: 'hidden',
  },
  rainDrop: {
    position: 'absolute',
    borderRadius: 1,
  },
});

export default RainEffect;
