import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ShootingStar = ({ duration }) => {
  const positionAnimation = useRef(new Animated.Value(0)).current;
  const opacityAnimation = useRef(new Animated.Value(0)).current;
  
  // 별똥별 속성 - 카드 전체 영역에서 시작
  const startY = Math.random() * 100;
  const startX = Math.random() * (screenWidth - 100) + 50;
  const distance = Math.random() * 80 + 50;
  // 대각선 아래로 이동
  const endX = startX + distance * 0.7;
  const endY = startY + distance;
  const starSize = Math.random() * 3 + 2; // 2-5px (자연스럽게)
  const delay = Math.random() * 4000; // 0-4초 지연
  const fallSpeed = Math.random() * 1000 + 800; // 0.8-1.8초 (더 부드럽게)
  
  // 별똥별 색상 (보라색, 하얀색 계열)
  const starColors = [
    'rgba(200, 150, 255, 0.95)', // 연보라
    'rgba(180, 140, 255, 0.9)', // 진보라
    'rgba(255, 255, 255, 0.95)', // 순백
    'rgba(240, 230, 255, 0.9)', // 연한 보라빛 흰색
    'rgba(220, 180, 255, 0.9)', // 핑크빛 보라
    'rgba(255, 250, 255, 0.95)', // 밝은 흰색
  ];
  const starColor = starColors[Math.floor(Math.random() * starColors.length)];

  useEffect(() => {
    const animate = () => {
      positionAnimation.setValue(0);
      opacityAnimation.setValue(0);
      
      Animated.sequence([
        // 페이드 인
        Animated.timing(opacityAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
          delay: delay,
        }),
        // 이동하면서 페이드 아웃
        Animated.parallel([
          Animated.timing(positionAnimation, {
            toValue: 1,
            duration: fallSpeed,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnimation, {
            toValue: 0,
            duration: fallSpeed,
            useNativeDriver: true,
          })
        ])
      ]).start(({ finished }) => {
        if (finished) {
          setTimeout(() => {
            animate();
          }, Math.random() * 3000 + 2000); // 2-5초 후 다시 시작
        }
      });
    };

    animate();
  }, [fallSpeed, delay]);

  const translateX = positionAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [startX, endX],
  });

  const translateY = positionAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [startY, endY],
  });

  return (
    <>
      {/* 별똥별 본체 */}
      <Animated.View
        style={[
          styles.star,
          {
            width: starSize,
            height: starSize,
            backgroundColor: starColor,
            transform: [{ translateX }, { translateY }],
            opacity: opacityAnimation,
          },
        ]}
      />
      {/* 꼬리 효과 */}
      <Animated.View
        style={[
          styles.tail,
          {
            width: starSize * 50,
            height: starSize * 0.5,
            backgroundColor: starColor,
            transform: [
              { translateX },
              { translateY },
              { rotate: '45deg' }, // 대각선 방향으로 회전
            ],
            opacity: opacityAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          },
        ]}
      />
    </>
  );
};

const ShootingStarEffect = ({ active = false, intensity = 10, duration = 3000 }) => {
  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* 어두운 밤하늘 배경 - 전체 */}
      <View style={styles.nightSkyBackground} />
      
      {/* 별똥별들 */}
      {Array.from({ length: intensity }).map((_, index) => (
        <ShootingStar 
          key={`star-${index}`} 
          duration={duration}
        />
      ))}
      
      {/* 반짝이는 별들 (배경) */}
      {Array.from({ length: intensity * 3 }).map((_, index) => (
        <TwinklingStar key={`twinkle-${index}`} />
      ))}
    </View>
  );
};

// 반짝이는 배경 별
const TwinklingStar = () => {
  const opacityAnimation = useRef(new Animated.Value(0)).current;
  
  const y = Math.random() * 150;
  const x = Math.random() * (screenWidth - 50) + 25;
  const size = Math.random() * 2 + 1;
  const delay = Math.random() * 3000;

  useEffect(() => {
    const twinkle = () => {
      Animated.sequence([
        Animated.timing(opacityAnimation, {
          toValue: Math.random() * 0.8 + 0.2,
          duration: Math.random() * 1000 + 500,
          useNativeDriver: true,
          delay: delay,
        }),
        Animated.timing(opacityAnimation, {
          toValue: 0.1,
          duration: Math.random() * 1000 + 500,
          useNativeDriver: true,
        })
      ]).start(({ finished }) => {
        if (finished) {
          twinkle();
        }
      });
    };

    twinkle();
  }, []);

  return (
    <Animated.View
      style={[
        styles.twinklingStar,
        {
          width: size,
          height: size,
          transform: [{ translateX: x }, { translateY: y }],
          opacity: opacityAnimation,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    overflow: 'hidden',
  },
  nightSkyBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 10, 40, 0.85)',
    zIndex: 1,
  },
  star: {
    position: 'absolute',
    borderRadius: 10,
    shadowColor: '#d0b0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    zIndex: 2,
  },
  tail: {
    position: 'absolute',
    borderRadius: 3,
    transform: [{ rotate: '10deg' }],
    shadowColor: '#d0b0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    zIndex: 2,
  },
  twinklingStar: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: 'rgba(220, 200, 255, 0.7)',
    shadowColor: '#d0b0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 3,
    zIndex: 2,
  },
});

export default ShootingStarEffect;
