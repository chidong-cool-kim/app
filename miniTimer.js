import React, { useRef } from 'react';
import { StyleSheet, Text, View, Animated, PanResponder } from 'react-native';
import { useTimer } from './timerContext';

export default function MiniTimer() {
  const { timeLeft, isBreak, formatTime, showMiniTimer } = useTimer();
  
  // 드래그 위치를 위한 Animated Value
  const pan = useRef(new Animated.ValueXY()).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  if (!showMiniTimer) return null;

  return (
    <Animated.View
      style={[
        styles.miniTimer,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.miniTimerContent}>
        <View style={[styles.miniTimerDot, isBreak ? styles.breakDot : styles.focusDot]} />
        <Text style={styles.miniTimerText}>{formatTime(timeLeft)}</Text>
        <Text style={styles.miniTimerStatus}>
          {isBreak ? '휴식' : '집중'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  miniTimer: {
    position: 'absolute',
    top: 100,
    right: 20,
    zIndex: 1000,
  },
  
  miniTimerContent: {
    backgroundColor: 'white',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minWidth: 120,
    minHeight: 48,
  },
  
  miniTimerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  
  focusDot: {
    backgroundColor: '#3B82F6',
  },
  
  breakDot: {
    backgroundColor: '#10B981',
  },
  
  miniTimerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 10,
  },
  
  miniTimerStatus: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});