import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import userDataService from './userDataService';
import MiniTimer from './miniTimer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTimer } from './timerContext';
import BanModal from './BanModal';
import { getScreenInfo, createResponsiveStyles } from './utils/responsive';
import MobileSafeArea from './components/MobileSafeArea';
import Header from './components/common/Header';
import Card from './components/common/Card';
import Button from './components/common/Button';
import StudyLevelWidget from './components/StudyLevelWidget';
import LevelUpModal from './components/LevelUpModal';
import studyTimeService from './services/StudyTimeService';

const getSubjects = (isAdmin = false) => {
  const baseSubjects = [
    '홈',
    '타이머',
    '플래너',
    'AI',
    '스터디그룹 찾기',
    '커뮤니티',
    '스토어',
  ];
  
  if (isAdmin) {
    baseSubjects.push('👥 사용자 관리');
    baseSubjects.push('📝 게시글 관리');
  }
  
  return baseSubjects;
};

const noteColors = [
  '#5C7CFA', // Blue
  '#20C997', // Teal
  '#51CF66', // Green
  '#FF6B6B', // Red
  '#FFD93D', // Yellow
  '#845EC2', // Purple
  '#FF8CC8', // Pink
  '#4E9F3D', // Dark Green
  '#FF9F1C', // Orange
  '#6C5CE7', // Indigo
];

const FolderItem = ({ folder, onNotePress, onOptionsPress }) => (
  <TouchableOpacity
    style={styles.folderItem}
    onPress={() => onNotePress(folder)}
    activeOpacity={0.8}
  >
    <View style={[styles.notebookCover, { backgroundColor: folder.color }]}>
      <View style={styles.notebookSpine} />
      <View style={styles.notebookContent}>
        <View style={styles.notebookHeader}>
          <View style={styles.headerContent}>
            <View style={styles.noteTypeBadge}>
              <Text style={styles.noteTypeBadgeText}>
                {folder.type === 'drawing' ? 'DRAW' : folder.type === 'pdf' ? 'PDF' : 'TEXT'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.optionsButton}
              onPress={(e) => {
                e.stopPropagation();
                onOptionsPress(folder.id);
              }}
            >
              <Text style={styles.optionsText}>⋯</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.notebookBottom}>
          <Text style={styles.folderTitle}>{folder.title}</Text>
          <Text style={styles.folderDate}>{folder.date}</Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

