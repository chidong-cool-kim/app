import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  View,
  Easing,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import mainLogo from './assets/mainLogo.png';
import light from './assets/light.png';

export default function Wait() {
  const navigation = useNavigation();

  const translateY = useRef(new Animated.Value(-300)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const lightOpacity = useRef(new Animated.Value(0)).current;
  const bgColor = useRef(new Animated.Value(0)).current;
  const bookOpacity = useRef(new Animated.Value(1)).current;
  const lightFadeOut = useRef(new Animated.Value(1)).current;

  const letters = ['s', 't', 'u', 'd', 'y'];
  const letterOpacities = letters.map(() => useRef(new Animated.Value(0)).current);
  const textBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 1500, // 책 내려오는 속도 느리게
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
      // 마지막 bounce 후 약간의 여유를 두고 화면 전환
      setTimeout(() => {
        navigation.replace('Login');
      }, 800); // 0.8초 대기 후 이동
    });
  }, []);

  const backgroundColor = bgColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['black', 'white'],
  });

  return (
    <Animated.View style={[styles.safeArea, { backgroundColor }]}>
      <View style={styles.study}>
        <Animated.Image
          source={mainLogo}
          style={[
            styles.image,
            {
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
                { opacity: letterOpacities[index] },
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
    width: 400,
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 400,
    height: 400,
    position: 'absolute',
  },
  light: {
    width: 120,
    height: 120,
    position: 'absolute',
    top: -40,
    right: -40,
  },
  letterRow: {
    flexDirection: 'row',
    position: 'absolute',
    top: '45%',
  },
  letter: {
    fontSize: 48,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#333',
    marginHorizontal: 4,
  },
});