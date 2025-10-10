import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Dimensions, Text } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CherryBlossomEffect = ({ active = false, intensity = 15, duration = 8000 }) => {
  const [petals, setPetals] = useState([]);
  const activeRef = useRef(false);

  useEffect(() => {
    console.log('🌸 CherryBlossomEffect useEffect:', { active, intensity, currentActive: activeRef.current });
    if (active && !activeRef.current) {
      console.log('🌸 벚꽃 효과 시작!');
      activeRef.current = true;
      startPetalFall();
    } else if (!active && activeRef.current) {
      console.log('🌸 벚꽃 효과 중지!');
      activeRef.current = false;
      stopPetalFall();
    };
  }, [active, intensity]);

  const createPetal = (index) => {
    const startX = Math.random() * screenWidth;
    const startY = -50;
    const size = Math.random() * 20 + 15; // 15-35px (벚꽃 이모지 크기)
    const opacity = Math.random() * 0.3 + 0.7; // 0.7-1.0 (자연스러운 투명도)
    const fallDuration = Math.random() * 4000 + 3000; // 3-7초 (빠르게)
    const swayAmount = Math.random() * 150 + 100; // 100-250px 좌우 흔들림 (매우 크게)
    const rotationSpeed = Math.random() * 4000 + 5000; // 회전 속도 (매우 천천히)

    const translateX = new Animated.Value(startX);
    const translateY = new Animated.Value(startY);
    const rotate = new Animated.Value(0);

    // 벚꽃 이모지 종류
    const cherryBlossomEmojis = ['🌸', '🌺', '🌷'];
    const selectedEmoji = cherryBlossomEmojis[Math.floor(Math.random() * cherryBlossomEmojis.length)];

    // 벚꽃 꽃잎 떨어지는 애니메이션 - 무한 반복 (간단하게)
    const animation = Animated.parallel([
      // 수직 낙하 - 무한 반복
      Animated.loop(
        Animated.timing(translateY, {
          toValue: screenHeight + 60,
          duration: fallDuration,
          useNativeDriver: true,
        }),
        { iterations: -1, resetBeforeIteration: true }
      ),
      // 우아한 좌우 흔들림 (벚꽃 특유의 부드러운 움직임)
      Animated.loop(
        Animated.sequence([
          // 오른쪽으로 부드럽게 흔들림
          Animated.timing(translateX, {
            toValue: startX + swayAmount * 0.9,
            duration: fallDuration / 4,
            useNativeDriver: true,
          }),
          // 왼쪽으로 크게 흔들림
          Animated.timing(translateX, {
            toValue: startX - swayAmount * 1.1,
            duration: fallDuration / 3,
            useNativeDriver: true,
          }),
          // 다시 오른쪽으로 중간 정도
          Animated.timing(translateX, {
            toValue: startX + swayAmount * 0.7,
            duration: fallDuration / 5,
            useNativeDriver: true,
          }),
          // 왼쪽으로 작게 흔들림
          Animated.timing(translateX, {
            toValue: startX - swayAmount * 0.5,
            duration: fallDuration / 6,
            useNativeDriver: true,
          }),
          // 오른쪽으로 살짝
          Animated.timing(translateX, {
            toValue: startX + swayAmount * 0.3,
            duration: fallDuration / 8,
            useNativeDriver: true,
          }),
          // 중앙으로 돌아오기
          Animated.timing(translateX, {
            toValue: startX,
            duration: fallDuration / 10,
            useNativeDriver: true,
          }),
        ]),
        { iterations: -1 }
      ),
      // 간단한 회전
      Animated.loop(
        Animated.timing(rotate, {
          toValue: 360,
          duration: 3000,
          useNativeDriver: true,
        }),
        { iterations: -1 }
      ),
    ]);

    animation.start();

    return {
      id: `petal-${index}-${Date.now()}`,
      translateX,
      translateY,
      rotate,
      size,
      opacity,
      emoji: selectedEmoji,
      animation,
    };
  };

  const startPetalFall = () => {
    console.log('🌸 startPetalFall 호출! intensity:', intensity);
    const newPetals = [];
    for (let i = 0; i < intensity; i++) {
      setTimeout(() => {
        if (activeRef.current) {
          console.log(`🌸 꽃잎 ${i + 1} 생성 중...`);
          const petal = createPetal(i);
          newPetals.push(petal);
          setPetals(prev => {
            console.log(`🌸 꽃잎 추가! 총 ${prev.length + 1}개`);
            return [...prev, petal];
          });
        }
      }, i * 300); // 0.3초 간격으로 생성
    }
  };

  const stopPetalFall = () => {
    setPetals(prevPetals => {
      prevPetals.forEach(petal => {
        if (petal.animation) {
          petal.animation.stop();
        }
      });
      return [];
    });
  };

  if (!active) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
      {petals.map(petal => (
        <Animated.View
          key={petal.id}
          style={{
            position: 'absolute',
            width: petal.size,
            height: petal.size, // 이모지는 정사각형
            opacity: petal.opacity,
            transform: [
              { translateX: petal.translateX },
              { translateY: petal.translateY },
              { rotate: petal.rotate.interpolate({
                inputRange: [0, 360],
                outputRange: ['0deg', '360deg']
              }) }
            ],
          }}
        >
          {/* 벚꽃 이모지 */}
          <Text style={{
            fontSize: petal.size,
            textAlign: 'center',
            lineHeight: petal.size,
            opacity: petal.opacity,
          }}>
            {petal.emoji}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
};

export default CherryBlossomEffect;
