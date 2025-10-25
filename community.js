import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  Alert,
  Platform,
  Dimensions,
  Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userDataService from './userDataService';
import MobileSafeArea from './components/MobileSafeArea';
import { useResponsive } from './hooks/useResponsive';
import OrientationLock from './components/OrientationLock';
import * as ImagePicker from 'expo-image-picker';
import SnowEffect from './components/SnowEffect';
import AutumnLeavesEffect from './components/AutumnLeavesEffect';
import RainEffect from './components/RainEffect';
import ShootingStarEffect from './components/ShootingStarEffect';
import UserProfileModal from './components/UserProfileModal';
import effectSettingsService from './services/EffectSettingsService';
import { getScreenInfo } from './utils/responsive';
import { useGlobalResponsiveStyles } from './styles/globalResponsiveStyles';
import mobileStyles from './styles/mobileStyles';
import UniversalHeader from './components/UniversalHeader';
const API_URL = Platform.OS === 'web' 
  ? 'http://localhost:5000' 
  : 'http://192.168.45.53:5000';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const getSubjects = (isAdmin = false) => {
  const baseSubjects = [
    '홈',
    '타이머',
    '플래너',
    'AI',
    '스터디그룹 찾기',
    '커뮤니티',
    '스토어',
    '모의고사'
  ];
  
  if (isAdmin) {
    baseSubjects.push('👥 사용자 관리');
    baseSubjects.push('📝 게시글 관리');
  }
  
  return baseSubjects;
};

