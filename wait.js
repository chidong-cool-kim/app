import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  View,
  Easing,
  Text,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getScreenInfo } from './utils/responsive';
import mainLogo from './assets/mainLogo.png';
import light from './assets/light.png';

const { width, height } = Dimensions.get('window');

export default function Wait() {
  const navigation = useNavigation();
  const screenInfo = getScreenInfo();

  const translateY = useRef(new Animated.Value(-300)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const lightOpacity = useRef(new Animated.Value(0)).current;
  const bgColor = useRef(new Animated.Value(0)).current;
  const bookOpacity = useRef(new Animated.Value(1)).current;
  const lightFadeOut = useRef(new Animated.Value(1)).current;

  const letters = ['s', 't', 'u', 'd', 'y'];
  const letterOpacities = letters.map(() => useRef(new Animated.Value(0)).current);
  const textBounce = useRef(new Animated.Value(0)).current;

  // 반응형 크기 계산
  const containerSize = screenInfo.isPhone ? Math.min(width, height) * 0.85 : 400;
  const imageSize = containerSize;
  const lightSize = containerSize * 0.3;
  const fontSize = screenInfo.isPhone ? 40 : 48;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 1500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -20,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: -10,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(lightOpacity, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bgColor, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
      Animated.parallel([
        Animated.timing(bookOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(lightFadeOut, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.stagger(
        400,
        letterOpacities.map(opacity =>
          Animated.timing(opacity, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          })
        )
      ),
      Animated.sequence([
        Animated.timing(textBounce, {
          toValue: -20,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(textBounce, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setTimeout(() => {
        navigation.replace('Login');
      }, 800);
    });
  }, []);

  const backgroundColor = bgColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['black', 'white'],
  });

  return (
    <Animated.View style={[styles.safeArea, { backgroundColor }]}>
      <View style={[styles.study, { width: containerSize, height: containerSize }]}>
        <Animated.Image
          source={mainLogo}
          style={[
            styles.image,
            {
              width: imageSize,
              height: imageSize,
              opacity: bookOpacity,
              transform: [{ translateY }, { translateY: bounce }],
            },
          ]}
        />
        <Animated.Image
          source={light}
          style={[
            styles.light,
            {
              width: lightSize,
              height: lightSize,
              top: screenInfo.isPhone ? -20 : -40,
              right: screenInfo.isPhone ? -20 : -40,
              opacity: Animated.multiply(lightOpacity, lightFadeOut),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.letterRow,
            {
              transform: [{ translateY: textBounce }],
            },
          ]}
        >
          {letters.map((char, index) => (
            <Animated.Text
              key={index}
              style={[
                styles.letter,
                { 
                  opacity: letterOpacities[index],
                  fontSize: fontSize,
                  marginHorizontal: screenInfo.isPhone ? 2 : 4,
                },
              ]}
            >
              {char}
            </Animated.Text>
          ))}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  study: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    position: 'absolute',
  },
  light: {
    position: 'absolute',
  },
  letterRow: {
    flexDirection: 'row',
    position: 'absolute',
    top: '45%',
  },
  letter: {
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#333',
  },
});