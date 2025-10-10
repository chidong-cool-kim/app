import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const BanModal = ({ visible, banInfo, onClose }) => {
  const navigation = useNavigation();

  if (!banInfo || !banInfo.isBanned) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('currentUser');
      await AsyncStorage.removeItem('is_authenticated');
      
      Alert.alert('로그아웃', '로그아웃되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]);
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  const getBanMessage = () => {
    if (banInfo.banType === 'permanent') {
      return {
        title: '계정 영구정지',
        message: `귀하의 계정이 영구정지되었습니다.\n\n사유: ${banInfo.banReason}\n\n문의사항이 있으시면 고객센터로 연락해주세요.`,
        color: '#FF4444'
      };
    } else if (banInfo.banType === 'temporary') {
      const endDate = new Date(banInfo.banEndDate).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return {
        title: '계정 일시정지',
        message: `귀하의 계정이 일시정지되었습니다.\n\n사유: ${banInfo.banReason}\n\n정지 해제일: ${endDate}\n\n정지 기간 동안 앱의 모든 기능을 사용할 수 없습니다.`,
        color: '#FF9800'
      };
    }
    
    return {
      title: '계정 제한',
      message: '계정에 제한이 적용되었습니다.',
      color: '#FF4444'
    };
  };

  const banMessage = getBanMessage();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={() => {}} // 닫기 방지
    >
      <TouchableOpacity 
        style={styles.blockingOverlay}
        activeOpacity={1}
        onPress={() => {}} // 모든 터치 차단
      >
        <View style={styles.contentContainer}>
          <View style={[styles.banCard, { 
            backgroundColor: banMessage.color 
          }]}>
            <Text style={styles.banIcon}>⚠️</Text>
            <Text style={styles.banTitle}>{banMessage.title}</Text>
            <Text style={styles.banReason}>사유: {banInfo.banReason}</Text>
            {banInfo.banType === 'temporary' && banInfo.banEndDate && (
              <Text style={styles.banEndDate}>
                해제일: {new Date(banInfo.banEndDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blockingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  banCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
    marginBottom: 40,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  banIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  banTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  banReason: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  banEndDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default BanModal;