export default function Community() {
  const navigation = useNavigation();
  const responsiveUtil = useResponsive();
  const [searchText, setSearchText] = useState('');
  const [posts, setPosts] = useState([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [hasSnowEffect, setHasSnowEffect] = useState(false);
  const [hasAutumnEffect, setHasAutumnEffect] = useState(false);
  const [activeSubject, setActiveSubject] = useState('커뮤니티');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [screenInfo, setScreenInfo] = useState(getScreenInfo());
  const [sidebarVisible, setSidebarVisible] = useState(!getScreenInfo().isPhone);
  const slideAnim = useState(new Animated.Value(-300))[0];
  const [currentUser, setCurrentUser] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [isProfileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [effectSettings, setEffectSettings] = useState({
    snowEffect: false,
    autumnEffect: false,
    rainEffect: false,
    shootingStarEffect: false,
    isPremiumUser: false,
    effectIntensity: 30,
  });
  const globalStyles = useGlobalResponsiveStyles();
  const mobileAIStyles = screenInfo.isPhone ? {
    ...mobileStyles.commonStyles,
    ...mobileStyles.headerStyles,
    ...mobileStyles.sidebarStyles,
  } : {};
  const responsiveStyles = useMemo(() => ({ ...globalStyles, ...mobileAIStyles }), [globalStyles, mobileAIStyles]);

  useEffect(() => {
    loadUserInfo();
    loadPosts();
    loadEffectSettings();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserInfo();
    });
    return unsubscribe;
  }, [navigation]);

  // 화면 크기 변경 감지
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      const newScreenInfo = getScreenInfo();
      setScreenInfo(newScreenInfo);
      setSidebarVisible(!newScreenInfo.isPhone);
    });
    
    return () => subscription?.remove();
  }, []);

  const loadUserInfo = async () => {
    try {
      const updatedUser = await userDataService.refreshCurrentUser();
      if (updatedUser) {
        setCurrentUser(updatedUser);
        const isPremium = updatedUser.subscription?.isActive || false;
        await effectSettingsService.setPremiumStatus(isPremium);
        await loadEffectSettings();
        
        // 관리자 권한 확인
        const adminStatus = updatedUser.email === 'drda00001@gmail.com' || updatedUser.role === 'admin';
        setIsAdmin(adminStatus);
      }
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
    }
  };

  const loadEffectSettings = async () => {
    try {
      await effectSettingsService.loadSettings();
      const currentEffectSettings = effectSettingsService.getSettings();
      setEffectSettings(currentEffectSettings);
      console.log('🎨 커뮤니티 효과 설정 로드:', currentEffectSettings);
    } catch (error) {
      console.error('효과 설정 로드 실패:', error);
    }
  };

  const loadPosts = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) {
        Alert.alert('알림', '로그인이 필요한 서비스입니다.');
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${API_URL}/api/community/posts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.email}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setPosts(data.posts || []);
      } else {
        throw new Error(data.error || '게시글을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('게시글 로드 실패:', error);
      Alert.alert('오류', '게시글을 불러오는데 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleSubjectPress = (subjectName) => {
    setActiveSubject(subjectName);
    
    // 모바일에서 사이드바 닫기
    if (screenInfo.isPhone) {
      setSidebarVisible(false);
      // 애니메이션 값 초기화
      slideAnim.setValue(-300);
    }
    
    const screenMap = {
      '홈': 'Main',
      '타이머': 'Timer',
      '플래너': 'Planner',
      'AI': 'AI',
      '스터디그룹 찾기': 'StudyGroup',
      '커뮤니티': 'Community',
      '스토어': 'Store',
      '모의고사': 'MockExamScreen'
    };
    
    if (subjectName === '👥 사용자 관리') {
      navigation.navigate('AdminPanel', { initialTab: 'users' });
    } else if (subjectName === '📝 게시글 관리') {
      navigation.navigate('AdminPanel', { initialTab: 'posts' });
    } else if (screenMap[subjectName]) {
      if (subjectName !== '커뮤니티') {
        navigation.navigate(screenMap[subjectName]);
      }
    }
  };

  const toggleSidebar = () => {
    if (screenInfo.isPhone) {
      if (sidebarVisible) {
        // 닫기 애니메이션
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setSidebarVisible(false);
        });
      } else {
        // 열기 애니메이션
        setSidebarVisible(true);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } else {
      // 데스크톱에서는 기존 방식
      setSidebarVisible(!sidebarVisible);
    }
  };

  const handleImagePress = (imageUrl) => {
    setSelectedImageUrl(imageUrl);
    setShowImageModal(true);
  };

  const handleProfilePress = (email) => {
    if (email) {
      setSelectedUserEmail(email);
      setProfileModalVisible(true);
    }
  };

  const handleMessagePress = (authorInfo) => {
    console.log('[FRONTEND] 메시지 버튼 클릭됨, 작성자 정보:', authorInfo);
    const isEmail = authorInfo && authorInfo.includes('@');
    
    if (isEmail) {
      setMessageRecipient(authorInfo);
      console.log('[FRONTEND] 이메일로 수신자 설정:', authorInfo);
    } else {
      setMessageRecipient(authorInfo);
      console.log('[FRONTEND] 사용자명으로 수신자 설정:', authorInfo);
    }
    
    setShowMessageModal(true);
    console.log('[FRONTEND] 메시지 모달 열림');
  };

  const sendMessage = async () => {
    console.log('[FRONTEND] 메시지 전송 시작');
    
    if (!messageContent.trim()) {
      Alert.alert('오류', '메시지 내용을 입력해주세요.');
      return;
    }

    if (!messageRecipient) {
      Alert.alert('오류', '수신자가 선택되지 않았습니다.');
      return;
    }

    try {
      const user = await userDataService.getCurrentUser();
      if (!user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      if (user.email !== 'drda00001@gmail.com') {
        Alert.alert('오류', '관리자만 메시지를 보낼 수 있습니다.');
        return;
      }

      const messageData = {
        senderEmail: user.email,
        recipientEmail: messageRecipient,
        title: `메시지 - ${new Date().toLocaleDateString()}`,
        content: messageContent.trim(),
        type: 'info'
      };

      console.log('[FRONTEND] 전송할 메시지 데이터:', messageData);
      console.log('[FRONTEND] API URL:', `${API_URL}/api/messages/send`);

      const response = await fetch(`${API_URL}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      console.log('[FRONTEND] 서버 응답 상태:', response.status);
      console.log('[FRONTEND] 서버 응답 URL:', response.url);

      const responseText = await response.text();
      console.log('[FRONTEND] 서버 응답 텍스트:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[FRONTEND] JSON 파싱 오류:', parseError);
        Alert.alert('오류', '서버 응답을 처리할 수 없습니다.');
        return;
      }

      console.log('[FRONTEND] 파싱된 서버 응답:', data);

      if (response.ok && data.success) {
        Alert.alert('성공', `메시지가 ${data.recipient?.name || messageRecipient}에게 전송되었습니다.`);
        setShowMessageModal(false);
        setMessageContent('');
        setMessageRecipient(null);
        console.log('[FRONTEND] 메시지 전송 성공');
      } else {
        console.error('[FRONTEND] 메시지 전송 실패:', data);
        Alert.alert('오류', data.message || '메시지 전송에 실패했습니다.');
      }
    } catch (error) {
      console.error('[FRONTEND] 메시지 전송 오류:', error);
      Alert.alert('오류', '네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const uploadImageToImgur = async (imageUri) => {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64Data = reader.result.split(',')[1];
            
            const imgurResponse = await fetch('https://api.imgur.com/3/image', {
              method: 'POST',
              headers: {
                'Authorization': 'Client-ID 546c25a59c58ad7',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                image: base64Data,
                type: 'base64'
              })
            });
            
            const imgurData = await imgurResponse.json();
            if (imgurData.success) {
              resolve(imgurData.data.link);
            } else {
              reject(new Error('이미지 업로드 실패'));
            }
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error('이미지 처리 실패: ' + error.message);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim()) {
      Alert.alert('오류', '제목을 입력해주세요.');
      return;
    }
    if (!newPostContent.trim()) {
      Alert.alert('오류', '내용을 입력해주세요.');
      return;
    }
    
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        navigation.navigate('Login');
        return;
      }

      let imageUrl = null;
      
      if (selectedImage) {
        Alert.alert('업로드 중', '이미지를 업로드하고 있습니다...');
        try {
          imageUrl = await uploadImageToImgur(selectedImage);
          console.log('업로드된 이미지 URL:', imageUrl);
        } catch (error) {
          console.error('이미지 업로드 오류:', error);
          Alert.alert('경고', '이미지 업로드에 실패했습니다. 텍스트만 게시하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            { text: '텍스트만 게시', onPress: () => {} }
          ]);
        }
      }
      
      const response = await fetch(`${API_URL}/api/community/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.email}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          title: newPostTitle.trim(),
          content: newPostContent.trim(),
          image: imageUrl,
          hasSnowEffect: effectSettings.isPremiumUser && effectSettings.snowEffect,
          hasAutumnEffect: effectSettings.isPremiumUser && effectSettings.autumnEffect,
          hasRainEffect: effectSettings.isPremiumUser && effectSettings.rainEffect,
          hasShootingStarEffect: effectSettings.isPremiumUser && effectSettings.shootingStarEffect,
          authorEmail: currentUser?.email
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await loadPosts();
          setShowCreateModal(false);
          setNewPostTitle('');
          setNewPostContent('');
          setSelectedImage(null);
          Alert.alert('성공', '게시글이 작성되었습니다.');
        } else {
          Alert.alert('오류', data.error || '게시글 작성에 실패했습니다.');
        }
      } else {
        Alert.alert('오류', '게시글 작성에 실패했습니다.');
      }
    } catch (error) {
      console.error('게시글 작성 오류:', error);
      Alert.alert('오류', '게시글 작성에 실패했습니다. 네트워크 상태를 확인해주세요.');
    }
  };

  const handlePostPress = (post) => {
    setSelectedPost(post);
    setShowDetailModal(true);
  };

  const handleLikePost = async (postId) => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        navigation.navigate('Login');
        return;
      }
      
      if (selectedPost && (selectedPost._id === postId || selectedPost.id === postId)) {
        const updatedSelectedPost = {
          ...selectedPost,
          likes: selectedPost.likedByUser ? selectedPost.likes - 1 : selectedPost.likes + 1,
          likedByUser: !selectedPost.likedByUser
        };
        setSelectedPost(updatedSelectedPost);
      }
      
      setPosts(prevPosts => {
        return prevPosts.map(post => {
          const currentPostId = post._id || post.id;
          if (currentPostId === postId) {
            return {
              ...post,
              likes: post.likedByUser ? post.likes - 1 : post.likes + 1,
              likedByUser: !post.likedByUser
            };
          }
          return post;
        });
      });
      
      const response = await fetch(`${API_URL}/api/community/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.email}`
        }
      });
      
      if (!response.ok) {
        await loadPosts();
      }
    } catch (error) {
      console.error('좋아요 처리 오류:', error);
      await loadPosts();
    }
  };

  const handleAddComment = async () => {
    if (newComment.trim() && selectedPost) {
      const currentDate = new Date();
      const dateString = `${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일`;
      
      const comment = {
        id: Date.now(),
        author: currentUser?.name || currentUser?.email || "나",
        authorEmail: currentUser?.email,
        content: newComment.trim(),
        date: dateString,
        likes: 0,
        hasSnowEffect: effectSettings.isPremiumUser && effectSettings.snowEffect,
        hasAutumnEffect: effectSettings.isPremiumUser && effectSettings.autumnEffect,
        hasRainEffect: effectSettings.isPremiumUser && effectSettings.rainEffect,
        hasShootingStarEffect: effectSettings.isPremiumUser && effectSettings.shootingStarEffect,
      };
      
      const updatedPosts = posts.map(post => {
        if (post.id === selectedPost.id) {
          return {
            ...post,
            comments: [...post.comments, comment]
          };
        }
        return post;
      });
      
      const updatedSelectedPost = updatedPosts.find(p => p.id === selectedPost.id);
      setPosts(updatedPosts);
      setSelectedPost(updatedSelectedPost);
      setNewComment('');
    }
  };

  const handleLikeComment = async (commentId) => {
    const updatedSelectedPost = {
      ...selectedPost,
      comments: selectedPost.comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likes: comment.likedByUser ? comment.likes - 1 : comment.likes + 1,
            likedByUser: !comment.likedByUser
          };
        }
        return comment;
      })
    };
    setSelectedPost(updatedSelectedPost);
    
    setPosts(prevPosts => {
      const updatedPosts = prevPosts.map(post => {
        if (post.id === selectedPost.id) {
          return {
            ...post,
            comments: post.comments.map(comment => {
              if (comment.id === commentId) {
                return {
                  ...comment,
                  likes: comment.likedByUser ? comment.likes - 1 : comment.likes + 1,
                  likedByUser: !comment.likedByUser
                };
              }
              return comment;
            })
          };
        }
        return post;
      });
      
      return updatedPosts;
    });
  };

  const selectImage = () => {
    Alert.alert(
      "이미지 선택",
      "이미지를 어떻게 선택하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "갤러리에서 선택", 
          onPress: () => openImageLibrary()
        },
        { 
          text: "카메라로 촬영", 
          onPress: () => openCamera()
        }
      ]
    );
  };

  const openImageLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        console.log('선택된 이미지:', imageUri);
      }
    } catch (error) {
      console.error('갤러리 오류:', error);
      Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
    }
  };

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '카메라 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        console.log('촬영된 이미지:', imageUri);
      }
    } catch (error) {
      console.error('카메라 오류:', error);
      Alert.alert('오류', '카메라를 사용하는 중 오류가 발생했습니다.');
    }
  };

  // 반응형 스타일 적용 (커뮤니티는 하얀 배경)
  const styles = useMemo(() => ({ 
    ...baseStyles, 
    ...globalStyles, 
    ...mobileAIStyles,
    safeArea: { ...baseStyles.safeArea, backgroundColor: '#FFFFFF' },
    mainContent: { ...baseStyles.mainContent, backgroundColor: '#FFFFFF' }
  }), []);

  return (
    <OrientationLock isNoteScreen={false}>
      <SafeAreaView style={styles.safeArea}>
      {/* 모바일: UniversalHeader, 태블릿: 기존 헤더 */}
      <UniversalHeader 
        title="커뮤니티" 
        showBackButton={false}
        onHamburgerPress={toggleSidebar}
      />
      {screenInfo.width >= 768 && (
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.hamburgerButton}
            onPress={toggleSidebar}
          >
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </TouchableOpacity>
          
          <Text style={[styles.title, responsiveStyles.title]}>StudyTime</Text>
          <Text style={[styles.homeText, responsiveStyles.homeText]}>커뮤니티</Text>
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
                {currentUser?.name?.charAt(0) || currentUser?.email?.charAt(0) || '?'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      )}

      <View style={[styles.container, screenInfo.isPhone && styles.phoneContainer]}>
        {/* 데스크톱 사이드바 */}
        {!screenInfo.isPhone && sidebarVisible && (
          <View style={[styles.sidebar, responsiveStyles.sidebar]}>
            <View style={[styles.searchContainer, responsiveStyles.searchContainer]}>
              <Text style={[styles.searchIconText, responsiveStyles.searchIconText]}>🔍</Text>
              <TextInput
                style={[styles.searchInput, responsiveStyles.searchInput]}
                placeholder="검색"
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            <ScrollView style={styles.subjectList} showsVerticalScrollIndicator={false}>
              {getSubjects(isAdmin).map((subject, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.subjectItem,
                    responsiveStyles.subjectItem,
                    subject === activeSubject && styles.activeSubjectItem
                  ]}
                  onPress={() => handleSubjectPress(subject)}
                >
                  <Text style={[
                    styles.subjectText,
                    responsiveStyles.subjectText,
                    subject === activeSubject && styles.activeSubjectText
                  ]}>
                    {subject}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.bottomDots}>
              <View style={[styles.dot, styles.activeDot]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          </View>
        )}
        
        {/* 모바일 슬라이드 사이드바 */}
        {screenInfo.isPhone && sidebarVisible && (
          <View style={styles.mobileSidebar}>
            <Animated.View style={[
              styles.mobileSidebarContent,
              responsiveStyles.mobileSidebarContent,
              { transform: [{ translateX: slideAnim }] }
            ]}>
              <View style={[styles.searchContainer, responsiveStyles.searchContainer]}>
                <Text style={[styles.searchIconText, responsiveStyles.searchIconText]}>🔍</Text>
                <TextInput
                  style={[styles.searchInput, responsiveStyles.searchInput]}
                  placeholder="검색"
                  placeholderTextColor="#999"
                  value={searchText}
                  onChangeText={setSearchText}
                />
              </View>
              
              <ScrollView style={styles.subjectList} showsVerticalScrollIndicator={false}>
                {getSubjects(isAdmin).map((subject, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.subjectItem,
                      responsiveStyles.subjectItem,
                      subject === activeSubject && styles.activeSubjectItem
                    ]}
                    onPress={() => handleSubjectPress(subject)}
                  >
                    <Text style={[
                      styles.subjectText,
                      responsiveStyles.subjectText,
                      subject === activeSubject && styles.activeSubjectText
                    ]}>
                      {subject}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.bottomDots}>
                <View style={[styles.dot, styles.activeDot]} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            </Animated.View>
            
            <TouchableOpacity 
              style={styles.mobileSidebarOverlay} 
              onPress={() => {
                setSidebarVisible(false);
                slideAnim.setValue(-300);
              }}
              activeOpacity={1}
            />
          </View>
        )}

        {/* 메인 콘텐츠를 View로 감싸기 */}
        <View style={{ flex: 1, position: 'relative' }}>
          {/* 모바일에서 사이드바가 열려있으면 메인 콘텐츠 숨김 */}
          {!(screenInfo.isPhone && sidebarVisible) && (
            <ScrollView style={[
              styles.mainContent, 
              !sidebarVisible && styles.mainContentExpanded,
              screenInfo.isPhone && styles.phoneMainContent
            ]} contentContainerStyle={[
              styles.scrollContentContainer,
              screenInfo.isPhone && styles.phoneScrollContainer
            ]} showsVerticalScrollIndicator={false}>
              <View style={[styles.communityHeader, responsiveStyles.communityHeader]}>
                <Text style={[styles.communityTitle, responsiveStyles.communityTitle]}>커뮤니티</Text>
                <Text style={[styles.communitySubtitle, responsiveStyles.communitySubtitle]}>함께 공부하며 지식을 나눠보세요</Text>
              </View>

              <View style={[styles.postsContainer, responsiveStyles.postsContainer]}>
                {posts.map((post) => (
                  <TouchableOpacity
                    key={post.id}
                    style={[styles.postCard, responsiveStyles.postCard]}
                    onPress={() => handlePostPress(post)}
                    activeOpacity={0.8}
                  >
                    {post.hasShootingStarEffect ? (
                      <View style={styles.postSnowContainer}>
                        <ShootingStarEffect active={true} intensity={10} duration={3000} />
                      </View>
                    ) : post.hasRainEffect ? (
                      <View style={styles.postSnowContainer}>
                        <RainEffect active={true} intensity={50} duration={2000} />
                      </View>
                    ) : post.hasAutumnEffect ? (
                      <View style={styles.postSnowContainer}>
                        <AutumnLeavesEffect active={true} intensity={18} duration={8000} />
                      </View>
                    ) : post.hasSnowEffect ? (
                      <View style={styles.postSnowContainer}>
                        <SnowEffect 
                          active={true} 
                          intensity={25} 
                          duration={6000}
                        />
                      </View>
                    ) : null}
                    <View style={[styles.postHeader, responsiveStyles.postHeader]}>
                      <TouchableOpacity style={styles.authorInfo} onPress={() => handleProfilePress(post.authorEmail)}>
                        <View style={[styles.authorAvatar, responsiveStyles.authorAvatar]}>
                          {(post.authorImage || (currentUser && (post.author === currentUser.name || post.author === currentUser.email || post.author === "나"))) ? (
                            <Image 
                              source={{ 
                                uri: post.authorImage && post.authorImage.startsWith('/uploads/') 
                                  ? `http://192.168.45.53:5000${post.authorImage}` 
                                  : (post.authorImage || currentUser?.profileImage)
                              }} 
                              style={[styles.authorAvatarImage, responsiveStyles.authorAvatarImage]}
                              onError={(error) => {
                                console.log('게시글 작성자 이미지 로드 실패:', error.nativeEvent.error);
                              }}
                            />
                          ) : (
                            <Text style={[styles.authorAvatarText, responsiveStyles.authorAvatarText]}>
                              {post.author.charAt(0)}
                            </Text>
                          )}
                        </View>
                        <View style={styles.authorTextContainer}>
                          <Text style={[styles.authorName, responsiveStyles.authorName, (post.hasShootingStarEffect || post.hasRainEffect || post.hasAutumnEffect || post.hasSnowEffect) && { color: '#fff' }]}>{post.author}</Text>
                          <Text style={[styles.postDate, responsiveStyles.postDate, (post.hasShootingStarEffect || post.hasRainEffect || post.hasAutumnEffect || post.hasSnowEffect) && { color: '#ddd' }]}>{post.date}</Text>
                        </View>
                        
                        {currentUser?.email === 'drda00001@gmail.com' && post.authorEmail !== currentUser.email && (
                          <TouchableOpacity 
                            style={[styles.messageButton, responsiveStyles.messageButton]}
                            onPress={(e) => {
                              e.stopPropagation();
                              console.log('[FRONTEND] 메시지 버튼 클릭 - 게시글:', {
                                author: post.author,
                                authorEmail: post.authorEmail,
                                postId: post.id
                              });
                              handleMessagePress(post.authorEmail || post.author);
                            }}
                          >
                            <Text style={[styles.messageButtonText, responsiveStyles.messageButtonText]}>💬</Text>
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={[styles.postTitle, responsiveStyles.postTitle, (post.hasShootingStarEffect || post.hasRainEffect || post.hasAutumnEffect || post.hasSnowEffect) && { color: '#fff' }]}>{post.title}</Text>
                    <Text style={[styles.postPreview, responsiveStyles.postPreview, (post.hasShootingStarEffect || post.hasRainEffect || post.hasAutumnEffect || post.hasSnowEffect) && { color: '#eee' }]} numberOfLines={2}>
                      {post.content}
                    </Text>
                    
                    {post.image && (
                      <TouchableOpacity onPress={() => handleImagePress(post.image)}>
                        <Image 
                          source={{ uri: post.image }} 
                          style={[styles.postImage, responsiveStyles.postImage]}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    )}
                    
                    <View style={styles.postFooter}>
                      <TouchableOpacity 
                        style={styles.likeButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleLikePost(post.id);
                        }}
                      >
                        <Image
                          source={post.likedByUser ? require('./assets/heart.png') : require('./assets/unheart.png')}
                          style={[styles.likeIcon, responsiveStyles.likeIcon, post.likedByUser && styles.likedIcon]}
                        />
                        <Text style={[styles.likeCount, responsiveStyles.likeCount, (post.hasShootingStarEffect || post.hasRainEffect || post.hasAutumnEffect || post.hasSnowEffect) && { color: '#fff' }]}>{post.likes}</Text>
                      </TouchableOpacity>
                      
                      <View style={styles.commentInfo}>
                        <Image
                          source={require('./assets/chat.png')}
                          style={[styles.commentIcon, responsiveStyles.commentIcon]}
                        />
                        <Text style={[styles.commentCount, responsiveStyles.commentCount, (post.hasShootingStarEffect || post.hasRainEffect || post.hasAutumnEffect || post.hasSnowEffect) && { color: '#fff' }]}>{post.comments.length}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
          
          {/* FAB 버튼을 ScrollView 밖으로 이동 */}
          <TouchableOpacity
            style={[styles.fab, responsiveStyles.fab]}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={[styles.fabText, responsiveStyles.fabText]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <UserProfileModal 
        visible={isProfileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        userEmail={selectedUserEmail}
      />

      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createModalContent}>
            <View style={styles.createModalHeader}>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <Text style={styles.createModalTitle}>질문 추가하기</Text>
              <TouchableOpacity onPress={handleCreatePost}>
                <Text style={styles.postText}>올리기</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.createModalBody}>
              <TextInput
                style={styles.titleInput}
                placeholder="제목을 입력하세요"
                placeholderTextColor="#999"
                value={newPostTitle}
                onChangeText={setNewPostTitle}
                multiline={false}
              />
              
              <TextInput
                style={styles.contentInput}
                placeholder="질문 내용을 입력하세요..."
                placeholderTextColor="#999"
                value={newPostContent}
                onChangeText={setNewPostContent}
                multiline={true}
                textAlignVertical="top"
              />
              
              {selectedImage && (
                <View style={styles.selectedImageContainer}>
                  <Image 
                    source={{ uri: selectedImage }} 
                    style={styles.selectedImagePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.imageSelectButton}
                onPress={selectImage}
              >
                <Text style={styles.imageSelectText}>📷 이미지 추가</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModalContent, responsiveStyles.detailModalContent]}>
            {selectedPost && (
              <>
                <View style={[styles.detailModalHeader, responsiveStyles.detailModalHeader]}>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                    <Text style={[styles.backText, responsiveStyles.backText]}>← 뒤로</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={[styles.detailModalBody, responsiveStyles.detailModalBody]}>
                  <View style={[styles.detailPostCard, responsiveStyles.detailPostCard]}>
                    <View style={[styles.postHeader, responsiveStyles.postHeader]}>
                      <TouchableOpacity style={styles.authorInfo} onPress={() => handleProfilePress(selectedPost.authorEmail)}>
                        <View style={styles.authorAvatar}>
                          {(selectedPost.authorImage || (currentUser && (selectedPost.author === currentUser.name || selectedPost.author === currentUser.email || selectedPost.author === "나"))) ? (
                            <Image 
                              source={{ uri: selectedPost.authorImage || currentUser?.profileImage }} 
                              style={styles.authorAvatarImage}
                            />
                          ) : (
                            <Text style={styles.authorAvatarText}>
                              {selectedPost.author.charAt(0)}
                            </Text>
                          )}
                        </View>
                        <View style={styles.authorTextContainer}>
                          <Text style={styles.authorName}>{selectedPost.author}</Text>
                          <Text style={styles.postDate}>{selectedPost.date}</Text>
                        </View>
                        
                        {currentUser?.email === 'drda00001@gmail.com' && selectedPost.authorEmail !== currentUser.email && (
                          <TouchableOpacity 
                            style={styles.messageButton}
                            onPress={() => {
                              console.log('[FRONTEND] 메시지 버튼 클릭 - 상세보기:', {
                                author: selectedPost.author,
                                authorEmail: selectedPost.authorEmail,
                                postId: selectedPost.id
                              });
                              handleMessagePress(selectedPost.authorEmail || selectedPost.author);
                            }}
                          >
                            <Text style={styles.messageButtonText}>💬</Text>
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={[styles.detailPostTitle, responsiveStyles.detailPostTitle]}>{selectedPost.title}</Text>
                    <Text style={[styles.detailPostContent, responsiveStyles.detailPostContent]}>{selectedPost.content}</Text>
                    
                    {selectedPost.image && (
                      <TouchableOpacity onPress={() => handleImagePress(selectedPost.image)}>
                        <Image 
                          source={{ uri: selectedPost.image }} 
                          style={[styles.detailImage, responsiveStyles.detailImage]}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    )}
                    
                    <View style={[styles.detailPostFooter, responsiveStyles.detailPostFooter]}>
                      <TouchableOpacity 
                        style={styles.likeButton}
                        onPress={() => handleLikePost(selectedPost.id)}
                      >
                        <Image
                          source={selectedPost.likedByUser ? require('./assets/heart.png') : require('./assets/unheart.png')}
                          style={[styles.likeIcon, selectedPost.likedByUser && styles.likedIcon]}
                        />
                        <Text style={styles.likeCount}>{selectedPost.likes}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={[styles.commentsSection, responsiveStyles.commentsSection]}>
                    <Text style={[styles.commentsTitle, responsiveStyles.commentsTitle]}>댓글 {selectedPost.comments.length}개</Text>
                    
                    {selectedPost.comments.map((comment) => (
                      <View key={comment.id} style={[styles.commentCard, responsiveStyles.commentCard]}>
                        <View style={[styles.commentHeader, responsiveStyles.commentHeader]}>
                          <View style={styles.authorInfo}>
                            <View style={[styles.commentAvatar, responsiveStyles.commentAvatar]}>
                              {(comment.authorImage || (currentUser && (comment.author === currentUser.name || comment.author === currentUser.email || comment.author === "나"))) ? (
                                <Image 
                                  source={{ uri: comment.authorImage || currentUser?.profileImage }} 
                                  style={[styles.commentAvatarImage, responsiveStyles.commentAvatarImage]}
                                />
                              ) : (
                                <Text style={[styles.commentAvatarText, responsiveStyles.commentAvatarText]}>
                                  {comment.author.charAt(0)}
                                </Text>
                              )}
                            </View>
                            <View>
                              <Text style={[styles.commentAuthor, responsiveStyles.commentAuthor]}>{comment.author}</Text>
                              <Text style={[styles.commentDate, responsiveStyles.commentDate]}>{comment.date}</Text>
                            </View>
                          </View>
                          
                          <TouchableOpacity 
                            style={[styles.commentLikeButton, responsiveStyles.commentLikeButton]}
                            onPress={() => handleLikeComment(comment.id)}
                          >
                            <Image
                              source={comment.likedByUser ? require('./assets/heart.png') : require('./assets/unheart.png')}
                              style={[styles.commentLikeIcon, responsiveStyles.commentLikeIcon, comment.likedByUser && styles.likedIcon]}
                            />
                            <Text style={[styles.commentLikeCount, responsiveStyles.commentLikeCount]}>{comment.likes}</Text>
                          </TouchableOpacity>
                        </View>
                        
                        <Text style={[styles.commentContent, responsiveStyles.commentContent]}>
                          {comment.content}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
                
                <View style={[styles.commentInputContainer, responsiveStyles.commentInputContainer]}>
                  <TextInput
                    style={[styles.commentInput, responsiveStyles.commentInput]}
                    placeholder="댓글을 입력하세요..."
                    placeholderTextColor="#999"
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline={true}
                    maxLength={500}
                  />
                  <TouchableOpacity 
                    style={[styles.commentSubmitButton, responsiveStyles.commentSubmitButton]}
                    onPress={handleAddComment}
                  >
                    <Text style={[styles.commentSubmitText, responsiveStyles.commentSubmitText]}>전송</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

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
              {selectedImageUrl && (
                <Image 
                  source={{ uri: selectedImageUrl }} 
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

      <Modal
        visible={showMessageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.messageModalContent}>
            <View style={styles.messageModalHeader}>
              <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <Text style={styles.messageModalTitle}>메시지 보내기</Text>
              <TouchableOpacity onPress={sendMessage}>
                <Text style={styles.sendText}>전송</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.messageModalBody}>
              <Text style={styles.recipientText}>받는 사람: {messageRecipient}</Text>
              
              <TextInput
                style={styles.messageInput}
                placeholder="메시지를 입력하세요..."
                placeholderTextColor="#999"
                value={messageContent}
                onChangeText={setMessageContent}
                multiline={true}
                textAlignVertical="top"
                maxLength={500}
              />
              
              <Text style={styles.characterCount}>{messageContent.length}/500</Text>
            </View>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </OrientationLock>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  // 헤더 스타일 - Main.js와 완전 동일
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hamburgerButton: { width: 24, height: 24, justifyContent: 'space-between', paddingVertical: 2 },
  hamburgerLine: { width: '100%', height: 3, backgroundColor: '#333', borderRadius: 2 },
  title: { fontSize: 26, fontWeight: '700', color: '#000' },
  homeText: { fontSize: 16, fontWeight: '500', color: '#000' },
  profileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  profileImage: { width: 44, height: 44, borderRadius: 22 },
  defaultProfileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center' },
  profileText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  
  // 컨테이너 및 사이드바 스타일 - Main.js와 완전 동일
  container: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 320, backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 24, borderRightWidth: 1, borderRightColor: '#E5E5E5' },
  mobileSidebar: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000, flexDirection: 'row' },
  mobileSidebarContent: { width: '80%', backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 24, paddingTop: 40, shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 10 },
  mobileSidebarOverlay: { flex: 1 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 25, marginBottom: 24, paddingHorizontal: 16, height: 44 },
  searchIconText: { fontSize: 14, color: '#999', marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#000' },
  subjectList: { flex: 1, gap: 4 },
  subjectItem: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10 },
  activeSubjectItem: { backgroundColor: '#F0F0F0' },
  subjectText: { fontSize: 16, color: '#666', fontWeight: '400' },
  activeSubjectText: { color: '#000', fontWeight: '600' },
  bottomDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 24 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D0D0D0' },
  activeDot: { backgroundColor: '#666' },
  
  // 메인 콘텐츠
  mainContent: { flex: 1, backgroundColor: '#FFFFFF' },
  mainContentExpanded: { paddingLeft: 16 },
  scrollContentContainer: { padding: 32, gap: 32, paddingBottom: 64 },
  communityHeader: { padding: screenWidth < 768 ? 16 : 32, paddingBottom: screenWidth < 768 ? 12 : 24, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  communityTitle: { fontSize: screenWidth < 768 ? 22 : 28, fontWeight: '700', color: '#000', marginBottom: 8 },
  communitySubtitle: { fontSize: 16, color: '#666', fontWeight: '400' },
  postsContainer: { flex: 1, padding: screenWidth < 768 ? 4 : 24 },
  postCard: { backgroundColor: 'white', borderRadius: screenWidth < 768 ? 12 : 16, padding: screenWidth < 768 ? 16 : 20, paddingLeft: screenWidth < 768 ? 16 : 20, marginBottom: screenWidth < 768 ? 16 : 16, minHeight: screenWidth < 768 ? 160 : 'auto', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#F0F0F0', position: 'relative', overflow: 'hidden' },
  postSnowContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none' },
  postHeader: { marginBottom: 16, maxWidth: screenWidth < 768 ? '50%' : '100%', position: 'relative', zIndex: 10 },
  authorInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, position: 'relative', zIndex: 10 },
  authorTextContainer: { flex: 1, position: 'relative', zIndex: 10 },
  messageButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center', marginLeft: 8, position: 'relative', zIndex: 10 },
  messageButtonText: { fontSize: 18 },
  authorAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 10 },
  authorAvatarText: { fontSize: 16, fontWeight: '600', color: 'white' },
  authorAvatarImage: { width: 40, height: 40, borderRadius: 20 },
  authorName: { fontSize: 14, fontWeight: '600', color: '#000', position: 'relative', zIndex: 10 },
  postDate: { fontSize: 12, color: '#999', marginTop: 2, position: 'relative', zIndex: 10 },
  postTitle: { fontSize: 18, fontWeight: '600', color: '#000', marginBottom: 12, maxWidth: screenWidth < 768 ? '50%' : '100%', position: 'relative', zIndex: 10 },
  postPreview: { fontSize: 15, color: '#333', lineHeight: 22, marginBottom: 16, maxWidth: screenWidth < 768 ? '50%' : '100%', position: 'relative', zIndex: 10 },
  postImage: { width: 120, height: 120, borderRadius: 8, backgroundColor: '#F8F9FA', marginLeft: 8, marginBottom: 12, alignSelf: 'flex-start', position: 'relative', zIndex: 10 },
  postFooter: { flexDirection: 'row', alignItems: 'center', gap: 20, position: 'relative', zIndex: 10 },
  likeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, position: 'relative', zIndex: 10 },
  likeIcon: { width: 28, height: 28, position: 'relative', zIndex: 10 },
  likedIcon: { fontSize: 16 },
  likeCount: { fontSize: 14, color: '#666', fontWeight: '500', position: 'relative', zIndex: 10 },
  commentInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, position: 'relative', zIndex: 10 },
  commentIcon: { width: 20, height: 20, position: 'relative', zIndex: 10 },
  commentCount: { fontSize: 14, color: '#666', fontWeight: '500', position: 'relative', zIndex: 10 },
  fab: { position: 'absolute', right: screenWidth < 768 ? 16 : 24, bottom: screenWidth < 768 ? 16 : 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, zIndex: 1500 },
  fabText: { fontSize: 24, color: 'white', fontWeight: '300' },
  
  // 모달 스타일
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  createModalContent: { flex: 1, backgroundColor: 'white', marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  createModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  cancelText: { fontSize: 16, color: '#666', fontWeight: '500' },
  createModalTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  postText: { fontSize: 16, color: '#4285F4', fontWeight: '600' },
  createModalBody: { flex: 1, padding: 20 },
  titleInput: { fontSize: 18, fontWeight: '600', color: '#000', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', paddingVertical: 16, marginBottom: 20 },
  contentInput: { fontSize: 16, color: '#000', minHeight: 120, textAlignVertical: 'top', marginBottom: 20 },
  selectedImageContainer: { marginBottom: 20, position: 'relative' },
  selectedImagePreview: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#f0f0f0' },
  removeImageButton: { position: 'absolute', top: 10, right: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  removeImageText: { fontSize: 14, color: 'white', fontWeight: 'bold' },
  imageSelectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#F8F9FA', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 20 },
  imageSelectText: { fontSize: 16, color: '#4285F4', fontWeight: '500' },
  detailModalContent: { flex: 1, backgroundColor: 'white', marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  detailModalHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backText: { fontSize: 16, color: '#4285F4', fontWeight: '500' },
  detailModalBody: { flex: 1, padding: 20 },
  detailPostCard: { backgroundColor: 'white', marginBottom: 24, position: 'relative', overflow: 'hidden', borderRadius: 12 },
  detailPostTitle: { fontSize: 22, fontWeight: '700', color: '#000', marginBottom: 16 },
  detailPostContent: { fontSize: 16, color: '#333', lineHeight: 24, marginBottom: 20 },
  detailImage: { width: 180, height: 180, borderRadius: 12, backgroundColor: '#F8F9FA', marginLeft: 8, marginBottom: 16, alignSelf: 'flex-start' },
  detailPostFooter: { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 16 },
  commentsSection: { gap: 16 },
  commentsTitle: { fontSize: 18, fontWeight: '600', color: '#000', marginBottom: 8 },
  commentCard: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, marginBottom: 12, position: 'relative', overflow: 'hidden' },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, position: 'relative', zIndex: 2 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#34A853', justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { fontSize: 14, fontWeight: '600', color: 'white' },
  commentAvatarImage: { width: 32, height: 32, borderRadius: 16 },
  commentAuthor: { fontSize: 14, fontWeight: '600', color: '#000' },
  commentDate: { fontSize: 12, color: '#999', marginTop: 2 },
  commentContent: { fontSize: 15, position: 'relative', zIndex: 2, color: '#333', lineHeight: 20 },
  commentLikeButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentLikeIcon: { width: 22, height: 22 },
  commentLikeCount: { fontSize: 12, color: '#666' },
  commentInputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 20, borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: 'white', gap: 12 },
  commentInput: { flex: 1, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#000', maxHeight: 100 },
  commentSubmitButton: { backgroundColor: '#4285F4', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12 },
  commentSubmitText: { fontSize: 15, color: 'white', fontWeight: '600' },
  imageModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' },
  imageModalCloseArea: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  imageModalContainer: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', padding: 20 },
  fullScreenImage: { width: '100%', height: '100%' },
  closeButton: { position: 'absolute', top: 50, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.8)', justifyContent: 'center', alignItems: 'center' },
  closeButtonText: { fontSize: 18, color: '#000', fontWeight: 'bold' },
  messageModalContent: { flex: 1, backgroundColor: 'white', marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  messageModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  messageModalTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  sendText: { fontSize: 16, color: '#4285F4', fontWeight: '600' },
  messageModalBody: { flex: 1, padding: 20 },
  recipientText: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 20 },
  messageInput: { flex: 1, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 16, fontSize: 16, color: '#000', textAlignVertical: 'top', minHeight: 120 },
  characterCount: { fontSize: 12, color: '#999', textAlign: 'right', marginTop: 8 },
  
  // 핸드폰 전용 스타일
  phoneContainer: {
    flexDirection: 'column',
  },
  phoneMainContent: {
    flex: 1,
    paddingHorizontal: 12,
  },
  phoneScrollContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  phoneHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  
  // 태블릿 전용 스타일 (기존 스타일의 85% 크기와 간격)
  tabletContainer: {
    flexDirection: 'row',
  },
  tabletMainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabletScrollContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  tabletHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  tabletPostCard: {
    padding: 17,
    marginBottom: 13,
  },
  tabletPostTitle: {
    fontSize: 18,
    marginBottom: 11,
  },
  tabletPostContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 11,
  },
  tabletSectionTitle: {
    fontSize: 20,
    marginBottom: 14,
  },
});

// 반응형 스타일 함수 추가
const getResponsiveStyles = () => {
  const { width, height } = Dimensions.get('window');
  
  // 더 작은 핸드폰 (width < 360)
  if (width < 360) {
    return {
      header: { paddingHorizontal: 12, paddingVertical: 10 },
      title: { fontSize: 22 },
      homeText: { fontSize: 14 },
      profileIcon: { width: 36, height: 36, borderRadius: 18 },
      profileImage: { width: 36, height: 36, borderRadius: 18 },
      defaultProfileIcon: { width: 36, height: 36, borderRadius: 18 },
      profileText: { fontSize: 14 },
      sidebar: { width: 260 },
      mobileSidebarContent: { width: '75%', paddingHorizontal: 16 },
      searchContainer: { height: 38, paddingHorizontal: 12, marginBottom: 18 },
      searchIconText: { fontSize: 12 },
      searchInput: { fontSize: 13 },
      subjectItem: { paddingVertical: 10, paddingHorizontal: 12 },
      subjectText: { fontSize: 14 },
      communityHeader: { padding: 12, paddingBottom: 10 },
      communityTitle: { fontSize: 18, marginBottom: 6 },
      communitySubtitle: { fontSize: 13 },
      postsContainer: { padding: 8 },
      postCard: { borderRadius: 10, padding: 12, paddingLeft: 12, marginBottom: 12, minHeight: 140 },
      postHeader: { marginBottom: 12 },
      authorAvatar: { width: 36, height: 36, borderRadius: 18 },
      authorAvatarText: { fontSize: 15 },
      authorAvatarImage: { width: 36, height: 36, borderRadius: 18 },
      authorName: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
      postDate: { fontSize: 11, marginTop: 3 },
      postTitle: { fontSize: 15, marginBottom: 10 },
      postPreview: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
      postImage: { width: 100, height: 100, borderRadius: 6 },
      likeIcon: { width: 24, height: 24 },
      likeCount: { fontSize: 12 },
      commentIcon: { width: 18, height: 18 },
      commentCount: { fontSize: 12 },
      fab: { right: 12, bottom: 12, width: 48, height: 48, borderRadius: 24 },
      fabText: { fontSize: 20 },
      messageButton: { width: 32, height: 32, borderRadius: 16 },
      messageButtonText: { fontSize: 14 },
    };
  }
  
  // 일반 핸드폰 (360 <= width < 768)
  if (width < 768) {
    return {
      header: { paddingHorizontal: 16, paddingVertical: 12 },
      title: { fontSize: 24 },
      homeText: { fontSize: 15 },
      communityHeader: { padding: 16, paddingBottom: 12 },
      communityTitle: { fontSize: 22, marginBottom: 8 },
      communitySubtitle: { fontSize: 15 },
      postsContainer: { padding: 12 },
      postCard: { borderRadius: 12, padding: 16, paddingLeft: 16, marginBottom: 16, minHeight: 160 },
      authorAvatar: { width: 40, height: 40, borderRadius: 20 },
      authorAvatarText: { fontSize: 16 },
      authorAvatarImage: { width: 40, height: 40, borderRadius: 20 },
      authorName: { fontSize: 14, fontWeight: '700', letterSpacing: 0.4, color: '#1a1a1a' },
      postDate: { fontSize: 12, marginTop: 4, color: '#888' },
      fab: { right: 16, bottom: 16 },
      detailModalContent: { marginTop: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
      detailModalHeader: { padding: 16, paddingTop: Platform.OS === 'ios' ? 24 : 16 },
      backText: { fontSize: 15 },
      detailModalBody: { padding: 16 },
      detailPostCard: { marginBottom: 20, borderRadius: 10 },
      detailPostTitle: { fontSize: 20, marginBottom: 14 },
      detailPostContent: { fontSize: 15, lineHeight: 22, marginBottom: 18 },
      detailImage: { width: 150, height: 150, borderRadius: 10, marginBottom: 14 },
      detailPostFooter: { paddingTop: 14 },
      commentsSection: { gap: 14 },
      commentsTitle: { fontSize: 16, marginBottom: 6 },
      commentCard: { borderRadius: 10, padding: 14, marginBottom: 10 },
      commentHeader: { marginBottom: 10 },
      commentAvatar: { width: 28, height: 28, borderRadius: 14 },
      commentAvatarText: { fontSize: 13 },
      commentAvatarImage: { width: 28, height: 28, borderRadius: 14 },
      commentAuthor: { fontSize: 13 },
      commentDate: { fontSize: 11 },
      commentContent: { fontSize: 14, lineHeight: 19 },
      commentLikeButton: { gap: 3 },
      commentLikeIcon: { width: 20, height: 20 },
      commentLikeCount: { fontSize: 11 },
      commentInputContainer: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16, gap: 10 },
      commentInput: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 90 },
      commentSubmitButton: { borderRadius: 18, paddingHorizontal: 18, paddingVertical: 10 },
      commentSubmitText: { fontSize: 14 },
    };
  }
  
  // 작은 태블릿 (768 <= width < 1024)
  if (width < 1024) {
    return {
      header: { paddingHorizontal: 20, paddingVertical: 14 },
      title: { fontSize: 24 },
      homeText: { fontSize: 15 },
      sidebar: { width: 280 },
      searchContainer: { height: 40, paddingHorizontal: 14, marginBottom: 20 },
      subjectItem: { paddingVertical: 12, paddingHorizontal: 14 },
      subjectText: { fontSize: 15 },
      communityHeader: { padding: 24, paddingBottom: 18 },
      communityTitle: { fontSize: 24, marginBottom: 10 },
      communitySubtitle: { fontSize: 15 },
      scrollContentContainer: { padding: 24, gap: 24 },
      postsContainer: { padding: 18 },
      postCard: { borderRadius: 14, padding: 17, marginBottom: 13 },
      postTitle: { fontSize: 16, marginBottom: 10 },
      postPreview: { fontSize: 14, lineHeight: 20, marginBottom: 13 },
      postImage: { width: 110, height: 110 },
      fab: { right: 20, bottom: 20, width: 52, height: 52, borderRadius: 26 },
      fabText: { fontSize: 22 },
    };
  }
  
  // 큰 태블릿 (1024 <= width < 1440)
  if (width < 1440) {
    return {
      header: { paddingHorizontal: 24, paddingVertical: 16 },
      title: { fontSize: 26 },
      homeText: { fontSize: 16 },
      sidebar: { width: 320 },
      searchContainer: { height: 44, paddingHorizontal: 16, marginBottom: 24 },
      subjectItem: { paddingVertical: 14, paddingHorizontal: 16 },
      subjectText: { fontSize: 16 },
      communityHeader: { padding: 32, paddingBottom: 24 },
      communityTitle: { fontSize: 28, marginBottom: 8 },
      communitySubtitle: { fontSize: 16 },
      scrollContentContainer: { padding: 32, gap: 32 },
      postsContainer: { padding: 24 },
      postCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
      postTitle: { fontSize: 18, marginBottom: 12 },
      postPreview: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
      postImage: { width: 120, height: 120 },
      fab: { right: 24, bottom: 24, width: 56, height: 56, borderRadius: 28 },
      fabText: { fontSize: 24 },
    };
  }
  
  // 데스크톱 (width >= 1440)
  return {
    header: { paddingHorizontal: 32, paddingVertical: 18 },
    title: { fontSize: 28 },
    homeText: { fontSize: 17 },
    sidebar: { width: 360 },
    searchContainer: { height: 48, paddingHorizontal: 18, marginBottom: 28 },
    subjectItem: { paddingVertical: 16, paddingHorizontal: 18 },
    subjectText: { fontSize: 17 },
    communityHeader: { padding: 40, paddingBottom: 28 },
    communityTitle: { fontSize: 32, marginBottom: 10 },
    communitySubtitle: { fontSize: 17 },
    scrollContentContainer: { padding: 40, gap: 40 },
    postsContainer: { padding: 32 },
    postCard: { borderRadius: 18, padding: 24, marginBottom: 20 },
    postHeader: { marginBottom: 18 },
    authorAvatar: { width: 44, height: 44, borderRadius: 22 },
    authorAvatarText: { fontSize: 17 },
    authorAvatarImage: { width: 44, height: 44, borderRadius: 22 },
    authorName: { fontSize: 15 },
    postDate: { fontSize: 13 },
    postTitle: { fontSize: 20, marginBottom: 14 },
    postPreview: { fontSize: 16, lineHeight: 24, marginBottom: 18 },
    postImage: { width: 140, height: 140 },
    likeIcon: { width: 30, height: 30 },
    likeCount: { fontSize: 15 },
    commentIcon: { width: 22, height: 22 },
    commentCount: { fontSize: 15 },
    fab: { right: 32, bottom: 32, width: 64, height: 64, borderRadius: 32 },
    fabText: { fontSize: 28 },
    messageButton: { width: 44, height: 44, borderRadius: 22 },
    messageButtonText: { fontSize: 20 },
  };
};