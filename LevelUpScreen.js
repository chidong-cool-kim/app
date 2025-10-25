import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  Platform,
  SafeAreaView,
} from 'react-native';
import MainHeader from './components/MainHeader';
import { getScreenInfo } from './utils/responsive';
import mobileStyles from './styles/mobileStyles';
import userDataService from './userDataService';

const { width: screenWidth } = Dimensions.get('window');

const LevelUpScreen = ({ route, navigation }) => {
  const { oldLevel, newLevel } = route.params;
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [screenInfo] = useState(getScreenInfo());
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadMessageCount] = useState(0);

  useEffect(() => {
    // 사용자 정보 로드
    const loadUser = async () => {
      const user = await userDataService.getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  useEffect(() => {
    // 입장 애니메이션
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    // 퇴장 애니메이션
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.goBack();
    });
  };

  const getLevelTitle = (level) => {
    const titles = [
      '공부 입문자', '열정적인 학습자', '꾸준한 도전자', '집중력 마스터', '학습 전문가',
      '지식 탐구자', '성실한 노력가', '끈기의 화신', '학습 달인', '공부의 신'
    ];
    return titles[Math.min(level - 1, titles.length - 1)];
  };

  const getLevelColor = (level) => {
    const colors = [
      '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    return colors[(level - 1) % colors.length];
  };

  const isMobile = screenWidth < 768;

  return (
    <SafeAreaView style={isMobile ? styles.safeArea : styles.safeAreaTablet}>
      {/* 모바일에서만 헤더 표시 */}
      {isMobile && (
        <MainHeader 
          screenInfo={screenInfo}
          mobileStyles={mobileStyles}
          onHamburgerPress={() => {}}
          onProfilePress={() => navigation.navigate('Settings')}
          currentUser={currentUser}
          unreadMessageCount={unreadMessageCount}
        />
      )}
      <View style={isMobile ? styles.overlay : styles.overlayTablet}>
      <Animated.View
        style={[
          styles.container,
          isMobile && styles.containerMobile,
          {
            transform: [{ scale: scaleAnim }],
            opacity: fadeAnim,
          },
        ]}
      >
        {/* 반짝이 효과 */}
        <View style={styles.sparkleContainer}>
          {[...Array(20)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.sparkle,
                {
                  top: Math.random() * 200,
                  left: Math.random() * (isMobile ? screenWidth * 0.7 : screenWidth * 0.8),
                },
              ]}
            />
          ))}
        </View>

        {/* 레벨업 내용 */}
        <View style={styles.content}>
          <Text style={[styles.congratsText, isMobile && styles.congratsTextMobile]}>
            🎉 축하합니다! 🎉
          </Text>
          
          <View style={styles.levelContainer}>
            <Text style={[styles.levelUpText, isMobile && styles.levelUpTextMobile]}>
              레벨업!
            </Text>
            <View style={styles.levelTransition}>
              <View style={[
                styles.levelBadge, 
                isMobile && styles.levelBadgeMobile,
                { backgroundColor: getLevelColor(oldLevel) }
              ]}>
                <Text style={[styles.levelNumber, isMobile && styles.levelNumberMobile]}>
                  {oldLevel}
                </Text>
              </View>
              <Text style={[styles.arrow, isMobile && styles.arrowMobile]}>→</Text>
              <View style={[
                styles.levelBadge,
                isMobile && styles.levelBadgeMobile,
                { backgroundColor: getLevelColor(newLevel) }
              ]}>
                <Text style={[styles.levelNumber, isMobile && styles.levelNumberMobile]}>
                  {newLevel}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.titleContainer, isMobile && styles.titleContainerMobile]}>
            <Text style={[styles.newTitle, isMobile && styles.newTitleMobile]}>
              {getLevelTitle(newLevel)}
            </Text>
            <Text style={[styles.titleDescription, isMobile && styles.titleDescriptionMobile]}>
              새로운 타이틀을 획득했습니다!
            </Text>
          </View>

          <View style={[styles.rewardContainer, isMobile && styles.rewardContainerMobile]}>
            <Text style={[styles.rewardTitle, isMobile && styles.rewardTitleMobile]}>
              🏆 달성 보상
            </Text>
            <Text style={[styles.rewardText, isMobile && styles.rewardTextMobile]}>
              • 새로운 타이틀 획득
            </Text>
            <Text style={[styles.rewardText, isMobile && styles.rewardTextMobile]}>
              • 학습 동기 부스트 +100%
            </Text>
            <Text style={[styles.rewardText, isMobile && styles.rewardTextMobile]}>
              • 성취감 만렙 달성!
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.closeButton, isMobile && styles.closeButtonMobile]} 
            onPress={handleClose}
          >
            <Text style={[styles.closeButtonText, isMobile && styles.closeButtonTextMobile]}>
              계속 공부하기
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  safeAreaTablet: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTablet: {
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
  containerMobile: {
    width: screenWidth * 0.9,
    padding: 20,
    borderRadius: 20,
    maxHeight: '80%',
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRadius: 24,
  },
  sparkle: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: '#FFD700',
    borderRadius: 2,
    opacity: 0.8,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    zIndex: 1,
  },
  congratsText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  congratsTextMobile: {
    fontSize: 20,
    marginBottom: 12,
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
  levelUpTextMobile: {
    fontSize: 26,
    marginBottom: 12,
  },
  levelTransition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  levelBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  levelBadgeMobile: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  levelNumberMobile: {
    fontSize: 20,
  },
  arrow: {
    fontSize: 24,
    fontWeight: '700',
    color: '#7C3AED',
  },
  arrowMobile: {
    fontSize: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  titleContainerMobile: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    borderRadius: 12,
  },
  newTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7C3AED',
    marginBottom: 4,
    textAlign: 'center',
  },
  newTitleMobile: {
    fontSize: 17,
  },
  titleDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  titleDescriptionMobile: {
    fontSize: 12,
  },
  rewardContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  rewardContainerMobile: {
    padding: 12,
    marginBottom: 16,
    borderRadius: 12,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
    textAlign: 'center',
  },
  rewardTitleMobile: {
    fontSize: 14,
    marginBottom: 6,
  },
  rewardText: {
    fontSize: 14,
    color: '#B45309',
    marginBottom: 4,
    textAlign: 'center',
  },
  rewardTextMobile: {
    fontSize: 12,
    marginBottom: 3,
  },
  closeButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButtonMobile: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButtonTextMobile: {
    fontSize: 14,
  },
});

export default LevelUpScreen;
