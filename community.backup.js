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
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Community() {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [posts, setPosts] = useState([]); // 빈 배열로 시작
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [activeSubject, setActiveSubject] = useState('커뮤니티');
  const [sidebarVisible, setSidebarVisible] = useState(true);

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
    // 초기화 - 기존 저장된 데이터 무시하고 빈 배열로 시작
    setPosts([]);
  }, []);

  const loadPosts = async () => {
    try {
      const savedPosts = await AsyncStorage.getItem('communityPosts');
      if (savedPosts) {
        setPosts(JSON.parse(savedPosts));
      }
      // 초기 샘플 데이터 제거 - 빈 배열로 시작
    } catch (error) {
      console.error('게시글 로드 실패:', error);
    }
  };

  const savePosts = async (newPosts) => {
    try {
      await AsyncStorage.setItem('communityPosts', JSON.stringify(newPosts));
    } catch (error) {
      console.error('게시글 저장 실패:', error);
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
        // 이미 커뮤니티 화면이므로 아무것도 안 함
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

  const handleCreatePost = async () => {
    if (newPostTitle.trim() && newPostContent.trim()) {
      const currentDate = new Date();
      const dateString = `${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일`;
      
      const newPost = {
        id: Date.now(),
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        author: "나",
        date: dateString,
        likes: 0,
        comments: [],
        image: selectedImage,
        likedByUser: false
      };
      
      const newPosts = [newPost, ...posts];
      setPosts(newPosts);
      await savePosts(newPosts);
      
      // 초기화
      setShowCreateModal(false);
      setNewPostTitle('');
      setNewPostContent('');
      setSelectedImage(null);
    }
  };

  const handlePostPress = (post) => {
    setSelectedPost(post);
    setShowDetailModal(true);
  };

  const handleLikePost = async (postId) => {
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes: post.likedByUser ? post.likes - 1 : post.likes + 1,
          likedByUser: !post.likedByUser
        };
      }
      return post;
    });
    setPosts(updatedPosts);
    await savePosts(updatedPosts);
    
    // 상세보기에서도 업데이트
    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost(updatedPosts.find(p => p.id === postId));
    }
  };

  const handleAddComment = async () => {
    if (newComment.trim() && selectedPost) {
      const currentDate = new Date();
      const dateString = `${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일`;
      
      const comment = {
        id: Date.now(),
        author: "나",
        content: newComment.trim(),
        date: dateString,
        likes: 0
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
      
      setPosts(updatedPosts);
      await savePosts(updatedPosts);
      setSelectedPost(updatedPosts.find(p => p.id === selectedPost.id));
      setNewComment('');
    }
  };

  const handleLikeComment = async (commentId) => {
    const updatedPosts = posts.map(post => {
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
    
    setPosts(updatedPosts);
    await savePosts(updatedPosts);
    setSelectedPost(updatedPosts.find(p => p.id === selectedPost.id));
  };

  const selectImage = () => {
    // 실제 앱에서는 ImagePicker를 사용
    // 여기서는 샘플 이미지 URL 사용
    Alert.alert(
      "이미지 선택",
      "이미지를 선택하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "선택", 
          onPress: () => setSelectedImage("https://via.placeholder.com/300x200/4285F4/FFFFFF?text=Sample+Image")
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header - Main.js와 동일 */}
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
        <View style={styles.profileIcon}>
          <Text style={styles.profileText}>Username</Text>
        </View>
      </View>

      <View style={styles.container}>
        {/* Left Sidebar - Main.js와 동일 */}
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

        {/* Main Content Area */}
        <View style={[styles.mainContent, !sidebarVisible && styles.mainContentExpanded]}>
          {/* Community Header */}
          <View style={styles.communityHeader}>
            <Text style={styles.communityTitle}>커뮤니티</Text>
            <Text style={styles.communitySubtitle}>함께 공부하며 지식을 나눠보세요</Text>
          </View>

          {/* Posts List */}
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
                <View style={styles.postHeader}>
                  <View style={styles.authorInfo}>
                    <View style={styles.authorAvatar}>
                      <Text style={styles.authorAvatarText}>
                        {post.author.charAt(0)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.authorName}>{post.author}</Text>
                      <Text style={styles.postDate}>{post.date}</Text>
                    </View>
                  </View>
                </View>
                
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postPreview} numberOfLines={2}>
                  {post.content}
                </Text>
                
                {post.image && (
                  <View style={styles.postImageContainer}>
                    <View style={styles.postImagePlaceholder}>
                      <Text style={styles.imageText}>📷</Text>
                    </View>
                  </View>
                )}
                
                <View style={styles.postFooter}>
                  <TouchableOpacity 
                    style={styles.likeButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleLikePost(post.id);
                    }}
                  >
                    <Text style={[styles.likeIcon, post.likedByUser && styles.likedIcon]}>
                      {post.likedByUser ? '❤️' : '🤍'}
                    </Text>
                    <Text style={styles.likeCount}>{post.likes}</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.commentInfo}>
                    <Text style={styles.commentIcon}>💬</Text>
                    <Text style={styles.commentCount}>{post.comments.length}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Floating Action Button */}
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Create Post Modal */}
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
                  <View style={styles.selectedImagePlaceholder}>
                    <Text style={styles.selectedImageText}>선택된 이미지</Text>
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => setSelectedImage(null)}
                    >
                      <Text style={styles.removeImageText}>✕</Text>
                    </TouchableOpacity>
                  </View>
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

      {/* Post Detail Modal */}
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
                  {/* Post Content */}
                  <View style={styles.detailPostCard}>
                    <View style={styles.postHeader}>
                      <View style={styles.authorInfo}>
                        <View style={styles.authorAvatar}>
                          <Text style={styles.authorAvatarText}>
                            {selectedPost.author.charAt(0)}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.authorName}>{selectedPost.author}</Text>
                          <Text style={styles.postDate}>{selectedPost.date}</Text>
                        </View>
                      </View>
                    </View>
                    
                    <Text style={styles.detailPostTitle}>{selectedPost.title}</Text>
                    <Text style={styles.detailPostContent}>{selectedPost.content}</Text>
                    
                    {selectedPost.image && (
                      <View style={styles.detailImageContainer}>
                        <View style={styles.detailImagePlaceholder}>
                          <Text style={styles.imageText}>📷</Text>
                        </View>
                      </View>
                    )}
                    
                    <View style={styles.detailPostFooter}>
                      <TouchableOpacity 
                        style={styles.likeButton}
                        onPress={() => handleLikePost(selectedPost.id)}
                      >
                        <Text style={[styles.likeIcon, selectedPost.likedByUser && styles.likedIcon]}>
                          {selectedPost.likedByUser ? '❤️' : '🤍'}
                        </Text>
                        <Text style={styles.likeCount}>{selectedPost.likes}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {/* Comments Section */}
                  <View style={styles.commentsSection}>
                    <Text style={styles.commentsTitle}>댓글 {selectedPost.comments.length}개</Text>
                    
                    {selectedPost.comments.map((comment) => (
                      <View key={comment.id} style={styles.commentCard}>
                        <View style={styles.commentHeader}>
                          <View style={styles.authorInfo}>
                            <View style={styles.commentAvatar}>
                              <Text style={styles.commentAvatarText}>
                                {comment.author.charAt(0)}
                              </Text>
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
                            <Text style={[styles.commentLikeIcon, comment.likedByUser && styles.likedIcon]}>
                              {comment.likedByUser ? '❤️' : '🤍'}
                            </Text>
                            <Text style={styles.commentLikeCount}>{comment.likes}</Text>
                          </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.commentContent}>{comment.content}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
                
                {/* Comment Input */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  // Header styles - Main.js와 동일
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

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  hamburgerButton: {
    width: 24,
    height: 24,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },

  hamburgerLine: {
    width: '100%',
    height: 3,
    backgroundColor: '#333',
    borderRadius: 2,
  },

  homeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },

  profileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileText: {
    fontSize: 9,
    color: '#666',
    fontWeight: '400',
  },

  container: {
    flex: 1,
    flexDirection: 'row',
  },

  // Sidebar styles - Main.js와 동일
  sidebar: {
    width: 320,
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRightWidth: 1,
    borderRightColor: '#E5E5E5',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    marginBottom: 24,
    paddingHorizontal: 16,
    height: 44,
  },

  searchIcon: {
    marginRight: 8,
  },

  searchIconText: {
    fontSize: 14,
    color: '#999',
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000',
  },

  subjectList: {
    flex: 1,
    gap: 4,
  },

  subjectItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },

  activeSubjectItem: {
    backgroundColor: '#F0F0F0',
  },

  subjectText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
  },

  activeSubjectText: {
    color: '#000',
    fontWeight: '600',
  },

  bottomDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 24,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D0D0D0',
  },

  activeDot: {
    backgroundColor: '#666',
  },

  // Main Content styles
  mainContent: {
    flex: 1,
    backgroundColor: 'white',
  },

  mainContentExpanded: {
    paddingLeft: 16,
  },

  communityHeader: {
    padding: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  communityTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },

  communitySubtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
  },

  postsContainer: {
    flex: 1,
    padding: 24,
  },

  // Post Card styles
  postCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },

  postHeader: {
    marginBottom: 16,
  },

  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },

  authorAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },

  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },

  postDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },

  postTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },

  postPreview: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 16,
  },

  postImageContainer: {
    marginBottom: 16,
  },

  postImagePlaceholder: {
    height: 120,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  imageText: {
    fontSize: 24,
    color: '#999',
  },

  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },

  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  likeIcon: {
    fontSize: 16,
  },

  likedIcon: {
    fontSize: 16,
  },

  likeCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  commentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  commentIcon: {
    fontSize: 14,
  },

  commentCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  fabText: {
    fontSize: 24,
    color: 'white',
    fontWeight: '300',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  createModalContent: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  cancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },

  createModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },

  postText: {
    fontSize: 16,
    color: '#4285F4',
    fontWeight: '600',
  },

  createModalBody: {
    flex: 1,
    padding: 20,
  },

  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 16,
    marginBottom: 20,
  },

  contentInput: {
    fontSize: 16,
    color: '#000',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },

  selectedImageContainer: {
    marginBottom: 20,
  },

  selectedImagePlaceholder: {
    height: 200,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    position: 'relative',
  },

  selectedImageText: {
    fontSize: 16,
    color: '#666',
  },

  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  removeImageText: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
  },

  imageSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 20,
  },

  imageSelectText: {
    fontSize: 16,
    color: '#4285F4',
    fontWeight: '500',
  },

  // Detail Modal styles
  detailModalContent: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  detailModalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  backText: {
    fontSize: 16,
    color: '#4285F4',
    fontWeight: '500',
  },

  detailModalBody: {
    flex: 1,
    padding: 20,
  },

  detailPostCard: {
    backgroundColor: 'white',
    marginBottom: 24,
  },

  detailPostTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },

  detailPostContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
  },

  detailImageContainer: {
    marginBottom: 20,
  },

  detailImagePlaceholder: {
    height: 200,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  detailPostFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },

  // Comments styles
  commentsSection: {
    gap: 16,
  },

  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },

  commentCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#34A853',
    justifyContent: 'center',
    alignItems: 'center',
  },

  commentAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },

  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },

  commentDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },

  commentContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },

  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  commentLikeIcon: {
    fontSize: 14,
  },

  commentLikeCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  // Comment Input styles
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: 'white',
    gap: 12,
  },

  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#000',
    maxHeight: 100,
  },

  commentSubmitButton: {
    backgroundColor: '#4285F4',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  commentSubmitText: {
    fontSize: 15,
    color: 'white',
    fontWeight: '600',
  },
});