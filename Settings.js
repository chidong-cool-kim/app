import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userDataService from './userDataService';
import { getScreenInfo, responsive, createResponsiveStyles } from './utils/responsive';
import MobileSafeArea from './components/MobileSafeArea';
import MobileModal from './components/MobileModal';
import effectSettingsService from './services/EffectSettingsService';
import { useResponsive } from './hooks/useResponsive';
import OrientationLock from './components/OrientationLock';

export default function Settings() {
  const navigation = useNavigation();
  const responsiveUtil = useResponsive();
  const [userInfo, setUserInfo] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [screenInfo, setScreenInfo] = useState(getScreenInfo());
  const [effectSettings, setEffectSettings] = useState({
    snowEffect: false,
    autumnEffect: false,
    cherryBlossomEffect: false,
    rainEffect: false,
    shootingStarEffect: false,
    isPremiumUser: false,
    effectIntensity: 30,
  });
  const [selectedAiStyle, setSelectedAiStyle] = useState('friendly');
  const [showAiStyleModal, setShowAiStyleModal] = useState(false);

  useEffect(() => {
    loadUserData();
    loadAiStyle();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      if (user) {
        setUserInfo(user);
        setEditName(user.name || '');
        setEditUsername(user.username || '');
        setProfileImage(null);
        
        // 구독 상태에 따라 프리미엄 설정
        const isPremium = user.subscription?.isActive || false;
        await effectSettingsService.setPremiumStatus(isPremium);
        
        // 효과 설정 로드
        await effectSettingsService.loadSettings();
        const currentEffectSettings = effectSettingsService.getSettings();
        setEffectSettings(currentEffectSettings);
      }
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAiStyle = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) return;

      // 서버에서 AI 스타일 불러오기
      const response = await fetch(`http://192.168.45.53:5000/api/users/ai-style/${user.email}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedAiStyle(data.aiStyle);
        }
      } else {
        // 서버에서 불러오기 실패 시 로컬에서 불러오기
        const savedStyle = await AsyncStorage.getItem('aiStyle');
        if (savedStyle) {
          setSelectedAiStyle(savedStyle);
        }
      }
    } catch (error) {
      console.error('AI 스타일 로드 실패:', error);
      try {
        const savedStyle = await AsyncStorage.getItem('aiStyle');
        if (savedStyle) {
          setSelectedAiStyle(savedStyle);
        }
      } catch (localError) {
        console.error('로컬 AI 스타일 로드 실패:', localError);
      }
    }
  };

  const saveAiStyle = async (style) => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) return;

      // 서버에 AI 스타일 저장
      const response = await fetch(`http://192.168.45.53:5000/api/users/ai-style`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          aiStyle: style
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await AsyncStorage.setItem('aiStyle', style);
          setSelectedAiStyle(style);
        }
      } else {
        await AsyncStorage.setItem('aiStyle', style);
        setSelectedAiStyle(style);
      }
    } catch (error) {
      console.error('AI 스타일 저장 실패:', error);
      try {
        await AsyncStorage.setItem('aiStyle', style);
        setSelectedAiStyle(style);
      } catch (localError) {
        console.error('로컬 AI 스타일 저장 실패:', localError);
      }
    }
  };

  const uploadProfileImage = async (imageUri) => {
    try {
      const currentUser = await userDataService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return false;
      }

      const formData = new FormData();
      formData.append('email', currentUser.email);
      formData.append('profileImage', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });

      const updateResponse = await fetch('http://192.168.45.53:5000/api/user/profile-image', {
        method: 'PUT',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData
      });

      const data = await updateResponse.json();
      
      if (updateResponse.ok && data.success) {
        const serverImageUrl = `http://192.168.45.53:5000${data.user.profileImage}`;
        console.log('📸 프로필 이미지 업로드 성공:', serverImageUrl);
        const updatedUser = { ...currentUser, profileImage: serverImageUrl };
        await userDataService.updateCurrentUser(updatedUser);
        
        setUserInfo(updatedUser);
        setProfileImage(serverImageUrl);
        
        Alert.alert('성공', '프로필 이미지가 변경되었습니다.\n다른 화면에서도 자동으로 업데이트됩니다.');
        return true;
      } else {
        throw new Error(data.message || '프로필 이미지 업데이트 실패');
      }
    } catch (error) {
      console.error('프로필 이미지 업로드 실패:', error);
      Alert.alert('오류', '프로필 이미지 업로드에 실패했습니다.');
      return false;
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        setProfileImage(imageUri);
        
        const uploadSuccess = await uploadProfileImage(imageUri);
        
        if (!uploadSuccess) {
          const currentUser = await userDataService.getCurrentUser();
          setProfileImage(currentUser?.profileImage || null);
        }
      }
    } catch (error) {
      console.error('이미지 선택 실패:', error);
      Alert.alert('오류', '이미지 선택에 실패했습니다.');
      
      const currentUser = await userDataService.getCurrentUser();
      setProfileImage(currentUser?.profileImage || null);
    }
  };

  const saveUserInfo = async () => {
    try {
      setUserInfo(prev => ({
        ...prev,
        name: editName,
        username: editUsername,
      }));
      setShowEditModal(false);
      Alert.alert('성공', '사용자 정보가 업데이트되었습니다.');
    } catch (error) {
      Alert.alert('오류', error.message);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말로 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('currentUser');
              await AsyncStorage.removeItem('is_authenticated');
              await AsyncStorage.removeItem('userMessages');
              
              userDataService.clearCurrentUser();
              
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('로그아웃 실패:', error);
              Alert.alert('오류', '로그아웃에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  const handleEffectChange = async (effectType) => {
    try {
      console.log('효과 변경:', effectType);

      await effectSettingsService.setEffect(effectType);
      const updatedSettings = effectSettingsService.getSettings();
      setEffectSettings(updatedSettings);
      
      let message = '';
      switch (effectType) {
        case 'none':
          message = '특수 효과가 비활성화되었습니다.';
          break;
        case 'snow':
          message = '눈 내리는 효과가 활성화되었습니다!';
          break;
        case 'autumn':
          message = '가을 나뭇잎 효과가 활성화되었습니다!';
          break;
        case 'cherryBlossom':
          message = '벚꽃 효과가 활성화되었습니다!';
          break;
        case 'rain':
          message = '비 내리는 효과가 활성화되었습니다!';
          break;
        case 'shootingStar':
          message = '유성우 효과가 활성화되었습니다!';
          break;
      }
      
      Alert.alert('설정 완료', message);
    } catch (error) {
      console.error('효과 설정 실패:', error);
      Alert.alert('오류', error.message || '설정 변경에 실패했습니다.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '계정 삭제',
      '정말로 계정을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '최종 확인',
              '계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.\n\n계속하시겠습니까?',
              [
                { text: '취소', style: 'cancel' },
                {
                  text: '삭제',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await userDataService.deleteAccount();
                      await AsyncStorage.clear();
                      Alert.alert('완료', '계정이 삭제되었습니다.');
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                      });
                    } catch (error) {
                      Alert.alert('오류', error.message);
                      console.error('계정 삭제 실패:', error);
                      Alert.alert('오류', '계정 삭제에 실패했습니다.');
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  // 반응형 스타일 적용
  const styles = useMemo(
    () => responsiveUtil.applyAll(baseStyles), 
    [responsiveUtil]
  );

  if (loading) {
    return (
      <OrientationLock isNoteScreen={false}>
        <MobileSafeArea style={styles.container} backgroundColor="#f5f5f5">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.settingText}>로딩 중...</Text>
        </View>
        </MobileSafeArea>
      </OrientationLock>
    );
  }

  return (
    <OrientationLock isNoteScreen={false}>
      <MobileSafeArea style={styles.container} backgroundColor="#f5f5f5">
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 프로필 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>프로필</Text>
          
          <TouchableOpacity style={styles.profileSection} onPress={pickImage}>
            <View style={styles.profileImageContainer}>
              {(profileImage || userInfo?.profileImage) ? (
                <Image 
                  source={{ uri: profileImage || userInfo?.profileImage }} 
                  style={styles.profileImage} 
                />
              ) : (
                <View style={styles.defaultProfileImage}>
                  <Text style={styles.defaultProfileText}>
                    {userInfo?.name?.charAt(0) || userInfo?.email?.charAt(0) || '?'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.settingText}>{userInfo?.name || '이름 없음'}</Text>
              <Text style={styles.settingValue}>{userInfo?.email}</Text>
              <Text style={styles.changePhotoText}>프로필 사진 변경</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => setShowEditModal(true)}
          >
            <Text style={styles.settingText}>개인정보 수정</Text>
            <Text style={styles.settingValue}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 구독 정보 */}
        {userInfo?.subscription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>구독 정보</Text>
            
            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingText}>{userInfo.subscription.planName} 플랜</Text>
                <Text style={styles.settingValue}>
                  월 {userInfo.subscription.price}원 • AI 질문 {userInfo.subscription.aiQuestions}개/월
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.settingItem} 
              onPress={() => navigation.navigate('Store')}
            >
              <Text style={styles.settingText}>플랜 변경</Text>
              <Text style={styles.settingValue}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AI 대화 스타일 설정 - 프리미엄 구독자만 */}
        {userInfo?.subscription?.isActive && userInfo?.subscription?.planId === 'premium' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎨 AI 대화 스타일</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => setShowAiStyleModal(true)}
            >
              <View>
                <Text style={styles.settingText}>AI 응답 스타일</Text>
                <Text style={[styles.settingValue, { fontSize: 14, marginTop: 4 }]}>
                  현재: {{
                    friendly: '친근한 스타일 😊',
                    professional: '전문적인 스타일 💼',
                    casual: '캐주얼한 스타일 🎮',
                    formal: '격식있는 스타일 🎓',
                  }[selectedAiStyle]}
                </Text>
              </View>
              <Text style={styles.settingValue}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 특수 효과 설정 - 구독자만 */}
        {userInfo?.subscription?.isActive && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ 특수 효과</Text>
            
            {/* 효과 없음 */}
            <TouchableOpacity 
              style={styles.effectOption}
              onPress={() => handleEffectChange('none')}
            >
              <View style={styles.effectOptionContent}>
                <View style={[styles.radioButton, (!effectSettings.snowEffect && !effectSettings.autumnEffect && !effectSettings.cherryBlossomEffect && !effectSettings.rainEffect && !effectSettings.shootingStarEffect) && styles.radioButtonSelected]}>
                  {(!effectSettings.snowEffect && !effectSettings.autumnEffect && !effectSettings.cherryBlossomEffect && !effectSettings.rainEffect && !effectSettings.shootingStarEffect) && <View style={styles.radioButtonInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingText}>🚫 효과 없음</Text>
                  <Text style={[styles.settingValue, { fontSize: 14, marginTop: 4 }]}>
                    특수 효과를 사용하지 않습니다
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* 눈 효과 */}
            <TouchableOpacity 
              style={styles.effectOption}
              onPress={() => handleEffectChange('snow')}
            >
              <View style={styles.effectOptionContent}>
                <View style={[styles.radioButton, effectSettings.snowEffect && styles.radioButtonSelected]}>
                  {effectSettings.snowEffect && <View style={styles.radioButtonInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingText}>❄️ 눈 내리는 효과</Text>
                  <Text style={[styles.settingValue, { fontSize: 14, marginTop: 4 }]}>
                    댓글 및 커뮤니티 글 작성 시 눈 효과 표시
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* 가을 효과 */}
            <TouchableOpacity 
              style={styles.effectOption}
              onPress={() => handleEffectChange('autumn')}
            >
              <View style={styles.effectOptionContent}>
                <View style={[styles.radioButton, effectSettings.autumnEffect && styles.radioButtonSelected]}>
                  {effectSettings.autumnEffect && <View style={styles.radioButtonInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingText}>🍂 가을 나뭇잎 효과</Text>
                  <Text style={[styles.settingValue, { fontSize: 14, marginTop: 4 }]}>
                    가을 분위기의 나뭇잎이 흔들리며 떨어집니다
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* 비 효과 */}
            <TouchableOpacity 
              style={styles.effectOption}
              onPress={() => handleEffectChange('rain')}
            >
              <View style={styles.effectOptionContent}>
                <View style={[styles.radioButton, effectSettings.rainEffect && styles.radioButtonSelected]}>
                  {effectSettings.rainEffect && <View style={styles.radioButtonInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingText}>🌧️ 비 내리는 효과</Text>
                  <Text style={[styles.settingValue, { fontSize: 14, marginTop: 4 }]}>
                    직선 형태로 뚝뚝 떨어지는 빗줄기 효과
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* 유성우 효과 */}
            <TouchableOpacity 
              style={styles.effectOption}
              onPress={() => handleEffectChange('shootingStar')}
            >
              <View style={styles.effectOptionContent}>
                <View style={[styles.radioButton, effectSettings.shootingStarEffect && styles.radioButtonSelected]}>
                  {effectSettings.shootingStarEffect && <View style={styles.radioButtonInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingText}>🌠 유성우 효과</Text>
                  <Text style={[styles.settingValue, { fontSize: 14, marginTop: 4 }]}>
                    보라빛 밤하늘에 별똥별이 흐르는 효과
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

          </View>
        )}

        {/* 앱 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 설정</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('MessageBox')}>
            <Text style={styles.settingText}>메시지함</Text>
            <Text style={styles.settingValue}>›</Text>
          </TouchableOpacity>

          {/* 프로필 커스터마이징 - 구독자만 */}
          {userInfo?.subscription?.isActive && (
            <TouchableOpacity 
              style={styles.settingItem} 
              onPress={() => {
                Alert.alert('프로필 커스터마이징', '프로필 테마와 색상을 변경할 수 있습니다.\n\n이 기능은 곧 추가될 예정입니다!');
              }}
            >
              <Text style={styles.settingText}>프로필 커스터마이징</Text>
              <Text style={styles.settingValue}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 계정 관리 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 관리</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <Text style={styles.settingText}>로그아웃</Text>
            <Text style={styles.settingValue}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
            <Text style={[styles.settingText, { color: '#FF4444' }]}>계정 삭제</Text>
            <Text style={styles.settingValue}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 개인정보 수정 모달 */}
      <MobileModal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>개인정보 수정</Text>
            
            <TextInput
              style={styles.input}
              placeholder="이름"
              placeholderTextColor="#999"
              value={editName}
              onChangeText={setEditName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="사용자명"
              placeholderTextColor="#999"
              value={editUsername}
              onChangeText={setEditUsername}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveUserInfo}>
                <Text style={styles.saveButtonText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </MobileModal>

      {/* AI 스타일 선택 모달 */}
      <MobileModal
        visible={showAiStyleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAiStyleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 400 }]}>
            <Text style={[styles.modalTitle, { fontSize: 20, marginBottom: 8 }]}>🎨 AI 대화 스타일 선택</Text>
            <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 }}>
              프리미엄 회원 전용 기능입니다
            </Text>

            <View style={{ gap: 12, marginBottom: 20 }}>
              <TouchableOpacity
                style={[
                  styles.aiStyleOption,
                  selectedAiStyle === 'friendly' && styles.selectedAiStyleOption,
                ]}
                onPress={async () => {
                  await saveAiStyle('friendly');
                  setShowAiStyleModal(false);
                  Alert.alert('설정 완료', 'AI 대화 스타일이 "친근한" 스타일로 설정되었습니다.');
                }}
              >
                <Text style={styles.aiStyleIcon}>😊</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiStyleName}>친근한 스타일</Text>
                  <Text style={styles.aiStyleDescription}>편안하고 다정한 말투로 대화합니다</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.aiStyleOption,
                  selectedAiStyle === 'professional' && styles.selectedAiStyleOption,
                ]}
                onPress={async () => {
                  await saveAiStyle('professional');
                  setShowAiStyleModal(false);
                  Alert.alert('설정 완료', 'AI 대화 스타일이 "전문적인" 스타일로 설정되었습니다.');
                }}
              >
                <Text style={styles.aiStyleIcon}>💼</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiStyleName}>전문적인 스타일</Text>
                  <Text style={styles.aiStyleDescription}>정확하고 전문적인 답변을 제공합니다</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.aiStyleOption,
                  selectedAiStyle === 'casual' && styles.selectedAiStyleOption,
                ]}
                onPress={async () => {
                  await saveAiStyle('casual');
                  setShowAiStyleModal(false);
                  Alert.alert('설정 완료', 'AI 대화 스타일이 "캐주얼한" 스타일로 설정되었습니다.');
                }}
              >
                <Text style={styles.aiStyleIcon}>🎮</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiStyleName}>캐주얼한 스타일</Text>
                  <Text style={styles.aiStyleDescription}>편하고 자유로운 분위기로 대화합니다</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.aiStyleOption,
                  selectedAiStyle === 'formal' && styles.selectedAiStyleOption,
                ]}
                onPress={async () => {
                  await saveAiStyle('formal');
                  setShowAiStyleModal(false);
                  Alert.alert('설정 완료', 'AI 대화 스타일이 "격식있는" 스타일로 설정되었습니다.');
                }}
              >
                <Text style={styles.aiStyleIcon}>🎓</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiStyleName}>격식있는 스타일</Text>
                  <Text style={styles.aiStyleDescription}>정중하고 격식을 갖춘 말투를 사용합니다</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.cancelButton, { flex: 1 }]}
              onPress={() => setShowAiStyleModal(false)}
            >
              <Text style={styles.cancelButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </MobileModal>
      </MobileSafeArea>
    </OrientationLock>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000',
  },
  backButton: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  defaultProfileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultProfileText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  changePhotoText: {
    color: '#4A90E2',
    fontSize: 14,
    marginTop: 4,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  settingValue: {
    fontSize: 16,
    color: '#666',
  },
  headerRight: {
    width: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#f5f5f5',
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#ccc',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  effectOption: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  effectOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#4A90E2',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4A90E2',
  },
  aiStyleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    gap: 12,
  },
  selectedAiStyleOption: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  aiStyleIcon: {
    fontSize: 32,
  },
  aiStyleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  aiStyleDescription: {
    fontSize: 12,
    color: '#666',
  },
});
