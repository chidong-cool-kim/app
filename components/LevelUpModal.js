import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

const LevelUpModal = ({ visible, oldLevel, newLevel, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 레벨업 애니메이션 시작
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(sparkleAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(sparkleAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 3 }
        ),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      sparkleAnim.setValue(0);
    }
  }, [visible]);

  const getLevelTitle = (level) => {
    const titles = [
      '새싹 학습자', '열정적인 학생', '꾸준한 공부벌레', '지식 탐구자', '학습 마스터',
      '공부의 달인', '지혜로운 현자', '학문의 거장', '지식의 왕', '공부 전설'
    ];
    
    if (level <= titles.length) {
      return titles[level - 1];
    }
    return `레벨 ${level} 마스터`;
  };

  const getLevelColor = (level) => {
    const colors = [
      '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    return colors[(level - 1) % colors.length];
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          {/* 반짝이는 효과 */}
          <Animated.View
            style={[
              styles.sparkleContainer,
              {
                opacity: sparkleAnim,
              },
            ]}
          >
            {[...Array(8)].map((_, index) => (
              <View
                key={index}
                style={[
                  styles.sparkle,
                  {
                    top: Math.random() * 200,
                    left: Math.random() * (screenWidth * 0.8),
                  },
                ]}
              />
            ))}
          </Animated.View>

          {/* 레벨업 내용 */}
          <View style={styles.content}>
            <Text style={styles.congratsText}>🎉 축하합니다! 🎉</Text>
            
            <View style={styles.levelContainer}>
              <Text style={styles.levelUpText}>레벨업!</Text>
              <View style={styles.levelTransition}>
                <View style={[styles.levelBadge, { backgroundColor: getLevelColor(oldLevel) }]}>
                  <Text style={styles.levelNumber}>{oldLevel}</Text>
                </View>
                <Text style={styles.arrow}>→</Text>
                <View style={[styles.levelBadge, { backgroundColor: getLevelColor(newLevel) }]}>
                  <Text style={styles.levelNumber}>{newLevel}</Text>
                </View>
              </View>
            </View>

            <View style={styles.titleContainer}>
              <Text style={styles.newTitle}>{getLevelTitle(newLevel)}</Text>
              <Text style={styles.titleDescription}>
                새로운 타이틀을 획득했습니다!
              </Text>
            </View>

            <View style={styles.rewardContainer}>
              <Text style={styles.rewardTitle}>🏆 달성 보상</Text>
              <Text style={styles.rewardText}>• 새로운 타이틀 획득</Text>
              <Text style={styles.rewardText}>• 학습 동기 부스트 +100%</Text>
              <Text style={styles.rewardText}>• 성취감 만렙 달성!</Text>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>계속 공부하기</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: screenWidth * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  sparkle: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: '#FFD700',
    borderRadius: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    alignItems: 'center',
    zIndex: 2,
  },
  congratsText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  levelContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  levelUpText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#7C3AED',
    marginBottom: 16,
    textShadowColor: 'rgba(124, 58, 237, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  levelTransition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  arrow: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6B7280',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  newTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  titleDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  rewardContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
    textAlign: 'center',
  },
  rewardText: {
    fontSize: 14,
    color: '#B45309',
    marginBottom: 4,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default LevelUpModal;