export default function Main() {
  const navigation = useNavigation();
  const { todayStudyTime, loadTodayStudyTime } = useTimer();
  const [searchText, setSearchText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNoteTypeModal, setShowNoteTypeModal] = useState(false);
  const [myStudyGroups, setMyStudyGroups] = useState([]);
  const [screenInfo, setScreenInfo] = useState(getScreenInfo());
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState({ oldLevel: 1, newLevel: 1 });
  const [activeSubject, setActiveSubject] = useState('홈');
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  
  // 핸드폰 전용 반응형 설정
  const responsiveStyles = createResponsiveStyles(
    {}, // 기본 스타일
    { // 핸드폰 스타일
      sidebarWidth: 0, // 사이드바 숨김
      headerPadding: 16,
      cardPadding: 12,
      fontSize: 14,
    }
  );
  const [folders, setFolders] = useState([]);
  const [sidebarVisible, setSidebarVisible] = useState(!getScreenInfo().isPhone);
  const slideAnim = useState(new Animated.Value(-300))[0]; // 초기값: 화면 밖 (-300px)
  
  // 로딩 애니메이션 값들
  const dot1Anim = useState(new Animated.Value(0))[0];
  const dot2Anim = useState(new Animated.Value(0))[0];
  const dot3Anim = useState(new Animated.Value(0))[0];
  const [userData, setUserData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banInfo, setBanInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [studyGroupsLoaded, setStudyGroupsLoaded] = useState(false);
  const [studyTimeLoaded, setStudyTimeLoaded] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  
  useEffect(() => {
    loadUserData();
    loadMyStudyGroups();
    loadStudyTime();
    loadUnreadMessageCount();
    preloadImages();
    initializeStudyTimeService();
  }, []);

  // StudyTimeService 초기화
  const initializeStudyTimeService = async () => {
    try {
      await studyTimeService.loadData();
      
      // 레벨업 리스너 등록
      const handleLevelUp = (oldLevel, newLevel) => {
        setLevelUpData({ oldLevel, newLevel });
        setShowLevelUpModal(true);
      };

      // 경험치 변화 리스너 등록 (공부시간 업데이트용)
      const handleExpGain = () => {
        // StudyTimeService의 공부시간이 변경되면 타이머 컨텍스트도 업데이트
        loadTodayStudyTime();
      };

      studyTimeService.addLevelUpListener(handleLevelUp);
      studyTimeService.addExpGainListener(handleExpGain);
    } catch (error) {
      console.error('StudyTimeService 초기화 실패:', error);
    }
  };

  // 공부시간 로드 함수
  const loadStudyTime = async () => {
    try {
      await loadTodayStudyTime();
    } catch (error) {
      console.error('공부시간 로드 실패:', error);
    } finally {
      setStudyTimeLoaded(true);
    }
  };

  // 이미지 미리 로딩 함수
  const preloadImages = async () => {
    try {
      // React Native에서는 로컬 이미지가 번들에 포함되므로 즉시 사용 가능
      // 하지만 실제 렌더링 시간을 시뮬레이션하기 위해 약간의 지연 추가
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('모든 이미지 로딩 완료');
      setImagesLoaded(true);
    } catch (error) {
      console.log('이미지 로딩 중 오류:', error);
      setImagesLoaded(true); // 오류가 나도 계속 진행
    }
  };

  // 로딩 애니메이션 효과
  useEffect(() => {
    if (loading) {
      const createDotAnimation = (animValue, delay) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animValue, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const dot1Animation = createDotAnimation(dot1Anim, 0);
      const dot2Animation = createDotAnimation(dot2Anim, 200);
      const dot3Animation = createDotAnimation(dot3Anim, 400);

      dot1Animation.start();
      dot2Animation.start();
      dot3Animation.start();

      return () => {
        dot1Animation.stop();
        dot2Animation.stop();
        dot3Animation.stop();
      };
    }
  }, [loading]);

  // 모든 데이터 로딩 완료 확인
  useEffect(() => {
    if (userDataLoaded && studyGroupsLoaded && studyTimeLoaded) {
      setDataLoaded(true);
    }
  }, [userDataLoaded, studyGroupsLoaded, studyTimeLoaded]);

  // 이미지와 데이터가 모두 로드되면 로딩 종료
  useEffect(() => {
    if (imagesLoaded && dataLoaded) {
      console.log('이미지와 데이터 로딩 모두 완료');
      setLoading(false);
      setIsFirstLoad(false); // 첫 로드 완료 표시
    }
  }, [imagesLoaded, dataLoaded]);

  // 로딩 타임아웃 (10초 후 강제 완료)
  useEffect(() => {
    if (loading && isFirstLoad) {
      const timeout = setTimeout(() => {
        console.log('로딩 타임아웃 - 강제 완료');
        setLoading(false);
        setIsFirstLoad(false);
        setImagesLoaded(true);
        setDataLoaded(true);
        setUserDataLoaded(true);
        setStudyGroupsLoaded(true);
        setStudyTimeLoaded(true);
      }, 10000); // 10초 타임아웃

      return () => clearTimeout(timeout);
    }
  }, [loading, isFirstLoad]);

  // 화면이 포커스될 때마다 데이터 새로고침
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('메인 화면 포커스됨 - 데이터 새로고침');
      // 첫 로드가 아닐 때는 백그라운드에서 조용히 새로고침
      if (!isFirstLoad) {
        // 로딩 상태 초기화 (백그라운드 새로고침용)
        setUserDataLoaded(false);
        setStudyGroupsLoaded(false);
        setStudyTimeLoaded(false);
        
        loadUserData();
        loadStudyTime(); // 공부시간도 새로고침
        loadMyStudyGroups(); // 스터디그룹도 새로고침
        loadUnreadMessageCount(); // 읽지 않은 메시지 개수도 새로고침
      }
    });

    return unsubscribe;
  }, [navigation, isFirstLoad]);
  
  // 화면 크기 변경 감지
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      const newScreenInfo = getScreenInfo();
      setScreenInfo(newScreenInfo);
      // 화면 크기에 따라 사이드바 초기 상태 설정
      setSidebarVisible(!newScreenInfo.isPhone);
    });
    
    return () => subscription?.remove();
  }, []);

  const loadMyStudyGroups = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) {
        console.log('사용자 정보 없음');
        setMyStudyGroups([]);
        return;
      }

      console.log('스터디그룹 로드 시도 중...', user.email);
      const response = await fetch(`http://192.168.45.53:5000/api/study-groups/my`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.email}`,
        }
      });

      console.log('스터디그룹 API 응답:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('스터디그룹 데이터:', data);
        if (data.success && data.groups) {
          setMyStudyGroups(data.groups);
        } else {
          setMyStudyGroups([]);
        }
      } else {
        const errorData = await response.text();
        console.log('스터디그룹 API 오류:', response.status, errorData);
        setMyStudyGroups([]);
      }
    } catch (error) {
      console.error('내 스터디그룹 로드 실패:', error);
      setMyStudyGroups([]);
    } finally {
      setStudyGroupsLoaded(true);
    }
  };

  const loadUserData = async () => {
    try {
      // 첫 로드일 때만 로딩 상태 설정
      if (isFirstLoad) {
        setLoading(true);
      }
      
      // 현재 사용자 정보 가져오기 및 서버 동기화
      const updatedUser = await userDataService.refreshCurrentUser();
      if (updatedUser) {
        console.log('🖼️ 사용자 프로필 이미지:', updatedUser?.profileImage);
        setCurrentUser(updatedUser);
        
        // StudyTimeService에 사용자 설정 및 데이터 새로고침
        studyTimeService.setCurrentUser(updatedUser.email);
        await studyTimeService.loadData();
        console.log(`👤 메인화면에서 StudyTimeService 사용자 설정: ${updatedUser.email}`);
        
        // 사용자 데이터도 함께 가져오기
        const userData = await userDataService.getUserData();
        setUserData(userData);
        
        // 관리자 권한 확인 (특정 계정 또는 role 기반)
        console.log('사용자 이메일:', userData.user.email);
        console.log('사용자 역할:', userData.user.role);
        const adminStatus = userData.user.email === 'drda00001@gmail.com' || userData.user.role === 'admin';
        console.log('관리자 여부:', adminStatus);
        setIsAdmin(adminStatus);
        
        // 밴 상태 확인
        if (userData.user.banInfo && userData.user.banInfo.isBanned) {
          setBanInfo(userData.user.banInfo);
          setShowBanModal(true);
        } else {
          setBanInfo(null);
          setShowBanModal(false);
        }
        
        // 폴더 데이터 설정
        if (userData.notes && userData.notes.length > 0) {
          const folderData = userData.notes.map((note, index) => {
            // 노트 타입 확인
            let noteType = 'text'; // 기본값
            try {
              const parsedContent = JSON.parse(note.content);
              if (parsedContent && parsedContent.type === 'drawing') {
                noteType = 'drawing';
              } else if (parsedContent && parsedContent.type === 'pdf') {
                noteType = 'pdf';
              }
            } catch (e) {
              // JSON이 아니면 기존 텍스트 노트
              noteType = 'text';
            }
            
            console.log('노트 타입 확인:', { title: note.title, content: note.content.substring(0, 100), type: noteType });
            
            return {
              id: note._id,
              name: note.title,
              title: note.title,
              date: new Date(note.createdAt).toLocaleDateString('ko-KR'),
              color: noteColors[index % noteColors.length], // 색상 순환 할당
              type: noteType, // 노트 타입 추가
            };
          });
          setFolders(folderData);
        } else {
          setFolders([]);
        }
      }
    } catch (error) {
      console.error('사용자 데이터 로드 실패:', error);
      Alert.alert('오류', '데이터를 불러오는데 실패했습니다.');
    } finally {
      setUserDataLoaded(true);
    }
  };

  const saveFolders = async (newFolders) => {
    // 더 이상 AsyncStorage에 저장하지 않음 - DB에 저장
  };

  const handleSubjectPress = (subjectName) => {
    console.log('클릭된 메뉴:', subjectName);
    setActiveSubject(subjectName);
    
    // 모바일에서 사이드바 닫기
    if (screenInfo.isPhone) {
      setSidebarVisible(false);
      // 애니메이션 값 초기화
      slideAnim.setValue(-300);
    }
    
    const screenMap = {
      '타이머': 'Timer',
      '플래너': 'Planner',
      'AI': 'AI',
      '스터디그룹 찾기': 'StudyGroup',
      '커뮤니티': 'Community',
      '스토어': 'Store'
    };
    
    console.log('screenMap에서 찾은 화면:', screenMap[subjectName]);
    
    // 관리자 메뉴의 경우 탭 정보를 전달
    if (subjectName === '👥 사용자 관리') {
      console.log('관리자 - 사용자 관리로 이동');
      navigation.navigate('AdminPanel', { initialTab: 'users' });
    } else if (subjectName === '📝 게시글 관리') {
      console.log('관리자 - 게시글 관리로 이동');
      navigation.navigate('AdminPanel', { initialTab: 'posts' });
    } else if (subjectName === '📊 관리자 통계') {
      console.log('관리자 - 통계로 이동');
      navigation.navigate('AdminPanel', { initialTab: 'stats' });
    } else if (screenMap[subjectName]) {
      console.log('일반 화면으로 이동:', screenMap[subjectName]);
      navigation.navigate(screenMap[subjectName]);
    } else {
      console.log('매칭되는 화면이 없음:', subjectName);
    }
  };
  const handleDeleteNote = async () => {
    try {
      // DB에서 노트 삭제
      await userDataService.deleteNote(selectedFolderId);
      
      // 폴더 리스트에서 제거
      const newFolders = folders.filter(f => f.id !== selectedFolderId);
      setFolders(newFolders);

      setShowDeleteModal(false);
      setShowOptionsModal(false);
      setSelectedFolderId(null);
      
      Alert.alert('성공', '노트가 삭제되었습니다.');
    } catch (error) {
      console.error('노트 삭제 실패:', error);
      Alert.alert('오류', '노트 삭제에 실패했습니다.');
    }
  };

  const getSelectedFolder = () => folders.find(f => f.id === selectedFolderId);

  // 읽지 않은 메시지 개수 로드
  const loadUnreadMessageCount = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) {
        setUnreadMessageCount(0);
        return;
      }

      const response = await fetch(`http://192.168.45.53:5000/api/messages/${user.email}/unread-count`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('서버에서 가져온 읽지 않은 메시지 개수:', data.unreadCount);
          
          // AsyncStorage에서 로컬 읽음 상태 확인
          try {
            const readMessages = await AsyncStorage.getItem('readMessages') || '[]';
            const readMessagesList = JSON.parse(readMessages);
            console.log('로컬에서 읽음 처리된 메시지들:', readMessagesList);
            
            // 실제 서버 데이터와 로컬 읽음 상태를 비교하여 정확한 개수 계산
            // 일단 서버 데이터를 우선으로 사용하되, 로컬 읽음 상태도 반영
            setUnreadMessageCount(data.unreadCount);
          } catch (storageError) {
            console.error('AsyncStorage 읽기 실패:', storageError);
            setUnreadMessageCount(data.unreadCount);
          }
        }
      }
    } catch (error) {
      console.error('읽지 않은 메시지 개수 로드 실패:', error);
      setUnreadMessageCount(0);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            {/* 로고 */}
            <Image 
              source={require('./assets/s.png')} 
              style={[styles.loadingLogo, screenInfo.isPhone && styles.loadingLogoMobile]} 
              resizeMode="contain" 
            />
            
            {/* 로딩 애니메이션 */}
            <View style={styles.loadingAnimationContainer}>
              <ActivityIndicator size="large" color="#5C7CFA" />
              <View style={styles.loadingDots}>
                <Animated.View style={[
                  styles.loadingDot, 
                  { 
                    opacity: dot1Anim,
                    transform: [{ 
                      scale: dot1Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2]
                      })
                    }]
                  }
                ]} />
                <Animated.View style={[
                  styles.loadingDot, 
                  { 
                    opacity: dot2Anim,
                    transform: [{ 
                      scale: dot2Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2]
                      })
                    }]
                  }
                ]} />
                <Animated.View style={[
                  styles.loadingDot, 
                  { 
                    opacity: dot3Anim,
                    transform: [{ 
                      scale: dot3Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2]
                      })
                    }]
                  }
                ]} />
              </View>
            </View>
            
            {/* 로딩 텍스트 */}
            <Text style={[styles.loadingText, screenInfo.isPhone && styles.loadingTextMobile]}>
              {!dataLoaded && !imagesLoaded ? '앱을 준비하는 중...' :
               !dataLoaded ? '데이터를 불러오는 중...' :
               !imagesLoaded ? '이미지를 로딩하는 중...' :
               '거의 완료되었습니다...'}
            </Text>
            
            {/* 환영 메시지 */}
            {currentUser && (
              <Text style={[styles.welcomeText, screenInfo.isPhone && styles.welcomeTextMobile]}>
                환영합니다, {currentUser.username || currentUser.name}님!
              </Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.hamburgerButton} onPress={toggleSidebar}>
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </TouchableOpacity>
          <Text style={styles.title}>StudyTime</Text>
          <Text style={styles.homeText}>홈</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileIcon}
          onPress={() => navigation.navigate('Settings')}
        >
          {currentUser?.profileImage ? (
            <Image 
              source={{ uri: currentUser.profileImage }} 
              style={styles.profileImage}
              onError={(error) => {
                console.log('프로필 이미지 로드 실패:', error.nativeEvent.error);
                console.log('이미지 URL:', currentUser.profileImage);
              }}
              onLoad={() => {
                console.log('프로필 이미지 로드 성공:', currentUser.profileImage);
              }}
            />
          ) : (
            <View style={styles.defaultProfileIcon}>
              <Text style={styles.profileText}>
                {currentUser?.name?.charAt(0) || currentUser?.email?.charAt(0) || '?'}
              </Text>
            </View>
          )}
          {/* 읽지 않은 메시지가 있을 때 느낌표 표시 */}
          {unreadMessageCount > 0 && (
            <View style={styles.profileNotification}>
              <Text style={styles.profileNotificationText}>!</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <MiniTimer />
      <View style={[styles.container, screenInfo.isPhone && styles.phoneContainer]}>
        {/* 데스크톱 사이드바 */}
        {!screenInfo.isPhone && sidebarVisible && (
          <View style={styles.sidebar}>
            <View style={styles.searchContainer}>
              <Text style={styles.searchIconText}>🔍</Text>
              <TextInput style={styles.searchInput} placeholder="검색" placeholderTextColor="#999" value={searchText} onChangeText={setSearchText} />
            </View>
            <ScrollView style={styles.subjectList} showsVerticalScrollIndicator={false}>
              {getSubjects(isAdmin).map((subject, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.subjectItem, activeSubject === subject && styles.activeSubjectItem]}
                  onPress={() => handleSubjectPress(subject)}
                >
                  <Text style={[styles.subjectText, activeSubject === subject && styles.activeSubjectText]}>
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
              { transform: [{ translateX: slideAnim }] }
            ]}>
              <View style={styles.searchContainer}>
                <Text style={styles.searchIconText}>🔍</Text>
                <TextInput style={styles.searchInput} placeholder="검색" placeholderTextColor="#999" value={searchText} onChangeText={setSearchText} />
              </View>
              <ScrollView style={styles.subjectList} showsVerticalScrollIndicator={false}>
                {getSubjects(isAdmin).map((subject, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.subjectItem, activeSubject === subject && styles.activeSubjectItem]}
                    onPress={() => handleSubjectPress(subject)}
                  >
                    <Text style={[styles.subjectText, activeSubject === subject && styles.activeSubjectText]}>
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
          {/* 오늘의 공부 시간 */}
          {userData && (
            <View style={[styles.studyTimeBox, screenInfo.isPhone && styles.phoneStudyTimeBox]}>
              <Text style={styles.studyTimeTitle}>오늘의 공부 시간</Text>
              <Text style={styles.studyTimeValue}>
                {Math.floor(todayStudyTime / 60)}시간 {todayStudyTime % 60}분
              </Text>
              <Text style={styles.studyTimeDate}>
                {new Date().toLocaleDateString('ko-KR', { 
                  month: 'long', 
                  day: 'numeric', 
                  weekday: 'short' 
                })}
              </Text>
            </View>
          )}

          {/* 레벨 위젯 */}
          <StudyLevelWidget 
            onPress={() => navigation.navigate('StudyStatsScreen')}
          />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>나의 필기</Text>
            <View style={[styles.foldersGrid, screenInfo.isPhone && styles.phoneFoldersGrid]}>
              {folders.map((folder) => (
                <FolderItem 
                  key={folder.id} 
                  folder={folder} 
                  onNotePress={(f) => {
                    // 노트 타입에 따라 다른 화면으로 이동
                    if (f.type === 'drawing') {
                      navigation.navigate('Note', { noteId: f.id, noteTitle: f.name });
                    } else if (f.type === 'pdf') {
                      navigation.navigate('PdfViewer', { noteId: f.id, noteTitle: f.name });
                    } else {
                      navigation.navigate('NoteEditor', { noteId: f.id, title: f.name });
                    }
                  }} 
                  onOptionsPress={(id) => { setSelectedFolderId(id); setShowOptionsModal(true); }} 
                />
              ))}
              <TouchableOpacity style={styles.addFolderItem} onPress={() => setShowNoteTypeModal(true)}>
                <View style={styles.addNotebookCover}>
                  <Text style={styles.addIcon}>+</Text>
                  <Text style={styles.addText}>새 필기</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>스터디 그룹</Text>
            
            {myStudyGroups.length === 0 ? (
              <Text style={styles.emptyStateText}>참여 중인 스터디그룹이 없습니다</Text>
            ) : (
              <View style={[styles.studyGroupGrid, screenInfo.isPhone && styles.phoneStudyGroupGrid]}>
                {myStudyGroups.map((group) => (
                  <TouchableOpacity
                    key={group._id}
                    style={styles.studyGroupSmallCard}
                    onPress={() => navigation.navigate('StudyGroupDetail', { 
                      groupId: group._id, 
                      groupName: group.name 
                    })}
                  >
                    <View style={styles.studyGroupCardHeader}>
                      <Text style={styles.studyGroupSmallName} numberOfLines={1}>
                        {group.name}
                      </Text>
                      <View style={styles.studyGroupSmallBadge}>
                        <Text style={styles.studyGroupSmallBadgeText}>{group.subject}</Text>
                      </View>
                    </View>
                    <Text style={styles.studyGroupSmallDescription} numberOfLines={2}>
                      {group.description}
                    </Text>
                    <View style={styles.studyGroupSmallFooter}>
                      <Text style={styles.studyGroupSmallMembers}>
                        👥 {group.currentMembers}/{group.maxMembers}
                      </Text>
                      <Text style={styles.studyGroupSmallType}>
                        {group.isPublic ? '공개' : '비공개'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
        )}
      </View>


      <Modal visible={showOptionsModal} transparent={true} animationType="fade" onRequestClose={() => setShowOptionsModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowOptionsModal(false)} activeOpacity={1}>
          <View style={styles.optionsModalContent}>
            <TouchableOpacity style={styles.optionsMenuItem} onPress={() => { setShowOptionsModal(false); setShowDeleteModal(true); }}><Text style={styles.optionsMenuText}>삭제하기</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showDeleteModal} transparent={true} animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{getSelectedFolder()?.title}을 삭제할까요?</Text>
            <Text style={styles.deleteWarning}>(복구할 수 없습니다)</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => { setShowDeleteModal(false); setSelectedFolderId(null); }}><Text style={styles.cancelButtonText}>취소</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.deleteButton]} onPress={handleDeleteNote}><Text style={styles.deleteButtonText}>삭제</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 노트 타입 선택 모달 */}
      <Modal
        visible={showNoteTypeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNoteTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.noteTypeModalContent}>
            <Text style={styles.noteTypeModalTitle}>노트 작성 방식 선택</Text>
            <Text style={styles.noteTypeModalSubtitle}>어떤 방식으로 노트를 작성하시겠습니까?</Text>
            
            <View style={styles.noteTypeButtons}>
              <TouchableOpacity 
                style={styles.noteTypeButton}
                onPress={() => {
                  setShowNoteTypeModal(false);
                  navigation.navigate('NoteEditor', { mode: 'text' });
                }}
              >
                <Text style={styles.noteTypeIcon}>📝</Text>
                <Text style={styles.noteTypeTitle}>텍스트 노트</Text>
                <Text style={styles.noteTypeDescription}>키보드로 텍스트 입력</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.noteTypeButton}
                onPress={() => {
                  setShowNoteTypeModal(false);
                  navigation.navigate('Note', { mode: 'drawing' });
                }}
              >
                <Text style={styles.noteTypeIcon}>✏️</Text>
                <Text style={styles.noteTypeTitle}>그림 노트</Text>
                <Text style={styles.noteTypeDescription}>손으로 그리기</Text>
              </TouchableOpacity>

              
              <TouchableOpacity 
                style={styles.noteTypeButton}
                onPress={() => {
                  setShowNoteTypeModal(false);
                  navigation.navigate('PdfViewer', { mode: 'pdf' });
                }}
              >
                <Text style={styles.noteTypeIcon}>📄</Text>
                <Text style={styles.noteTypeTitle}>PDF 열기</Text>
                <Text style={styles.noteTypeDescription}>PDF 파일 불러오기</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.noteTypeCloseButton}
              onPress={() => setShowNoteTypeModal(false)}
            >
              <Text style={styles.noteTypeCloseText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 밴 모달 */}
      <BanModal 
        visible={showBanModal}
        banInfo={banInfo}
        onClose={() => setShowBanModal(false)}
      />

      {/* 레벨업 모달 */}
      <LevelUpModal
        visible={showLevelUpModal}
        oldLevel={levelUpData.oldLevel}
        newLevel={levelUpData.newLevel}
        onClose={() => setShowLevelUpModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F8F9FA'
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 280,
  },
  loadingLogo: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  loadingLogoMobile: {
    width: 100,
    height: 100,
    marginBottom: 25,
  },
  loadingAnimationContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  loadingDots: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5C7CFA',
  },
  loadingText: { 
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 10,
  },
  loadingTextMobile: {
    fontSize: 16,
  },
  welcomeText: { 
    fontSize: 16, 
    color: '#5C7CFA',
    fontWeight: '600',
    textAlign: 'center'
  },
  welcomeTextMobile: {
    fontSize: 14,
  },
  studyTimeBox: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studyTimeTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  studyTimeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#5C7CFA',
    marginBottom: 4,
  },
  studyTimeDate: {
    fontSize: 14,
    color: '#999',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  title: { fontSize: 26, fontWeight: '700', color: '#000' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hamburgerButton: { width: 24, height: 24, justifyContent: 'space-between', paddingVertical: 2 },
  hamburgerLine: { width: '100%', height: 3, backgroundColor: '#333', borderRadius: 2 },
  homeText: { fontSize: 16, fontWeight: '500', color: '#000' },
  profileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  profileImage: { width: 44, height: 44, borderRadius: 22 },
  defaultProfileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center' },
  profileText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  container: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 320, backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 24, borderRightWidth: 1, borderRightColor: '#E5E5E5' },
  mobileSidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // 반투명 배경
    zIndex: 1000,
    flexDirection: 'row',
  },
  mobileSidebarContent: {
    width: '80%', // 화면의 80% 차지
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  mobileSidebarOverlay: {
    flex: 1, // 나머지 20% 영역 (터치하면 닫힘)
  },
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
  mainContent: { flex: 1 },
  mainContentExpanded: { paddingLeft: 16 },
  scrollContentContainer: { padding: 32, gap: 32, paddingBottom: 64 },
  largeContentBox: { height: 200, backgroundColor: '#D3D3D3', borderRadius: 16 },
  section: { gap: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '600', color: '#000' },
  foldersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  folderItem: createResponsiveStyles(
    { width: 140, height: 180 },
    { width: 110, height: 140 } // 모바일에서 크기 축소
  ),
  notebookCover: { flex: 1, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6, position: 'relative', overflow: 'hidden' },
  notebookSpine: { position: 'absolute', left: 8, top: 0, bottom: 0, width: 4, backgroundColor: 'rgba(0, 0, 0, 0.15)', borderRadius: 2 },
  notebookContent: createResponsiveStyles(
    { flex: 1, padding: 16, justifyContent: 'space-between' },
    { padding: 12 } // 모바일에서 패딩 축소
  ),
  notebookHeader: { alignItems: 'flex-end' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  optionsButton: { padding: 4, marginTop: -4, marginRight: -4 },
  optionsText: { fontSize: 16, color: 'rgba(255, 255, 255, 0.8)', fontWeight: 'bold' },
  notebookBottom: { gap: 8 },
  folderTitle: createResponsiveStyles(
    { fontSize: 16, fontWeight: '600', color: 'white', textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    { fontSize: 14 } // 모바일에서 폰트 크기 축소
  ),
  folderDate: createResponsiveStyles(
    { fontSize: 12, color: 'rgba(255, 255, 255, 0.9)', textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    { fontSize: 11 } // 모바일에서 폰트 크기 축소
  ),
  addFolderItem: createResponsiveStyles(
    { width: 140, height: 180 },
    { width: 110, height: 140 } // 모바일에서 크기 축소
  ),
  addNotebookCover: { flex: 1, borderRadius: 12, backgroundColor: 'white', borderWidth: 2, borderColor: '#D0D0D0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  addIcon: { fontSize: 32, color: '#999', fontWeight: '300' },
  addText: { fontSize: 14, color: '#666', fontWeight: '500' },
  emptyStateText: { fontSize: 16, color: '#999', fontWeight: '400' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: 320, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 8 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#000', textAlign: 'center', marginBottom: 20 },
  modalInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 16, color: '#000', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#F5F5F5' },
  confirmButton: { backgroundColor: '#2196F3' },
  cancelButtonText: { fontSize: 16, fontWeight: '500', color: '#666' },
  confirmButtonText: { fontSize: 16, fontWeight: '500', color: 'white' },
  optionsModalContent: { backgroundColor: 'white', borderRadius: 12, padding: 8, marginHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 8 },
  optionsMenuItem: { paddingVertical: 16, paddingHorizontal: 20 },
  optionsMenuText: { fontSize: 16, color: '#F44336', fontWeight: '500' },
  deleteWarning: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 24, marginTop: -8 },
  deleteButton: { backgroundColor: '#F44336' },
  deleteButtonText: { fontSize: 16, fontWeight: '500', color: 'white' },
  noteTypeModalContent: { 
    backgroundColor: 'white', 
    borderRadius: 20, 
    padding: 24, 
    width: 320, 
    maxWidth: '90%',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 20, 
    elevation: 10 
  },
  noteTypeModalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#000', 
    textAlign: 'center', 
    marginBottom: 8 
  },
  noteTypeModalSubtitle: { 
    fontSize: 14, 
    color: '#666', 
    textAlign: 'center', 
    marginBottom: 24 
  },
  noteTypeButtons: { 
    gap: 12, 
    marginBottom: 20 
  },
  noteTypeButton: { 
    backgroundColor: '#F8F9FA', 
    borderRadius: 12, 
    padding: 16, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5'
  },
  noteTypeIcon: { 
    fontSize: 32, 
    marginBottom: 8 
  },
  noteTypeTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#000', 
    marginBottom: 4 
  },
  noteTypeDescription: { 
    fontSize: 12, 
    color: '#666', 
    textAlign: 'center' 
  },
  noteTypeCloseButton: { 
    backgroundColor: '#F5F5F5', 
    borderRadius: 8, 
    paddingVertical: 12, 
    alignItems: 'center' 
  },
  noteTypeCloseText: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: '#666' 
  },
  noteTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    marginTop: -4,
  },
  banBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  banIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  banTextContainer: {
    flex: 1,
  },
  banTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  banMessage: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 2,
  },
  banDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 4,
  },
  noteTypeBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 0.3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#5C7CFA',
    borderRadius: 12,
  },
  viewAllText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyStudyGroupContainer: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateSubText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  studyGroupScroll: {
    marginTop: 8,
  },
  studyGroupCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studyGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  studyGroupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  studyGroupBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  studyGroupBadgeText: {
    fontSize: 10,
    color: '#1976D2',
    fontWeight: '600',
  },
  studyGroupDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  studyGroupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studyGroupMembers: {
    fontSize: 12,
    color: '#666',
  },
  studyGroupType: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  moreGroupsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  moreGroupsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  moreGroupsSubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  // 새로운 작은 스터디그룹 스타일
  studyGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  studyGroupSmallCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    width: '48%',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  studyGroupCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  studyGroupSmallName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 6,
  },
  studyGroupSmallBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  studyGroupSmallBadgeText: {
    fontSize: 8,
    color: '#1976D2',
    fontWeight: '600',
  },
  studyGroupSmallDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 8,
  },
  studyGroupSmallFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studyGroupSmallMembers: {
    fontSize: 10,
    color: '#666',
  },
  studyGroupSmallType: {
    fontSize: 10,
    color: '#007AFF',
    fontWeight: '500',
  },
  
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
  phoneStudyTimeBox: {
    margin: 12,
    padding: 16,
  },
  phoneSection: {
    marginBottom: 20,
  },
  phoneSectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  phoneStudyGroupGrid: {
    gap: 8,
  },
  phoneStudyGroupCard: {
    width: '100%',
    marginBottom: 8,
    padding: 12,
  },
  phoneFoldersGrid: {
    gap: 12,
  },
  phoneFolderItem: {
    width: '48%',
    height: 140,
  },
  
  // 프로필 알림 스타일 (비스듬한 느낌표)
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
    transform: [{ rotate: '15deg' }], // 비스듬히 회전
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
    transform: [{ rotate: '-15deg' }], // 텍스트는 다시 정렬
  },
});

