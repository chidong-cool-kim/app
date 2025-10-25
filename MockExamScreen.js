import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  SafeAreaView,    
  ScrollView,     
  Button,
  Animated,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import userDataService from './userDataService';
import { getScreenInfo } from './utils/responsive';
import UniversalHeader from './components/UniversalHeader';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// API URL 수정
import { API_BASE_URL } from './config/api';

const API_URL = API_BASE_URL;

// main.js와 동일한 사이드바 메뉴 항목을 생성하는 함수
const getSubjects = (isAdmin = false) => {
    const baseSubjects = [
        '홈', '타이머', '플래너', 'AI', '스터디그룹 찾기', 
        '커뮤니티', '스토어', '모의고사'
    ];
    if (isAdmin) {
        baseSubjects.push('👥 사용자 관리');
        baseSubjects.push('📝 게시글 관리');
    }
    return baseSubjects;
};

export default function MockExamScreen() {
    const navigation = useNavigation();
    const [currentUser, setCurrentUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [mockExams, setMockExams] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // 이미지 뷰어 모달
    const [viewerModalVisible, setViewerModalVisible] = useState(false);
    const [selectedExam, setSelectedExam] = useState(null);

    // 업로드 모달
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadImages, setUploadImages] = useState([]);
    const [uploading, setUploading] = useState(false);

    // main.js와 동일한 레이아웃 상태
    const [activeSubject, setActiveSubject] = useState('모의고사');
    const [screenInfo, setScreenInfo] = useState(getScreenInfo());
    const [sidebarVisible, setSidebarVisible] = useState(Dimensions.get('window').width >= 768);
    const [isPhone, setIsPhone] = useState(Dimensions.get('window').width < 768);
    const slideAnim = useState(new Animated.Value(-300))[0];
    const [searchText, setSearchText] = useState('');

    // 화면 크기 변경 감지
    useEffect(() => {
        const updateLayout = () => {
            const newScreenInfo = getScreenInfo();
            setScreenInfo(newScreenInfo);
            const newIsPhone = Dimensions.get('window').width < 768;
            setIsPhone(newIsPhone);
            setSidebarVisible(!newIsPhone);
        };
        const subscription = Dimensions.addEventListener('change', updateLayout);
        return () => subscription?.remove();
    }, []);

    // 화면이 포커스될 때마다 데이터 로드
    useFocusEffect(
        useCallback(() => {
            loadInitialData();
        }, [])
    );

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const user = await userDataService.getCurrentUser();
            setCurrentUser(user);
            setIsAdmin(user?.email === 'drda00001@gmail.com' || user?.role === 'admin');
            await fetchMockExams();
        } catch (error) {
            console.error('초기 데이터 로드 실패:', error);
            Alert.alert('오류', '데이터를 불러오는 데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const fetchMockExams = async () => {
        try {
            const url = `${API_URL}/api/mock-exams`;
            console.log('모의고사 목록 요청:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            console.log('서버 응답:', text.substring(0, 200));
            
            let data;
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                console.error('JSON 파싱 실패:', parseError);
                console.error('응답 내용:', text);
                throw new Error('서버 응답을 처리할 수 없습니다.');
            }
            
            if (data.success) {
                setMockExams(data.mockExams || []);
                console.log('모의고사 목록 로드 성공:', data.mockExams?.length || 0, '개');
            } else {
                throw new Error(data.message || '데이터를 불러오는데 실패했습니다.');
            }
        } catch (error) {
            console.error('모의고사 목록 조회 실패:', error);
            Alert.alert('오류', error.message || '모의고사 목록을 불러오는 데 실패했습니다.');
            setMockExams([]);
        }
    };

    // main.js와 동일한 네비게이션 핸들러
    const handleSubjectPress = (subjectName) => {
        setActiveSubject(subjectName);
        if (isPhone) {
            setSidebarVisible(false);
            slideAnim.setValue(-300);
        }
        switch (subjectName) {
            case '홈': navigation.navigate('Main'); break;
            case '타이머': navigation.navigate('Timer'); break;
            case '플래너': navigation.navigate('Planner'); break;
            case 'AI': navigation.navigate('AI'); break;
            case '스터디그룹 찾기': navigation.navigate('StudyGroup'); break;
            case '커뮤니티': navigation.navigate('Community'); break;
            case '스토어': navigation.navigate('Store'); break;
            case '모의고사': break;
            case '👥 사용자 관리': navigation.navigate('AdminPanel', { initialTab: 'users' }); break;
            case '📝 게시글 관리': navigation.navigate('AdminPanel', { initialTab: 'posts' }); break;
            default: break;
        }
    };

    const toggleSidebar = () => {
        if (isPhone) {
            if (sidebarVisible) {
                Animated.timing(slideAnim, {
                    toValue: -300,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => {
                    setSidebarVisible(false);
                });
            } else {
                setSidebarVisible(true);
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            }
        } else {
            setSidebarVisible(!sidebarVisible);
        }
    };

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
                return;
            }

            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets) {
                setUploadImages(result.assets.map(asset => asset.uri));
            }
        } catch (error) {
            console.error('이미지 선택 오류:', error);
            Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
        }
    };

    const handleUpload = async () => {
        if (!uploadTitle.trim() || uploadImages.length === 0) {
            Alert.alert('입력 오류', '제목과 이미지를 모두 입력해주세요.');
            return;
        }
        
        if (!currentUser) {
            Alert.alert('오류', '로그인이 필요합니다.');
            return;
        }
        
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('title', uploadTitle);
            formData.append('userEmail', currentUser.email);
            
            uploadImages.forEach((uri, index) => {
                const uriParts = uri.split('.');
                const fileType = uriParts[uriParts.length - 1];
                
                formData.append('images', {
                    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                    name: `photo_${index}_${Date.now()}.${fileType}`,
                    type: `image/${fileType}`,
                });
            });

            const url = `${API_URL}/api/mock-exams/images`;
            console.log('업로드 요청:', url);
            console.log('업로드 제목:', uploadTitle);
            console.log('업로드 이미지 수:', uploadImages.length);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'x-user-email': currentUser.email,
                },
                body: formData,
            });

            const text = await response.text();
            console.log('업로드 응답 상태:', response.status);
            console.log('업로드 응답 내용:', text);

            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                console.error('업로드 응답 파싱 실패:', text);
                throw new Error('서버 응답을 처리할 수 없습니다.');
            }

            if (response.ok && result.success) {
                Alert.alert('성공', '모의고사가 성공적으로 업로드되었습니다.');
                setUploadModalVisible(false);
                setUploadTitle('');
                setUploadImages([]);
                fetchMockExams();
            } else {
                throw new Error(result.message || result.error || '업로드에 실패했습니다.');
            }
        } catch (error) {
            console.error('모의고사 업로드 실패:', error);
            Alert.alert('업로드 실패', error.message || '알 수 없는 오류가 발생했습니다.');
        } finally {
            setUploading(false);
        }
    };

    const openExamViewer = (exam) => {
        setSelectedExam(exam);
        setViewerModalVisible(true);
    };

    const renderExamItem = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => openExamViewer(item)}>
            {item.images && item.images.length > 0 && (
                <Image
                    source={{ uri: `${API_URL}${item.images[0]}` }}
                    style={styles.cardImage}
                    resizeMode="cover"
                />
            )}
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardInfo}>{`이미지 ${item.images?.length || 0}장`}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderSidebar = () => {
        if (isPhone) {
            return sidebarVisible && (
                <View style={styles.mobileSidebar}>
                    <Animated.View style={[
                        styles.mobileSidebarContent,
                        { transform: [{ translateX: slideAnim }] }
                    ]}>
                        <View style={styles.searchContainer}>
                            <Text style={styles.searchIconText}>🔍</Text>
                            <TextInput 
                                style={styles.searchInput} 
                                placeholder="검색" 
                                placeholderTextColor="#999" 
                                value={searchText} 
                                onChangeText={setSearchText} 
                            />
                        </View>
                        <ScrollView style={styles.subjectList} showsVerticalScrollIndicator={false}>
                            {getSubjects(isAdmin).map((subject, index) => (
                                <TouchableOpacity
                                    key={`${subject}-${index}`}
                                    style={[styles.subjectItem, subject === activeSubject && styles.activeSubjectItem]}
                                    onPress={() => handleSubjectPress(subject)}
                                >
                                    <Text style={[styles.subjectText, subject === activeSubject && styles.activeSubjectText]}>
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
            );
        } else {
            return sidebarVisible && (
                <View style={styles.sidebar}>
                    <View style={styles.searchContainer}>
                        <Text style={styles.searchIconText}>🔍</Text>
                        <TextInput 
                            style={styles.searchInput} 
                            placeholder="검색" 
                            placeholderTextColor="#999" 
                            value={searchText} 
                            onChangeText={setSearchText} 
                        />
                    </View>
                    <ScrollView style={styles.subjectList} showsVerticalScrollIndicator={false}>
                        {getSubjects(isAdmin).map((subject, index) => (
                            <TouchableOpacity
                                key={`${subject}-${index}`}
                                style={[styles.subjectItem, subject === activeSubject && styles.activeSubjectItem]}
                                onPress={() => handleSubjectPress(subject)}
                            >
                                <Text style={[styles.subjectText, subject === activeSubject && styles.activeSubjectText]}>
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
            );
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#5C7CFA" />
                    <Text style={{ marginTop: 10, color: '#666' }}>로딩 중...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* 모바일: UniversalHeader, 태블릿: 기존 헤더 */}
            <UniversalHeader 
                title="모의고사" 
                showBackButton={false}
                onHamburgerPress={toggleSidebar}
            />
            {screenInfo.width >= 768 && (
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity style={styles.hamburgerButton} onPress={toggleSidebar}>
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
            )}

            <View style={styles.container}>
                {renderSidebar()}
                
                <View style={[styles.mainContent, !sidebarVisible && styles.mainContentExpanded]}>
                    <View style={styles.mainHeader}>
                        {isAdmin && (
                            <TouchableOpacity style={styles.uploadButton} onPress={() => setUploadModalVisible(true)}>
                                <Text style={styles.uploadButtonText}>새 모의고사 등록</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <FlatList
                        data={mockExams}
                        renderItem={renderExamItem}
                        keyExtractor={(item, index) => item._id || `exam-${index}`}
                        numColumns={isPhone ? 1 : 2}
                        key={isPhone ? 'one-column' : 'two-columns'}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>등록된 모의고사가 없습니다.</Text>
                            </View>
                        }
                    />
                </View>
            </View>

            {/* 이미지 뷰어 모달 */}
            {selectedExam && (
                <Modal
                    animationType="slide"
                    transparent={false}
                    visible={viewerModalVisible}
                    onRequestClose={() => setViewerModalVisible(false)}
                >
                    <SafeAreaView style={styles.modalContainer}>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setViewerModalVisible(false)}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                        <FlatList
                            data={selectedExam.images || []}
                            renderItem={({ item }) => (
                                <View style={styles.modalImageContainer}>
                                    <View style={styles.imageWrapper}>
                                        <Image 
                                            source={{ uri: `${API_URL}${item}` }} 
                                            style={styles.modalImage} 
                                            resizeMode="contain" 
                                        />
                                    </View>
                                </View>
                            )}
                            keyExtractor={(item, index) => `image-${index}`}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                        />
                    </SafeAreaView>
                </Modal>
            )}

            {/* 업로드 모달 */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={uploadModalVisible}
                onRequestClose={() => setUploadModalVisible(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.uploadModalOverlay}
                >
                    <View style={styles.uploadModalContainer}>
                        <Text style={styles.uploadModalTitle}>새 모의고사 등록</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="모의고사 제목"
                            value={uploadTitle}
                            onChangeText={setUploadTitle}
                        />
                        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                            <Text style={styles.imagePickerButtonText}>이미지 선택 ({uploadImages.length}장)</Text>
                        </TouchableOpacity>
                        {uploadImages.length > 0 && (
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false}
                                style={{ maxHeight: 100, marginVertical: 10 }}
                            >
                                {uploadImages.map((uri, index) => (
                                    <Image key={index} source={{ uri }} style={styles.thumbnail} />
                                ))}
                            </ScrollView>
                        )}
                        {uploading ? (
                            <ActivityIndicator size="large" color="#5C7CFA" style={{ marginTop: 20 }} />
                        ) : (
                            <View style={styles.uploadActions}>
                                <Button title="취소" onPress={() => setUploadModalVisible(false)} color="#888" />
                                <Button title="업로드" onPress={handleUpload} color="#5C7CFA" />
                            </View>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    // 헤더 스타일 - 모바일 대응
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: Dimensions.get('window').width < 768 ? 20 : 24, 
        paddingVertical: Dimensions.get('window').width < 768 ? 14 : 16,
        paddingTop: Dimensions.get('window').width < 768 ? (Platform.OS === 'ios' ? 48 : 38) : 16,
        backgroundColor: 'white', 
        borderBottomWidth: Dimensions.get('window').width < 768 ? 0 : 1, 
        borderBottomColor: '#E5E5E5',
        shadowColor: Dimensions.get('window').width < 768 ? '#000' : 'transparent',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: Dimensions.get('window').width < 768 ? 0.05 : 0,
        shadowRadius: 8,
        elevation: Dimensions.get('window').width < 768 ? 3 : 0
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    hamburgerButton: { 
        width: Dimensions.get('window').width < 768 ? 28 : 24, 
        height: Dimensions.get('window').width < 768 ? 28 : 24, 
        justifyContent: Dimensions.get('window').width < 768 ? 'center' : 'space-between', 
        alignItems: Dimensions.get('window').width < 768 ? 'center' : undefined,
        padding: Dimensions.get('window').width < 768 ? 4 : undefined,
        paddingVertical: Dimensions.get('window').width < 768 ? undefined : 2 
    },
    hamburgerLine: { 
        width: Dimensions.get('window').width < 768 ? 20 : '100%', 
        height: Dimensions.get('window').width < 768 ? 2 : 3, 
        backgroundColor: Dimensions.get('window').width < 768 ? '#1A1A1A' : '#333', 
        borderRadius: Dimensions.get('window').width < 768 ? 1 : 2,
        marginVertical: Dimensions.get('window').width < 768 ? 2 : undefined
    },
    title: { 
        fontSize: Dimensions.get('window').width < 768 ? 20 : 26, 
        fontWeight: '700', 
        color: Dimensions.get('window').width < 768 ? '#1A1A1A' : '#000',
        letterSpacing: Dimensions.get('window').width < 768 ? -0.5 : 0
    },
    homeText: { 
        fontSize: Dimensions.get('window').width < 768 ? 13 : 16, 
        fontWeight: '500', 
        color: Dimensions.get('window').width < 768 ? '#666666' : '#000',
        marginLeft: Dimensions.get('window').width < 768 ? 4 : 0
    },
    profileIcon: { 
        width: Dimensions.get('window').width < 768 ? 36 : 44, 
        height: Dimensions.get('window').width < 768 ? 36 : 44, 
        borderRadius: Dimensions.get('window').width < 768 ? 18 : 22, 
        backgroundColor: Dimensions.get('window').width < 768 ? '#F5F5F5' : '#E0E0E0', 
        justifyContent: 'center', 
        alignItems: 'center',
        shadowColor: Dimensions.get('window').width < 768 ? '#000' : 'transparent',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: Dimensions.get('window').width < 768 ? 0.1 : 0,
        shadowRadius: 3,
        elevation: Dimensions.get('window').width < 768 ? 2 : 0,
        flexShrink: 0
    },
    profileImage: { 
        width: Dimensions.get('window').width < 768 ? 36 : 44, 
        height: Dimensions.get('window').width < 768 ? 36 : 44, 
        borderRadius: Dimensions.get('window').width < 768 ? 18 : 22 
    },
    defaultProfileIcon: { 
        width: Dimensions.get('window').width < 768 ? 36 : 44, 
        height: Dimensions.get('window').width < 768 ? 36 : 44, 
        borderRadius: Dimensions.get('window').width < 768 ? 18 : 22, 
        backgroundColor: '#4A90E2', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    profileText: { 
        fontSize: Dimensions.get('window').width < 768 ? 14 : 16, 
        color: '#fff', 
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: Dimensions.get('window').width < 768 ? 14 : 16
    },
    
    container: { flex: 1, flexDirection: 'row' },
    
    sidebar: { width: 320, backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 24, borderRightWidth: 1, borderRightColor: '#E5E5E5' },
    mobileSidebar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        flexDirection: 'row',
    },
    mobileSidebarContent: {
        width: '85%',
        maxWidth: 320,
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingVertical: 24,
        paddingTop: Platform.OS === 'ios' ? 64 : 44,
        paddingBottom: Platform.OS === 'ios' ? 54 : 36,
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    mobileSidebarOverlay: {
        flex: 1,
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
    searchIconText: { 
        fontSize: 14, 
        color: '#999', 
        marginRight: 8 
    },
    searchInput: { 
        flex: 1, 
        fontSize: 15, 
        color: '#000' 
    },
    subjectList: { flex: 1, gap: 4 },
    subjectItem: { 
        paddingVertical: 14, 
        paddingHorizontal: 16, 
        borderRadius: 10,
        marginBottom: Dimensions.get('window').width < 768 ? 4 : 0
    },
    activeSubjectItem: { 
        backgroundColor: Dimensions.get('window').width < 768 ? '#F0F4FF' : '#F0F0F0' 
    },
    subjectText: { 
        fontSize: Dimensions.get('window').width < 768 ? 15 : 16, 
        color: Dimensions.get('window').width < 768 ? '#666666' : '#666', 
        fontWeight: Dimensions.get('window').width < 768 ? '500' : '400' 
    },
    activeSubjectText: { 
        color: Dimensions.get('window').width < 768 ? '#4A90E2' : '#000', 
        fontWeight: '600' 
    },
    bottomDots: { 
        flexDirection: 'row', 
        justifyContent: 'center', 
        gap: 8, 
        paddingTop: 24,
        paddingBottom: Dimensions.get('window').width < 768 ? 10 : 0
    },
    dot: { 
        width: Dimensions.get('window').width < 768 ? 8 : 10, 
        height: Dimensions.get('window').width < 768 ? 8 : 10, 
        borderRadius: Dimensions.get('window').width < 768 ? 4 : 5, 
        backgroundColor: Dimensions.get('window').width < 768 ? '#E0E0E0' : '#D0D0D0' 
    },
    activeDot: { 
        backgroundColor: Dimensions.get('window').width < 768 ? '#4A90E2' : '#666',
        width: Dimensions.get('window').width < 768 ? 24 : 10
    },

    mainContent: { flex: 1, padding: 32 },
    mainContentExpanded: { paddingLeft: 16 },
    mainHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 22, fontWeight: '600', color: '#000' },
    uploadButton: { backgroundColor: '#5C7CFA', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8 },
    uploadButtonText: { color: 'white', fontWeight: 'bold' },

    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    emptyText: { fontSize: 16, color: '#888' },

    card: { backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', margin: 10, flex: 1, maxWidth: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, alignItems: 'center' },
    cardImage: { width: '100%', height: 150, alignSelf: 'center' },
    cardContent: { padding: 15 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
    cardInfo: { fontSize: 14, color: '#666' },

    modalContainer: { flex: 1, backgroundColor: 'black' },
    closeButton: { position: 'absolute', top: 50, right: 20, zIndex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 15, width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
    closeButtonText: { fontSize: 18, color: 'white', fontWeight: 'bold' },
    modalImageContainer: { 
        width: Dimensions.get('window').width, 
        height: Dimensions.get('window').height, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: 'black'
    },
    imageWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%'
    },
    modalImage: { 
        width: '100%', 
        height: '100%'
    },

    uploadModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    uploadModalContainer: { width: '90%', maxWidth: 500, backgroundColor: 'white', borderRadius: 12, padding: 20 },
    uploadModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    input: { borderWidth: 1, borderColor: '#DDD', padding: 10, borderRadius: 5, marginBottom: 15, fontSize: 16 },
    imagePickerButton: { backgroundColor: '#5C7CFA', padding: 15, borderRadius: 5, alignItems: 'center', marginBottom: 15 },
    imagePickerButtonText: { color: 'white', fontWeight: 'bold' },
    thumbnail: { width: 80, height: 80, borderRadius: 8, margin: 5 },
    uploadActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
});