import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import userDataService from './userDataService';
import { useResponsive } from './hooks/useResponsive';
import OrientationLock from './components/OrientationLock';
import { API_BASE_URL } from './config/api';

const { width: screenWidth } = Dimensions.get('window');
const BACKEND_URL = API_BASE_URL;

export default function ExamAnswers() {
  const navigation = useNavigation();
  const responsiveUtil = useResponsive();
  const [currentUser, setCurrentUser] = useState(null);
  const [examImages, setExamImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarAnim] = useState(new Animated.Value(0));

  const subjects = [
    '홈',
    '타이머',
    '플래너',
    'AI',
    '스터디그룹 찾기',
    '커뮤니티',
    '스토어',
    '모의고사'
  ];

  useEffect(() => {
    loadUserInfo();
    loadExamImages();
  }, []);

  useEffect(() => {
    Animated.timing(sidebarAnim, {
      toValue: sidebarVisible ? 0 : -320,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [sidebarVisible]);

  const loadUserInfo = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
    }
  };

  const loadExamImages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/exam-answers`);
      const data = await response.json();
      
      if (data.success) {
        setExamImages(data.images || []);
      }
    } catch (error) {
      console.error('모의고사 이미지 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = () => {
    return currentUser?.email === 'drda00001@gmail.com';
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('이미지 선택 오류:', error);
      Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
    }
  };

  const uploadImage = async (imageUri) => {
    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `exam_${Date.now()}.jpg`,
      });
      formData.append('uploaderEmail', currentUser.email);
      formData.append('uploaderName', currentUser.name || currentUser.username);

      const response = await fetch(`${BACKEND_URL}/api/exam-answers/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('성공', '모의고사 답지가 업로드되었습니다.');
        loadExamImages();
      } else {
        Alert.alert('오류', data.error || '업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      Alert.alert('오류', '이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageId) => {
    Alert.alert(
      '삭제 확인',
      '이 모의고사 답지를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/exam-answers/${imageId}`, {
                method: 'DELETE',
              });

              const data = await response.json();

              if (data.success) {
                Alert.alert('성공', '모의고사 답지가 삭제되었습니다.');
                loadExamImages();
              } else {
                Alert.alert('오류', data.error || '삭제에 실패했습니다.');
              }
            } catch (error) {
              console.error('이미지 삭제 오류:', error);
              Alert.alert('오류', '삭제 중 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  const handleSubjectPress = (subjectName) => {
    switch(subjectName) {
      case '홈':
        navigation.navigate('Main');
        break;
      case '타이머':
        navigation.navigate('Timer');
        break;
      case '플래너':
        navigation.navigate('Planner');
        break;
      case 'AI':
        navigation.navigate('AI');
        break;
      case '스터디그룹 찾기':
        navigation.navigate('StudyGroup');
        break;
      case '커뮤니티':
        navigation.navigate('Community');
        break;
      case '스토어':
        navigation.navigate('Store');
        break;
      case '모의고사':
        break;
      default:
        break;
    }
  };

  const handleImagePress = (image) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  // 반응형 스타일 적용
  const styles = useMemo(
    () => responsiveUtil.applyAll(baseStyles), 
    [responsiveUtil]
  );

  return (
    <OrientationLock isNoteScreen={false}>
      <SafeAreaView style={styles.safeArea}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.hamburgerButton} onPress={() => setSidebarVisible(!sidebarVisible)}>
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
            </TouchableOpacity>
            <Text style={styles.title}>StudyTime</Text>
            <Text style={styles.homeText}>모의고사</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileIcon}
            onPress={() => navigation.navigate('Settings')}
          >
            {currentUser?.profileImage ? (
              <Image 
                source={{ uri: currentUser.profileImage }} 
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.defaultProfileIcon}>
                <Text style={styles.profileText}>
                  {currentUser?.name?.charAt(0) || currentUser?.email?.charAt(0) || '?'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.container}>
          {/* 사이드바 */}
          {sidebarVisible && (
            <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarAnim }] }]}>
              <View style={styles.searchContainer}>
                <Text style={styles.searchIconText}>🔍</Text>
                <Text style={styles.searchInput}>검색</Text>
              </View>
              <View style={styles.subjectList}>
                {subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject}
                    style={[styles.subjectItem, subject === '모의고사' && styles.activeSubjectItem]}
                    onPress={() => handleSubjectPress(subject)}
                  >
                    <Text style={[styles.subjectText, subject === '모의고사' && styles.activeSubjectText]}>
                      {subject}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.bottomDots}>
                <View style={[styles.dot, styles.activeDot]} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            </Animated.View>
          )}

          {/* 메인 콘텐츠 */}
          <View style={[styles.mainContent, !sidebarVisible && styles.mainContentExpanded]}>
            <View style={styles.contentHeader}>
              <Text style={styles.contentTitle}>모의고사 답지</Text>
              {isAdmin() && (
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={pickImage}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.uploadButtonText}>+ 업로드</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4285F4" />
                <Text style={styles.loadingText}>로딩 중...</Text>
              </View>
            ) : examImages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>아직 업로드된 모의고사 답지가 없습니다.</Text>
                {isAdmin() && (
                  <Text style={styles.emptySubText}>관리자님, 첫 답지를 업로드해보세요!</Text>
                )}
              </View>
            ) : (
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.imageGrid}>
                  {examImages.map((image) => (
                    <View key={image._id} style={styles.imageCard}>
                      <TouchableOpacity 
                        style={styles.imageContainer}
                        onPress={() => handleImagePress(image)}
                      >
                        <Image 
                          source={{ uri: image.imageUrl }} 
                          style={styles.examImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      <View style={styles.imageInfo}>
                        <Text style={styles.imageDate}>
                          {new Date(image.uploadedAt).toLocaleDateString('ko-KR')}
                        </Text>
                        {isAdmin() && (
                          <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={() => deleteImage(image._id)}
                          >
                            <Text style={styles.deleteButtonText}>삭제</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>

        {/* 이미지 확대 모달 */}
        <Modal
          visible={showImageModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowImageModal(false)}
        >
          <View style={styles.imageModalOverlay}>
            <TouchableOpacity 
              style={styles.imageModalCloseArea}
              onPress={() => setShowImageModal(false)}
              activeOpacity={1}
            >
              <View style={styles.imageModalContainer}>
                {selectedImage && (
                  <Image 
                    source={{ uri: selectedImage.imageUrl }} 
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                  />
                )}
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowImageModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </SafeAreaView>
    </OrientationLock>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
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
  container: { 
    flex: 1, 
    flexDirection: 'row' 
  },
  sidebar: { 
    width: 320, 
    backgroundColor: 'white', 
    paddingHorizontal: 20, 
    paddingVertical: 24, 
    borderRightWidth: 1, 
    borderRightColor: '#E5E5E5' 
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F5F5F5', 
    borderRadius: 25, 
    marginBottom: 24, 
    paddingHorizontal: 16, 
    height: 44 
  },
  searchIconText: { 
    fontSize: 14, 
    color: '#999', 
    marginRight: 8 
  },
  searchInput: { 
    flex: 1, 
    fontSize: 15, 
    color: '#999' 
  },
  subjectList: { 
    flex: 1, 
    gap: 4 
  },
  subjectItem: { 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    borderRadius: 10 
  },
  activeSubjectItem: { 
    backgroundColor: '#F0F0F0' 
  },
  subjectText: { 
    fontSize: 16, 
    color: '#666', 
    fontWeight: '400' 
  },
  activeSubjectText: { 
    color: '#000', 
    fontWeight: '600' 
  },
  bottomDots: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 8, 
    paddingTop: 24 
  },
  dot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: '#D0D0D0' 
  },
  activeDot: { 
    backgroundColor: '#666' 
  },
  mainContent: { 
    flex: 1, 
    backgroundColor: 'white' 
  },
  mainContentExpanded: { 
    paddingLeft: 16 
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contentTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  uploadButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  imageCard: {
    width: screenWidth > 768 ? (screenWidth - 400) / 3 - 24 : (screenWidth - 80) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 0.7,
    backgroundColor: '#F8F9FA',
  },
  examImage: {
    width: '100%',
    height: '100%',
  },
  imageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  imageDate: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#000',
    fontWeight: 'bold',
  },
});
