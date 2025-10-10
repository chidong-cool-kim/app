import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Animated,
  Dimensions,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const AssetsEyes = ({ active = true, onEyePress }) => {
  const [eyes, setEyes] = useState([]);
  const animationRefs = useRef([]);

  useEffect(() => {
    if (active) {
      createEyes();
    } else {
      removeEyes();
    }
  }, [active]);

  const createEyes = () => {
    const newEyes = [];
    const eyeCount = 8; // 화면에 8개의 눈

    for (let i = 0; i < eyeCount; i++) {
      const x = Math.random() * (screenWidth - 60);
      const y = Math.random() * (screenHeight - 60);
      
      const eye = {
        id: i,
        x: new Animated.Value(x),
        y: new Animated.Value(y),
        pupilX: new Animated.Value(0),
        pupilY: new Animated.Value(0),
        blinkAnimation: new Animated.Value(1),
        size: Math.random() * 20 + 30, // 30-50px 크기
      };

      // 깜빡임 애니메이션
      const startBlinking = () => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(Math.random() * 3000 + 2000), // 2-5초 랜덤 대기
            Animated.timing(eye.blinkAnimation, {
              toValue: 0.1,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(eye.blinkAnimation, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };

      startBlinking();
      newEyes.push(eye);
    }

    setEyes(newEyes);
  };

  const removeEyes = () => {
    setEyes([]);
  };

  // 터치 위치에 따라 눈동자 움직임
  const handleTouch = (event) => {
    const { pageX, pageY } = event.nativeEvent;
    
    eyes.forEach((eye) => {
      const eyeCenterX = eye.x._value + eye.size / 2;
      const eyeCenterY = eye.y._value + eye.size / 2;
      
      const deltaX = pageX - eyeCenterX;
      const deltaY = pageY - eyeCenterY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // 눈동자 이동 범위 제한
      const maxDistance = eye.size * 0.2;
      const ratio = Math.min(distance, maxDistance) / distance;
      
      const pupilX = deltaX * ratio * 0.3;
      const pupilY = deltaY * ratio * 0.3;
      
      Animated.timing(eye.pupilX, {
        toValue: pupilX,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      Animated.timing(eye.pupilY, {
        toValue: pupilY,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const createPanResponder = () => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: handleTouch,
      onPanResponderMove: handleTouch,
    });
  };

  const panResponder = createPanResponder();

  if (!active) return null;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {eyes.map((eye) => (
        <Animated.View
          key={eye.id}
          style={[
            styles.eyeContainer,
            {
              left: eye.x,
              top: eye.y,
              width: eye.size,
              height: eye.size,
              transform: [{ scaleY: eye.blinkAnimation }],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.eye, { width: eye.size, height: eye.size }]}
            onPress={() => onEyePress && onEyePress(eye.id)}
            activeOpacity={0.8}
          >
            {/* 눈 흰자 */}
            <View style={[styles.eyeWhite, { width: eye.size, height: eye.size }]} />
            
            {/* 눈동자 */}
            <Animated.View
              style={[
                styles.pupil,
                {
                  width: eye.size * 0.4,
                  height: eye.size * 0.4,
                  transform: [
                    { translateX: eye.pupilX },
                    { translateY: eye.pupilY },
                  ],
                },
              ]}
            >
              {/* 눈동자 반사광 */}
              <View style={[styles.highlight, { 
                width: eye.size * 0.15, 
                height: eye.size * 0.15 
              }]} />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
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
    pointerEvents: 'box-none',
  },
  eyeContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eye: {
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  eyeWhite: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
  },
  pupil: {
    borderRadius: 50,
    backgroundColor: '#2C3E50',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    top: '20%',
    left: '30%',
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
});

export default AssetsEyes;
