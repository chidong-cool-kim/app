import React, { useState, useEffect } from 'react';
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
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userDataService from './userDataService';
import MobileSafeArea from './components/MobileSafeArea';
import * as ImagePicker from 'expo-image-picker';
import SnowEffect from './components/SnowEffect';
import AutumnLeavesEffect from './components/AutumnLeavesEffect';
import RainEffect from './components/RainEffect';
import UserProfileModal from './components/UserProfileModal';
import effectSettingsService from './services/EffectSettingsService';

const API_URL = 'http://192.168.45.53:5000';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function Community() {
  const navigation = useNavigation();
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
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [isProfileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [effectSettings, setEffectSettings] = useState({
    snowEffect: false,
    autumnEffect: false,
    isPremiumUser: false,
    effectIntensity: 30,
  });

  const subjects = [
    { name: '홈', active: activeSubject === '홈' },
    { name: '타이머', active: activeSubject === '타이머' },
    { name: '플래너', active: activeSubject === '플래너' },
    { name: 'AI', active: activeSubject === 'AI' },
    { name: '스터디그룹 찾기', active: activeSubject === '스터디그룹 찾기' },
    { name: '커뮤니티', active: activeSubject === '커뮤니티' },
    { name: '스토어', active: activeSubject === '스토어' },
  ];

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

  const loadUserInfo = async () => {
    try {
      const updatedUser = await userDataService.refreshCurrentUser();
      if (updatedUser) {
        setCurrentUser(updatedUser);
        const isPremium = updatedUser.subscription?.isActive || false;
        await effectSettingsService.setPremiumStatus(isPremium);
        await loadEffectSettings();
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
    
    switch(subjectName) {
      case '홈':
        navigation.navigate('Main');
        break;
      case '타이머':
        navigation.navigate('Timer');
        break;
      case '필기':
        navigation.navigate('Note');
        break;
      case '플래너':
        navigation.navigate("Planner");
        break;
      case 'AI':
        navigation.navigate('AI');
        break;
      case '스터디그룹 찾기':
        navigation.navigate('StudyGroup');
        break;
      case '커뮤니티':
        break;
      case '스토어':
        navigation.navigate('Store');
        break;
      default:
        break;
    }
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
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

  return (
    <MobileSafeArea style={styles.safeArea} backgroundColor="#f5f5f5">
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
          
          <Text style={styles.title}>StudyTime</Text>
          <Text style={styles.homeText}>커뮤니티</Text>
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
            <Text style={styles.profileText}>
              {currentUser?.name?.charAt(0) || currentUser?.email?.charAt(0) || '?'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {sidebarVisible && (
          <View style={styles.sidebar}>
            <View style={styles.searchContainer}>
              <View style={styles.searchIcon}>
                <Text style={styles.searchIconText}>🔍</Text>
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="검색"
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            <View style={styles.subjectList}>
              {subjects.map((subject, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.subjectItem,
                    subject.active && styles.activeSubjectItem
                  ]}
                  onPress={() => handleSubjectPress(subject.name)}
                >
                  <Text style={[
                    styles.subjectText,
                    subject.active && styles.activeSubjectText
                  ]}>
                    {subject.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.bottomDots}>
              <View style={[styles.dot, styles.activeDot]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          </View>
        )}

        <View style={[styles.mainContent, !sidebarVisible && styles.mainContentExpanded]}>
          <View style={styles.communityHeader}>
            <Text style={styles.communityTitle}>커뮤니티</Text>
            <Text style={styles.communitySubtitle}>함께 공부하며 지식을 나눠보세요</Text>
          </View>

          <ScrollView 
            style={styles.postsContainer}
            showsVerticalScrollIndicator={false}
          >
            {posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postCard}
                onPress={() => handlePostPress(post)}
                activeOpacity={0.8}
              >
                {post.hasRainEffect ? (
                  <View style={styles.postSnowContainer}>
                    <RainEffect active={true} intensity={20} duration={2000} />
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
                <View style={styles.postHeader}>
                  <TouchableOpacity style={styles.authorInfo} onPress={() => handleProfilePress(post.authorEmail)}>
                    <View style={styles.authorAvatar}>
                      {(post.authorImage || (currentUser && (post.author === currentUser.name || post.author === currentUser.email || post.author === "나"))) ? (
                        <Image 
                          source={{ 
                            uri: post.authorImage && post.authorImage.startsWith('/uploads/') 
                              ? `http://192.168.45.53:5000${post.authorImage}` 
                              : (post.authorImage || currentUser?.profileImage)
                          }} 
                          style={styles.authorAvatarImage}
                          onError={(error) => {
                            console.log('게시글 작성자 이미지 로드 실패:', error.nativeEvent.error);
                          }}
                        />
                      ) : (
                        <Text style={styles.authorAvatarText}>
                          {post.author.charAt(0)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.authorTextContainer}>
                      <Text style={styles.authorName}>{post.author}</Text>
                      <Text style={styles.postDate}>{post.date}</Text>
                    </View>
                    
                    {currentUser?.email === 'drda00001@gmail.com' && post.authorEmail !== currentUser.email && (
                      <TouchableOpacity 
                        style={styles.messageButton}
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
                        <Text style={styles.messageButtonText}>💬</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postPreview} numberOfLines={2}>
                  {post.content}
                </Text>
                
                {post.image && (
                  <TouchableOpacity onPress={() => handleImagePress(post.image)}>
                    <Image 
                      source={{ uri: post.image }} 
                      style={styles.postImage}
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
                      style={[styles.likeIcon, post.likedByUser && styles.likedIcon]}
                    />
                    <Text style={styles.likeCount}>{post.likes}</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.commentInfo}>
                    <Image
                      source={require('./assets/chat.png')}
                      style={styles.commentIcon}
                    />
                    <Text style={styles.commentCount}>{post.comments.length}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.fab}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.fabText}>+</Text>
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
          <View style={styles.detailModalContent}>
            {selectedPost && (
              <>
                <View style={styles.detailModalHeader}>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                    <Text style={styles.backText}>← 뒤로</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.detailModalBody}>
                  <View style={styles.detailPostCard}>
                    {selectedPost.hasRainEffect ? (
                      <View style={styles.postSnowContainer}>
                        <RainEffect active={true} intensity={20} duration={2000} />
                      </View>
                    ) : selectedPost.hasAutumnEffect ? (
                      <View style={styles.postSnowContainer}>
                        <AutumnLeavesEffect active={true} intensity={18} duration={8000} />
                      </View>
                    ) : selectedPost.hasSnowEffect ? (
                      <View style={styles.postSnowContainer}>
                        <SnowEffect 
                          active={true} 
                          intensity={25} 
                          duration={6000}
                        />
                      </View>
                    ) : null}
                    <View style={styles.postHeader}>
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
                    
                    <Text style={styles.detailPostTitle}>{selectedPost.title}</Text>
                    <Text style={styles.detailPostContent}>{selectedPost.content}</Text>
                    
                    {selectedPost.image && (
                      <TouchableOpacity onPress={() => handleImagePress(selectedPost.image)}>
                        <Image 
                          source={{ uri: selectedPost.image }} 
                          style={styles.detailImage}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    )}
                    
                    <View style={styles.detailPostFooter}>
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
                  
                  <View style={styles.commentsSection}>
                    <Text style={styles.commentsTitle}>댓글 {selectedPost.comments.length}개</Text>
                    
                    {selectedPost.comments.map((comment) => (
                      <View key={comment.id} style={styles.commentCard}>
                        {comment.hasAutumnEffect ? (
                          <View style={styles.commentSnowContainer}>
                            <AutumnLeavesEffect 
                              active={true} 
                              intensity={12} 
                              duration={4000}
                            />
                          </View>
                        ) : comment.hasSnowEffect ? (
                          <View style={styles.commentSnowContainer}>
                            <SnowEffect 
                              active={true} 
                              intensity={15} 
                              duration={5000}
                            />
                          </View>
                        ) : null}
                        <View style={styles.commentHeader}>
                          <View style={styles.authorInfo}>
                            <View style={styles.commentAvatar}>
                              {(comment.authorImage || (currentUser && (comment.author === currentUser.name || comment.author === currentUser.email || comment.author === "나"))) ? (
                                <Image 
                                  source={{ uri: comment.authorImage || currentUser?.profileImage }} 
                                  style={styles.commentAvatarImage}
                                />
                              ) : (
                                <Text style={styles.commentAvatarText}>
                                  {comment.author.charAt(0)}
                                </Text>
                              )}
                            </View>
                            <View>
                              <Text style={styles.commentAuthor}>{comment.author}</Text>
                              <Text style={styles.commentDate}>{comment.date}</Text>
                            </View>
                          </View>
                          
                          <TouchableOpacity 
                            style={styles.commentLikeButton}
                            onPress={() => handleLikeComment(comment.id)}
                          >
                            <Image
                              source={comment.likedByUser ? require('./assets/heart.png') : require('./assets/unheart.png')}
                              style={[styles.commentLikeIcon, comment.likedByUser && styles.likedIcon]}
                            />
                            <Text style={styles.commentLikeCount}>{comment.likes}</Text>
                          </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.commentContent}>
                          {comment.content}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
                
                <View style={styles.commentInputContainer}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="댓글을 입력하세요..."
                    placeholderTextColor="#999"
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline={true}
                    maxLength={500}
                  />
                  <TouchableOpacity 
                    style={styles.commentSubmitButton}
                    onPress={handleAddComment}
                  >
                    <Text style={styles.commentSubmitText}>전송</Text>
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
    </MobileSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  title: { fontSize: 26, fontWeight: '700', color: '#000' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hamburgerButton: { width: 24, height: 24, justifyContent: 'space-between', paddingVertical: 2 },
  hamburgerLine: { width: '100%', height: 3, backgroundColor: '#333', borderRadius: 2 },
  homeText: { fontSize: 16, fontWeight: '500', color: '#000' },
  profileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  profileText: { fontSize: 9, color: '#666', fontWeight: '400' },
  profileImage: { width: 44, height: 44, borderRadius: 22 },
  container: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 320, backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 24, borderRightWidth: 1, borderRightColor: '#E5E5E5' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 25, marginBottom: 24, paddingHorizontal: 16, height: 44 },
  searchIcon: { marginRight: 8 },
  searchIconText: { fontSize: 14, color: '#999' },
  searchInput: { flex: 1, fontSize: 15, color: '#000' },
  subjectList: { flex: 1, gap: 4 },
  subjectItem: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10 },
  activeSubjectItem: { backgroundColor: '#F0F0F0' },
  subjectText: { fontSize: 16, color: '#666', fontWeight: '400' },
  activeSubjectText: { color: '#000', fontWeight: '600' },
  bottomDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 24 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D0D0D0' },
  activeDot: { backgroundColor: '#666' },
  mainContent: { flex: 1, backgroundColor: 'white' },
  mainContentExpanded: { paddingLeft: 16 },
  communityHeader: { padding: 32, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  communityTitle: { fontSize: 28, fontWeight: '700', color: '#000', marginBottom: 8 },
  communitySubtitle: { fontSize: 16, color: '#666', fontWeight: '400' },
  postsContainer: { flex: 1, padding: 24 },
  postCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#F0F0F0', position: 'relative', overflow: 'hidden' },
  postSnowContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, pointerEvents: 'none' },
  postHeader: { marginBottom: 16 },
  authorInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  authorTextContainer: { flex: 1 },
  messageButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  messageButtonText: { fontSize: 18 },
  authorAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center' },
  authorAvatarText: { fontSize: 16, fontWeight: '600', color: 'white' },
  authorAvatarImage: { width: 40, height: 40, borderRadius: 20 },
  authorName: { fontSize: 14, fontWeight: '600', color: '#000' },
  postDate: { fontSize: 12, color: '#999', marginTop: 2 },
  postTitle: { fontSize: 18, fontWeight: '600', color: '#000', marginBottom: 12 },
  postPreview: { fontSize: 15, color: '#333', lineHeight: 22, marginBottom: 16 },
  postImageContainer: { marginBottom: 16 },
  postImage: { width: 120, height: 120, borderRadius: 8, backgroundColor: '#F8F9FA', marginLeft: 8, marginBottom: 12, alignSelf: 'flex-start' },
  postImagePlaceholder: { height: 120, backgroundColor: '#F8F9FA', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  imageText: { fontSize: 24, color: '#999' },
  postFooter: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  likeButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  likeIcon: { width: 28, height: 28 },
  likedIcon: { fontSize: 16 },
  likeCount: { fontSize: 14, color: '#666', fontWeight: '500' },
  commentInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentIcon: { width: 20, height: 20 },
  commentCount: { fontSize: 14, color: '#666', fontWeight: '500' },
  fab: { position: 'absolute', right: 24, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabText: { fontSize: 24, color: 'white', fontWeight: '300' },
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
  selectedImageText: { fontSize: 16, color: '#666' },
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
  detailImageContainer: { marginBottom: 20 },
  detailImage: { width: 180, height: 180, borderRadius: 12, backgroundColor: '#F8F9FA', marginLeft: 8, marginBottom: 16, alignSelf: 'flex-start' },
  detailImagePlaceholder: { height: 200, backgroundColor: '#F8F9FA', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  detailPostFooter: { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 16 },
  commentsSection: { gap: 16 },
  commentsTitle: { fontSize: 18, fontWeight: '600', color: '#000', marginBottom: 8 },
  commentCard: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, marginBottom: 12, position: 'relative', overflow: 'hidden' },
  commentSnowContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 12, overflow: 'hidden', zIndex: 1 },
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
});