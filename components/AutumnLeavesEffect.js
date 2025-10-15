import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 자연스러운 나뭇잎 SVG 경로
const leafPath = "M12 2C8 4 4 8 6 12C8 16 10 18 12 20C14 18 16 16 18 12C20 8 16 4 12 2Z M12 2L12 18";

const AutumnLeaf = ({ duration }) => {
  const fallAnimation = useRef(new Animated.Value(0)).current;
  const swayAnimation = useRef(new Animated.Value(0)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  
  const size = Math.random() * 20 + 18; // 18-38px 크기 (적당한 중간 사이즈)
  const initialX = Math.random() * screenWidth;
  const swayDistance = Math.random() * 100 + 50; // 50-150px 좌우 움직임
  const rotationSpeed = Math.random() * 4000 + 2000; // 2-6초 회전
  const fallSpeed = Math.random() * 10000 + 8000; // 8-18초 떨어지는 시간
  
  // 진짜 가을 나뭇잎 색상 (자연스러운 그라데이션)
  const leafColors = [
    '#FF6B35', // 주황
    '#F7931E', // 진한 주황
    '#FFD23F', // 노랑
    '#D2691E', // 초콜릿
    '#CD853F', // 페루
    '#A0522D', // 시에나
    '#8B4513', // 새들 브라운
    '#B22222', // 파이어 브릭
    '#DC143C', // 크림슨
    '#FF8C00', // 다크 오렌지
    '#DAA520', // 골든로드
    '#B8860B'  // 다크 골든로드
  ];
  const leafColor = leafColors[Math.floor(Math.random() * leafColors.length)];

  useEffect(() => {
    const fall = () => {
      fallAnimation.setValue(0);
      swayAnimation.setValue(0);
      rotateAnimation.setValue(0);
      scaleAnimation.setValue(1);
      
      // 부드러운 떨어지는 애니메이션
      Animated.timing(fallAnimation, {
        toValue: 1,
        duration: fallSpeed,
        useNativeDriver: true,
        delay: Math.random() * 3000,
        easing: Easing.out(Easing.quad),
      }).start(({ finished }) => {
        if (finished) {
          setTimeout(() => {
            fall();
          }, Math.random() * 1000);
        }
      });

      // 부드러운 좌우 흔들림
      Animated.loop(
        Animated.sequence([
          Animated.timing(swayAnimation, {
            toValue: 1,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(swayAnimation, {
            toValue: -1,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ])
      ).start();

      // 부드러운 회전
      Animated.loop(
        Animated.timing(rotateAnimation, {
          toValue: 1,
          duration: rotationSpeed,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ).start();

      // 부드러운 크기 변화
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnimation, {
            toValue: 0.9,
            duration: 3000 + Math.random() * 2000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad),
          }),
          Animated.timing(scaleAnimation, {
            toValue: 1.05,
            duration: 3000 + Math.random() * 2000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad),
          }),
        ])
      ).start();
    };

    fall();
  }, [fallSpeed, rotationSpeed]);

  const translateY = fallAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, screenHeight + 100], // 화면 위쪽에서 시작해서 아래로
  });

  const translateX = swayAnimation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [initialX - swayDistance, initialX, initialX + swayDistance],
  });

  const rotate = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sway = swayAnimation.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-15deg', '15deg'],
  });

  // 진짜 나뭇잎 모양 렌더링
  return (
    <Animated.View
      style={[
        styles.leafContainer,
        {
          width: size,
          height: size,
          transform: [
            { translateX }, 
            { translateY }, 
            { rotate }, 
            { rotateZ: sway },
            { scale: scaleAnimation }
          ],
        },
      ]}
    >
      {/* SVG 나뭇잎 */}
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d={leafPath}
          fill={leafColor}
          opacity={1}
        />
      </Svg>
      
    </Animated.View>
  );
};

const AutumnLeavesEffect = ({ active = false, intensity = 20, duration = 10000 }) => {
  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* 가을 그라데이션 배경 */}
      <Svg width="100%" height="100%" style={styles.gradientBackground}>
        <Defs>
          <SvgLinearGradient id="autumnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FF6B35" stopOpacity="0.3" />
            <Stop offset="25%" stopColor="#F7931E" stopOpacity="0.25" />
            <Stop offset="50%" stopColor="#FFD23F" stopOpacity="0.2" />
            <Stop offset="75%" stopColor="#D2691E" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#8B4513" stopOpacity="0.3" />
          </SvgLinearGradient>
        </Defs>
        <Path
          d={`M0,0 L${screenWidth},0 L${screenWidth},${screenHeight} L0,${screenHeight} Z`}
          fill="url(#autumnGradient)"
        />
      </Svg>
      
      {/* 낙엽들 */}
      {Array.from({ length: intensity }).map((_, index) => (
        <AutumnLeaf 
          key={`leaf-${index}`} 
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
    zIndex: 1,
    overflow: 'hidden',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  leafContainer: {
    position: 'absolute',
    zIndex: 2,
  },
});

export default AutumnLeavesEffect;
