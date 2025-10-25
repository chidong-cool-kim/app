import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import userDataService from '../userDataService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const UniversalHeader = ({ title = '홈', showBackButton = false, onHamburgerPress, unreadMessageCount = 0 }) => {
  const navigation = useNavigation();
  const [currentUser, setCurrentUser] = useState(null);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadUser();
    
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  const loadUser = async () => {
    const user = await userDataService.getCurrentUser();
    setCurrentUser(user);
  };

  // 태블릿 이상이면 null 반환 (각 화면의 기존 헤더 사용)
  if (screenWidth >= 768) {
    return null;
  }

  const getResponsiveStyles = () => {
    // SafeArea 고려한 paddingTop
    const safePaddingTop = Platform.OS === 'ios' ? insets.top : insets.top > 0 ? insets.top : 0;
    
    // 모바일만 처리
    if (screenWidth < 360) {
      return {
        header: { 
          paddingHorizontal: 12, 
          paddingVertical: 10,
          paddingTop: safePaddingTop + 10
        },
        title: { fontSize: 22 },
        homeText: { fontSize: 14 },
        profileIcon: { width: 36, height: 36, borderRadius: 18 },
        profileImage: { width: 36, height: 36, borderRadius: 18 },
        defaultProfileIcon: { width: 36, height: 36, borderRadius: 18 },
        profileText: { fontSize: 14 },
      };
    }
    // 일반 모바일 (360 <= width < 768)
    return {
      header: { 
        paddingHorizontal: 16, 
        paddingVertical: 12,
        paddingTop: safePaddingTop + 12
      },
      title: { fontSize: 24 },
      homeText: { fontSize: 15 },
    };
  };

  const responsiveStyles = getResponsiveStyles();

  return (
    <View style={[styles.header, responsiveStyles.header]}>
      <View style={styles.headerLeft}>
        {showBackButton ? (
          <TouchableOpacity 
            style={styles.hamburgerButton} 
            onPress={() => navigation.goBack()}
          >
            <View style={[styles.hamburgerLine, { transform: [{ rotate: '45deg' }, { translateY: 8 }] }]} />
            <View style={[styles.hamburgerLine, { opacity: 0 }]} />
            <View style={[styles.hamburgerLine, { transform: [{ rotate: '-45deg' }, { translateY: -8 }] }]} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.hamburgerButton} 
            onPress={onHamburgerPress || (() => navigation.navigate('Main'))}
          >
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, responsiveStyles.title]}>StudyTime</Text>
        <Text style={[styles.homeText, responsiveStyles.homeText]}>{title}</Text>
      </View>
      <TouchableOpacity 
        style={[styles.profileIcon, responsiveStyles.profileIcon]}
        onPress={() => navigation.navigate('Settings')}
      >
        {currentUser?.profileImage ? (
          <Image 
            source={{ uri: currentUser.profileImage }} 
            style={[styles.profileImage, responsiveStyles.profileImage]}
          />
        ) : (
          <View style={[styles.defaultProfileIcon, responsiveStyles.defaultProfileIcon]}>
            <Text style={[styles.profileText, responsiveStyles.profileText]}>
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
  title: { 
    fontSize: 26, 
    fontWeight: '700', 
    color: '#000' 
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
    alignItems: 'center',
    marginLeft: 8
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

export default UniversalHeader;
