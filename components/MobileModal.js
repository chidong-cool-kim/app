import React from 'react';
import { Modal, View, StatusBar, Platform, Dimensions } from 'react-native';
import { getScreenInfo } from '../utils/responsive';

export default function MobileModal({ 
  visible, 
  onRequestClose, 
  children, 
  animationType = 'slide',
  transparent = true,
  backgroundColor = '#ffffff'
}) {
  const screenInfo = getScreenInfo();
  const { height: screenHeight } = Dimensions.get('window');
  
  if (screenInfo.isPhone) {
    return (
      <Modal
        visible={visible}
        transparent={transparent}
        animationType={animationType}
        onRequestClose={onRequestClose}
        statusBarTranslucent={true}
      >
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="rgba(0,0,0,0.5)"
          translucent={true}
        />
        <View style={{
          flex: 1,
          backgroundColor: transparent ? 'rgba(0, 0, 0, 0.5)' : backgroundColor,
          paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
          minHeight: screenHeight
        }}>
          {children}
        </View>
      </Modal>
    );
  }
  
  // 데스크톱에서는 기본 Modal 사용
  return (
    <Modal
      visible={visible}
      transparent={transparent}
      animationType={animationType}
      onRequestClose={onRequestClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: transparent ? 'rgba(0, 0, 0, 0.5)' : backgroundColor
      }}>
        {children}
      </View>
    </Modal>
  );
}
