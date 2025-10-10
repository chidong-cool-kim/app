import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SnowEffect = ({ active = false, intensity = 50, duration = 3000 }) => {
  const [snowflakes, setSnowflakes] = useState([]);
  const animationRefs = useRef([]);
  const activeRef = useRef(active); // 활성 상태를 ref로 추적

  useEffect(() => {
    activeRef.current = active; // ref 업데이트
    
    if (active) {
      startSnowfall();
    } else {
      stopSnowfall();
    }

    return () => {
      activeRef.current = false;
      stopSnowfall();
    };
  }, [active, intensity]);

  const createSnowflake = (index) => {
    const startX = Math.random() * screenWidth;
    const startY = -30;
    const size = Math.random() * 12 + 6; // 6-18px (더 크게)
    const opacity = Math.random() * 0.6 + 0.4; // 0.4-1.0 (더 진하게)
    const fallDuration = Math.random() * 4000 + 3000; // 3-7초 (더 오래)
    const swayAmount = Math.random() * 60 + 30; // 좌우 흔들림 (더 크게)

    const translateX = new Animated.Value(startX);
    const translateY = new Animated.Value(startY);
    const rotate = new Animated.Value(0);

    // 눈송이 떨어지는 애니메이션 - 무한 반복
    const fallAnimation = Animated.loop(
      Animated.parallel([
        // 수직 낙하 - 무한 반복
        Animated.loop(
          Animated.timing(translateY, {
            toValue: screenHeight + 50,
            duration: fallDuration,
            useNativeDriver: true,
          }),
          { iterations: -1, resetBeforeIteration: true }
        ),
        // 좌우 흔들림
        Animated.loop(
          Animated.sequence([
            Animated.timing(translateX, {
              toValue: startX + swayAmount,
              duration: fallDuration / 4,
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: startX - swayAmount,
              duration: fallDuration / 2,
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: startX,
              duration: fallDuration / 4,
              useNativeDriver: true,
            }),
          ]),
          { iterations: -1 }
        ),
        // 회전
        Animated.loop(
          Animated.timing(rotate, {
            toValue: 360,
            duration: fallDuration / 2,
            useNativeDriver: true,
          }),
          { iterations: -1 }
        ),
      ]),
      { iterations: -1 } // 전체 애니메이션 무한 반복
    );

    // 애니메이션 참조 저장
    animationRefs.current[index] = { translateX, translateY, rotate, fallAnimation };

    // 애니메이션 시작 - 콜백 없이 계속 실행
    fallAnimation.start();

    return {
      id: index,
      translateX,
      translateY,
      rotate,
      size,
      opacity,
      startX,
      startY,
    };
  };

  const startSnowfall = () => {
    const newSnowflakes = [];
    animationRefs.current = [];

    // 모든 눈송이를 한 번에 생성하고 무한 반복 애니메이션 시작
    for (let i = 0; i < intensity; i++) {
      const snowflake = createSnowflake(i);
      newSnowflakes[i] = snowflake;
    }
    
    setSnowflakes(newSnowflakes);
  };

  const stopSnowfall = () => {
    // 모든 애니메이션 정지
    animationRefs.current.forEach(ref => {
      if (ref) {
        try {
          if (ref.fallAnimation) {
            ref.fallAnimation.stop();
          }
          ref.translateX.stopAnimation();
          ref.translateY.stopAnimation();
          ref.rotate.stopAnimation();
        } catch (error) {
          // 애니메이션 정지 중 오류 무시
        }
      }
    });
    setSnowflakes([]);
    animationRefs.current = [];
  };

  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {snowflakes.map((snowflake) => (
        snowflake && (
          <Animated.View
            key={snowflake.id}
            style={[
              styles.snowflake,
              {
                width: snowflake.size,
                height: snowflake.size,
                opacity: snowflake.opacity,
                transform: [
                  { translateX: snowflake.translateX },
                  { translateY: snowflake.translateY },
                  {
                    rotate: snowflake.rotate.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          />
        )
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
  },
  snowflake: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
});

export default SnowEffect;