// 반응형 스타일 함수 추가
const getResponsiveStylesForMain = () => {
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
      scrollContentContainer: { padding: 16, gap: 16, paddingBottom: 48 },
      sectionTitle: { fontSize: 18 },
      studyTimeBox: { margin: 10, padding: 14 },
      studyTimeTitle: { fontSize: 14 },
      studyTimeValue: { fontSize: 26 },
      studyTimeDate: { fontSize: 12 },
      folderItem: { width: 100, height: 130 },
      addFolderItem: { width: 100, height: 130 },
      folderTitle: { fontSize: 13 },
      folderDate: { fontSize: 10 },
      studyGroupSmallCard: { width: '100%', padding: 10 },
      studyGroupSmallName: { fontSize: 13 },
      studyGroupSmallDescription: { fontSize: 11, lineHeight: 14 },
    };
  }
  
  // 일반 핸드폰 (360 <= width < 768)
  if (width < 768) {
    return {
      header: { paddingHorizontal: 16, paddingVertical: 12 },
      title: { fontSize: 24 },
      homeText: { fontSize: 15 },
      scrollContentContainer: { padding: 20, gap: 20, paddingBottom: 56 },
      sectionTitle: { fontSize: 20 },
      studyTimeBox: { margin: 12, padding: 16 },
      studyTimeTitle: { fontSize: 15 },
      studyTimeValue: { fontSize: 28 },
      studyTimeDate: { fontSize: 13 },
      folderItem: { width: 110, height: 140 },
      addFolderItem: { width: 110, height: 140 },
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
      scrollContentContainer: { padding: 24, gap: 24, paddingBottom: 56 },
      sectionTitle: { fontSize: 20 },
      studyTimeBox: { margin: 14, padding: 18 },
      studyTimeTitle: { fontSize: 15 },
      studyTimeValue: { fontSize: 30 },
      studyTimeDate: { fontSize: 13 },
      folderItem: { width: 130, height: 165 },
      addFolderItem: { width: 130, height: 165 },
      folderTitle: { fontSize: 15 },
      folderDate: { fontSize: 11 },
      studyGroupCard: { width: 180, padding: 14 },
      studyGroupName: { fontSize: 15 },
      studyGroupDescription: { fontSize: 13, lineHeight: 18 },
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
      scrollContentContainer: { padding: 32, gap: 32, paddingBottom: 64 },
      sectionTitle: { fontSize: 22 },
      studyTimeBox: { margin: 16, padding: 20 },
      studyTimeTitle: { fontSize: 16 },
      studyTimeValue: { fontSize: 32 },
      studyTimeDate: { fontSize: 14 },
      folderItem: { width: 140, height: 180 },
      addFolderItem: { width: 140, height: 180 },
      folderTitle: { fontSize: 16 },
      folderDate: { fontSize: 12 },
      studyGroupCard: { width: 200, padding: 16 },
      studyGroupName: { fontSize: 16 },
      studyGroupDescription: { fontSize: 14, lineHeight: 20 },
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
    scrollContentContainer: { padding: 40, gap: 40, paddingBottom: 80 },
    sectionTitle: { fontSize: 24 },
    studyTimeBox: { margin: 20, padding: 24 },
    studyTimeTitle: { fontSize: 17 },
    studyTimeValue: { fontSize: 36 },
    studyTimeDate: { fontSize: 15 },
    folderItem: { width: 160, height: 200 },
    addFolderItem: { width: 160, height: 200 },
    folderTitle: { fontSize: 17 },
    folderDate: { fontSize: 13 },
    studyGroupCard: { width: 220, padding: 18 },
    studyGroupName: { fontSize: 17 },
    studyGroupDescription: { fontSize: 15, lineHeight: 22 },
    profileIcon: { width: 48, height: 48, borderRadius: 24 },
    profileImage: { width: 48, height: 48, borderRadius: 24 },
    defaultProfileIcon: { width: 48, height: 48, borderRadius: 24 },
    profileText: { fontSize: 17 },
  };
};
