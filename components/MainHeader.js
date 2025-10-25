import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';

// Android에서 LayoutAnimation 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MainHeader = ({ 
  screenInfo, 
  mobileStyles, 
  onHamburgerPress, 
  onProfilePress,
  currentUser,
  unreadMessageCount 
}) => {
  const headerRef = useRef(null);
  const initialY = useRef(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    // 100ms마다 헤더 위치 체크
    const interval = setInterval(() => {
      if (headerRef.current) {
        headerRef.current.measure((x, y, width, height, pageX, pageY) => {
          // 초기 위치 저장
          if (initialY.current === null) {
            initialY.current = pageY;
            console.log('📍 헤더 초기 위치 (pageY):', pageY);
            return;
          }

          // 위치 변화 감지 (3px 이상)
          if (Math.abs(pageY - initialY.current) > 3) {
            console.warn('⚠️ 헤더 위치 변화 감지!', {
              초기: initialY.current,
              현재: pageY,
              차이: pageY - initialY.current
            });
            
            // LayoutAnimation으로 부드럽게 복구
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            
            // key 변경으로 강제 리마운트
            setKey(prev => prev + 1);
            
            // 초기 위치 재설정
            initialY.current = null;
          }
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <View 
      key={key}
      ref={headerRef}
      collapsable={false}
      style={[styles.header, screenInfo.isPhone && mobileStyles.headerStyles.header]}
    >
      <View style={[styles.headerLeft, screenInfo.isPhone && mobileStyles.headerStyles.headerLeft]}>
        <TouchableOpacity style={styles.hamburgerButton} onPress={onHamburgerPress}>
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>
        <Text style={[styles.title, screenInfo.isPhone && mobileStyles.headerStyles.title]}>StudyTime</Text>
        <Text style={[styles.homeText, screenInfo.isPhone && mobileStyles.headerStyles.homeText]}>홈</Text>
      </View>
      <TouchableOpacity 
        style={[styles.profileIcon, screenInfo.isPhone && mobileStyles.headerStyles.profileIcon]}
        onPress={onProfilePress}
      >
        {currentUser?.profileImage ? (
          <Image 
            source={{ uri: currentUser.profileImage }} 
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.defaultProfileIcon}>
            <Text style={styles.profileText}>
              {currentUser?.name?.charAt(0) || currentUser?.username?.charAt(0) || '?'}
            </Text>
          </View>
        )}
        {unreadMessageCount > 0 && (
          <View style={styles.profileNotification}>
            <Text style={styles.profileNotificationText}>!</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingVertical: 16, 
    backgroundColor: 'white', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E5E5' 
  },
  headerLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  hamburgerButton: { 
    width: 24, 
    height: 24, 
    justifyContent: 'space-between', 
    paddingVertical: 2 
  },
  hamburgerLine: { 
    width: '100%', 
    height: 3, 
    backgroundColor: '#333', 
    borderRadius: 2 
  },
  title: { 
    fontSize: 26, 
    fontWeight: '700', 
    color: '#000' 
  },
  homeText: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: '#000' 
  },
  profileIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#E0E0E0', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  profileImage: { 
    width: 44, 
    height: 44, 
    borderRadius: 22 
  },
  defaultProfileIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#4A90E2', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  profileText: { 
    fontSize: 16, 
    color: '#fff', 
    fontWeight: '600' 
  },
  profileNotification: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    transform: [{ rotate: '15deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  profileNotificationText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    transform: [{ rotate: '-15deg' }],
  },
});

export default MainHeader;
