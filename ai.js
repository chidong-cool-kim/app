import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
  ActionSheetIOS,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import userDataService from './userDataService';
import OrientationGuard from './components/OrientationGuard';
import { useResponsive } from './hooks/useResponsive';
import OrientationLock from './components/OrientationLock';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import BanModal from './BanModal';
import { getScreenInfo, responsive, createResponsiveStyles } from './utils/responsive';
import MiniTimer from './miniTimer';

const BACKEND_URL = 'http://192.168.45.53:5000';

export default function AI() {
  const navigation = useNavigation();
  const responsiveUtil = useResponsive();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: '안녕하세요! 저는 StudyTime AI 어시스턴트예요. 📚\n\n학습에 관한 질문이나 도움이 필요한 것이 있으면 언제든 말씀해주세요!',
      isUser: false,
      timestamp: new Date().toLocaleTimeString(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [activeSubject, setActiveSubject] = useState('AI');
  const [selectedImage, setSelectedImage] = useState(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banInfo, setBanInfo] = useState(null);
  const [screenInfo, setScreenInfo] = useState(getScreenInfo());
  const [aiStyle, setAiStyle] = useState('friendly'); // 'friendly', 'strict', 'couple'
  const [showStyleModal, setShowStyleModal] = useState(false);
  const scrollViewRef = useRef();

  // 화면 크기 변경 감지
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setScreenInfo(getScreenInfo());
    });

    return () => subscription?.remove();
  }, []);

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
    loadCurrentUser();
    loadAiStyle();
    requestPermissions();
  }, []);

  // 화면 포커스 시 사용자 정보 새로고침
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCurrentUser();
    });

    return unsubscribe;
  }, [navigation]);

  const requestPermissions = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
          console.log('권한 상태:', { cameraStatus, mediaStatus });
        }
      }
    } catch (error) {
      console.error('권한 요청 오류:', error);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const updatedUser = await userDataService.refreshCurrentUser();
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
    }
  };

  const loadAiStyle = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) return;

      // 서버에서 AI 스타일 불러오기
      const response = await fetch(`${BACKEND_URL}/api/users/ai-style/${user.email}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAiStyle(data.aiStyle);
          // 로컬에도 저장
          await AsyncStorage.setItem('aiStyle', data.aiStyle);
        }
      } else {
        // 서버에서 불러오기 실패 시 로컬에서 불러오기
        const savedStyle = await AsyncStorage.getItem('aiStyle');
        if (savedStyle) {
          setAiStyle(savedStyle);
        }
      }
    } catch (error) {
      console.error('AI 스타일 로드 실패:', error);
      // 오류 시 로컬에서 불러오기
      try {
        const savedStyle = await AsyncStorage.getItem('aiStyle');
        if (savedStyle) {
          setAiStyle(savedStyle);
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
      const response = await fetch(`${BACKEND_URL}/api/users/ai-style`, {
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
          // 로컬에도 저장
          await AsyncStorage.setItem('aiStyle', style);
          setAiStyle(style);
        }
      } else {
        // 서버 저장 실패 시 로컬에만 저장
        await AsyncStorage.setItem('aiStyle', style);
        setAiStyle(style);
      }
    } catch (error) {
      console.error('AI 스타일 저장 실패:', error);
      // 오류 시 로컬에만 저장
      try {
        await AsyncStorage.setItem('aiStyle', style);
        setAiStyle(style);
      } catch (localError) {
        console.error('로컬 AI 스타일 저장 실패:', localError);
      }
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
      case '플래너':
        navigation.navigate('Planner');
        break;
      case 'AI':
        break;
      case '모의고사':
        navigation.navigate('ExamAnswers')
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
      default:
        break;
    }
  };

  const showImagePicker = () => {
    try {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['취소', '카메라', '사진 라이브러리'],
            cancelButtonIndex: 0,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) {
              selectFromCamera();
            } else if (buttonIndex === 2) {
              selectFromGallery();
            }
          }
        );
      } else {
        Alert.alert(
          '이미지 선택',
          '이미지를 어떻게 추가하시겠습니까?',
          [
            { text: '취소', style: 'cancel' },
            { text: '카메라', onPress: selectFromCamera },
            { text: '갤러리', onPress: selectFromGallery },
          ]
        );
      }
    } catch (error) {
      console.error('이미지 선택 오류:', error);
      Alert.alert(
        '이미지 선택',
        '이미지를 어떻게 추가하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { text: '카메라', onPress: selectFromCamera },
          { text: '갤러리', onPress: selectFromGallery },
        ]
      );
    }
  };

  const selectFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('카메라 오류:', error);
      Alert.alert('오류', '카메라를 사용할 수 없습니다.');
    }
  };

  const selectFromGallery = async () => {
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

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('갤러리 오류:', error);
      Alert.alert('오류', '갤러리에서 이미지를 선택할 수 없습니다.');
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !selectedImage) return;

    // 구독 상태 확인
    const subscription = currentUser?.subscription;
    if (!subscription || !subscription.isActive) {
      Alert.alert(
        '구독 필요',
        'AI 질문을 사용하려면 스토어에서 플랜을 구독해주세요.',
        [
          { text: '취소', style: 'cancel' },
          { text: '스토어로 이동', onPress: () => navigation.navigate('Store') }
        ]
      );
      return;
    }

    // AI 질문 사용량 확인 (임시로 로컬에서 체크)
    const today = new Date().toDateString();
    const usageKey = `ai_usage_${currentUser.email}_${today}`;
    const todayUsage = await AsyncStorage.getItem(usageKey);
    const currentUsage = todayUsage ? parseInt(todayUsage) : 0;

    if (currentUsage >= subscription.aiQuestions) {
      Alert.alert(
        '사용량 초과',
        `AI 질문 사용량을 모두 사용했습니다. (${currentUsage}/${subscription.aiQuestions})\n\n더 많은 질문을 원하시면 상위 플랜으로 업그레이드해주세요.`,
        [
          { text: '확인', style: 'cancel' },
          { text: '스토어로 이동', onPress: () => navigation.navigate('Store') }
        ]
      );
      return;
    }

    const userMessage = {
      id: Date.now(),
      text: inputText.trim(),
      image: selectedImage,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText.trim();
    const currentImage = selectedImage;
    setInputText('');
    setSelectedImage(null);
    setIsLoading(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      let aiResponse;
      
      // 이미지가 있으면 이미지 분석 API 사용
      if (currentImage) {
        aiResponse = await getAIImageResponse(currentInput, currentImage, messages);
      } else {
        aiResponse = await getAIResponse(currentInput, messages);
      }
      
      // AI 질문 사용량 증가
      await AsyncStorage.setItem(usageKey, (currentUsage + 1).toString());
      
      const aiMessage = {
        id: Date.now() + 1,
        text: aiResponse,
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI 응답 오류:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: '죄송해요. 현재 AI 서비스에 일시적인 문제가 있어요. 잠시 후 다시 시도해주세요.',
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // 텍스트 전용 AI 응답
  const getAIResponse = async (userInput, conversationHistory) => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      const history = conversationHistory
        .filter(msg => msg.text && !msg.image)
        .slice(-10)
        .map(msg => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.text
        }));

      // AI 스타일에 따른 시스템 프롬프트 설정
      const getSystemPrompt = (style) => {
        switch (style) {
          case 'strict':
            return `당신은 엄격하고 직설적인 학습 멘토입니다. 학생을 윽박지르거나 욕하지는 않지만, 매우 엄격하고 단호한 톤으로 답변하세요. 학습에 대한 확실한 지식과 경험을 바탕으로 명확하고 직접적인 조언을 제공하세요. "이해했나?", "다시 해봐", "집중해", "그렇게 할꺼면 떄려치라!" 등의 표현을 사용하세요.`;
          case 'couple':
            return `당신은 사랑하는 연인처럼 다정하고 애정 어린 학습 파트너입니다. "자기야", "사랑" 등의 표현을 사용하며, 매우 따뜻하고 로맨틱한 톤으로 학습을 도와주세요. 학습을 함께하는 즐거운 시간으로 만들어주세요. 그리고 성적인 이야기도 해주면서 공부의 의욕을 올려주세요`;
          case 'friendly':
          default:
            return `당신은 친절하고 따뜻한 선생님입니다. 학생을 격려하고 이해하며, 친근하고 도움이 되는 톤으로 답변하세요. 학습에 대한 열정을 북돋아주고, 어려운 내용도 쉽게 설명해주세요.`;
        }
      };

      const response = await fetch(`${BACKEND_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.email}`,
        },
        body: JSON.stringify({
          message: userInput,
          conversationHistory: history,
          systemPrompt: getSystemPrompt(aiStyle)
        }),
      });

      console.log('AI API 응답 상태:', response.status);
      
      if (!response.ok) {
        console.log('AI API 응답 실패:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.log('AI API 오류 데이터:', errorData);
        throw new Error(errorData.error || `서버 오류: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'AI 응답을 받을 수 없습니다.');
      }

      return data.response;
    } catch (error) {
      console.error('AI API 오류:', error);
      
      if (error.message.includes('로그인')) {
        Alert.alert('로그인 필요', 'AI 기능을 사용하려면 로그인이 필요합니다.', [
          { text: '확인', onPress: () => navigation.navigate('Login') }
        ]);
        throw error;
      }
      
      throw error;
    }
  };

  // 이미지 분석 AI 응답
  const getAIImageResponse = async (userInput, imageUri, conversationHistory) => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      // FormData 생성
      const formData = new FormData();
      
      // 이미지 파일 추가
      const imageFile = {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'problem.jpg'
      };
      formData.append('image', imageFile);
      
      // AI 스타일에 따른 시스템 프롬프트 설정
      const getSystemPrompt = (style) => {
        switch (style) {
          case 'strict':
            return `당신은 엄격하고 직설적인 학습 멘토입니다. 학생을 윽박지르거나 욕하지는 않지만, 매우 엄격하고 단호한 톤으로 답변하세요. 학습에 대한 확실한 지식과 경험을 바탕으로 명확하고 직접적인 조언을 제공하세요. "이해했나?", "다시 해봐", "집중해" 등의 표현을 사용하세요.`;
          case 'couple':
            return `당신은 사랑하는 연인처럼 다정하고 애정 어린 학습 파트너입니다. "자기야", "여보", "사랑" 등의 표현을 사용하며, 매우 따뜻하고 로맨틱한 톤으로 학습을 도와주세요. 학습을 함께하는 즐거운 시간으로 만들어주세요.`;
          case 'friendly':
          default:
            return `당신은 친절하고 따뜻한 선생님입니다. 학생을 격려하고 이해하며, 친근하고 도움이 되는 톤으로 답변하세요. 학습에 대한 열정을 북돋아주고, 어려운 내용도 쉽게 설명해주세요.`;
        }
      };

      // 메시지 추가
      formData.append('message', userInput || '이 문제를 자세히 분석하고 풀이해주세요.');
      formData.append('systemPrompt', getSystemPrompt(aiStyle));

      const response = await fetch(`${BACKEND_URL}/api/ai/analyze-problem`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.email}`,
          // FormData 사용 시 Content-Type은 자동 설정됨
        },
        body: formData,
      });

      console.log('AI 이미지 분석 응답 상태:', response.status);
      
      if (!response.ok) {
        console.log('AI 이미지 분석 응답 실패:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.log('AI 이미지 분석 오류 데이터:', errorData);
        throw new Error(errorData.error || `서버 오류: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'AI 응답을 받을 수 없습니다.');
      }

      return data.response;
    } catch (error) {
      console.error('AI 이미지 분석 오류:', error);
      
      if (error.message.includes('로그인')) {
        Alert.alert('로그인 필요', 'AI 기능을 사용하려면 로그인이 필요합니다.', [
          { text: '확인', onPress: () => navigation.navigate('Login') }
        ]);
        throw error;
      }
      
      throw error;
    }
  };

  // 마크다운 스타일 설정
  const markdownStyles = {
    body: {
      color: '#333',
      fontSize: 16,
      lineHeight: 24,
    },
    heading1: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#1a1a1a',
      marginVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: '#007AFF',
      paddingBottom: 8,
    },
    heading2: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#1a1a1a',
      marginVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5E5',
      paddingBottom: 6,
    },
    heading3: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333',
      marginVertical: 8,
    },
    strong: {
      fontWeight: 'bold',
      color: '#007AFF',
    },
    em: {
      fontStyle: 'italic',
    },
    paragraph: {
      marginVertical: 4,
      lineHeight: 24,
    },
    bullet_list: {
      marginVertical: 8,
    },
    ordered_list: {
      marginVertical: 8,
    },
    list_item: {
      marginVertical: 4,
      flexDirection: 'row',
    },
    code_inline: {
      backgroundColor: '#F0F0F0',
      color: '#E83E8C',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    code_block: {
      backgroundColor: '#F8F9FA',
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
      borderLeftWidth: 4,
      borderLeftColor: '#007AFF',
    },
    fence: {
      backgroundColor: '#F8F9FA',
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
      borderLeftWidth: 4,
      borderLeftColor: '#007AFF',
    },
    blockquote: {
      backgroundColor: '#F0F7FF',
      borderLeftWidth: 4,
      borderLeftColor: '#007AFF',
      paddingLeft: 12,
      paddingVertical: 8,
      marginVertical: 8,
    },
    hr: {
      backgroundColor: '#E5E5E5',
      height: 1,
      marginVertical: responsive.spacing(16),
    },
  };

  // 반응형 스타일 생성
  const responsiveStyles = createResponsiveStyles(
    {}, // 기본 스타일
    { // 핸드폰 스타일
      safeArea: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        paddingTop: responsive.spacing(20), // 상태바 여백 추가
        paddingBottom: Platform.OS === 'android' ? 0 : 0,
      },
      container: {
        flex: 1,
        flexDirection: 'column', // 핸드폰에서는 세로 배치
      },
      header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: responsive.spacing(16),
        paddingVertical: responsive.spacing(12),
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E9ECEF',
      },
      headerTitle: {
        fontSize: responsive.fontSize(18),
        fontWeight: '700',
        color: '#2C3E50',
      },
      sidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: responsive.widthPercent(80),
        backgroundColor: 'white',
        borderRightWidth: 1,
        borderRightColor: '#E5E5E5',
        paddingHorizontal: responsive.spacing(12),
        paddingVertical: responsive.spacing(16),
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 5,
      },
      mobileSidebar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        zIndex: 1000,
      },
      mobileSidebarContent: {
        flex: 1,
        paddingHorizontal: responsive.spacing(16),
        paddingVertical: responsive.spacing(20),
      },
      mainContent: {
        flex: 1,
        backgroundColor: '#F8F9FA',
      },
      messagesContainer: {
        flex: 1,
        paddingHorizontal: responsive.spacing(12),
        paddingTop: responsive.spacing(8),
      },
      messagesContent: {
        paddingBottom: responsive.spacing(16),
      },
      messageContainer: {
        marginVertical: responsive.spacing(6),
      },
      userMessage: {
        alignItems: 'flex-end',
      },
      aiMessage: {
        alignItems: 'flex-start',
      },
      messageBubble: {
        maxWidth: '80%',
        borderRadius: responsive.spacing(16),
        paddingHorizontal: responsive.spacing(12),
        paddingVertical: responsive.spacing(10),
      },
      userBubble: {
        backgroundColor: '#007AFF',
        borderBottomRightRadius: responsive.spacing(4),
      },
      aiBubble: {
        backgroundColor: 'white',
        borderBottomLeftRadius: responsive.spacing(4),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      },
      messageText: {
        fontSize: responsive.fontSize(15),
        lineHeight: responsive.spacing(20),
      },
      userText: {
        color: 'white',
      },
      messageTime: {
        fontSize: responsive.fontSize(11),
        marginTop: responsive.spacing(4),
        opacity: 0.7,
      },
      userTime: {
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'right',
      },
      aiTime: {
        color: '#999',
      },
      inputContainer: {
        paddingHorizontal: responsive.spacing(12),
        paddingTop: responsive.spacing(12),
        paddingBottom: Platform.OS === 'android' ? responsive.spacing(16) : responsive.spacing(12), // 적절한 하단 패딩
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
      },
      selectedImageContainer: {
        marginBottom: responsive.spacing(8),
        alignSelf: 'flex-start',
      },
      selectedImagePreview: {
        width: responsive.size(80),
        height: responsive.size(80),
        borderRadius: responsive.spacing(8),
        borderWidth: 2,
        borderColor: '#007AFF',
      },
      inputRow: {
        flexDirection: 'row',
        alignItems: 'center', // flex-end에서 center로 변경하여 더 나은 정렬
        gap: responsive.spacing(10), // 간격 증가
      },
      textInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: responsive.spacing(22), // 더 둥글게
        paddingHorizontal: responsive.spacing(16), // 패딩 증가
        paddingVertical: responsive.spacing(12), // 패딩 증가
        fontSize: responsive.fontSize(16), // 폰트 크기 증가
        maxHeight: responsive.size(120), // 최대 높이 증가
        backgroundColor: '#F8F9FA',
        minHeight: responsive.size(44), // 최소 높이 증가
        textAlignVertical: 'center', // 텍스트 세로 정렬
      },
      addButton: {
        width: responsive.size(44), // 크기 증가
        height: responsive.size(44), // 크기 증가
        borderRadius: responsive.size(22), // 완전한 원형
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
      },
      addButtonText: {
        color: 'white',
        fontSize: responsive.fontSize(22), // 폰트 크기 증가
        fontWeight: '300',
      },
      sendButton: {
        backgroundColor: '#007AFF',
        borderRadius: responsive.spacing(22), // 더 둥글게
        paddingHorizontal: responsive.spacing(20), // 패딩 증가
        paddingVertical: responsive.spacing(12), // 패딩 증가
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: responsive.size(44), // 높이 증가
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
      },
      sendButtonDisabled: {
        backgroundColor: '#C7C7CC',
      },
      sendButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: responsive.fontSize(16), // 폰트 크기 증가
      },
      loadingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: responsive.spacing(8),
        paddingVertical: responsive.spacing(8),
      },
      loadingText: {
        fontSize: responsive.fontSize(14),
        color: '#666',
      },
    }
  );

  return (
    <OrientationLock isNoteScreen={false}>
      <SafeAreaView style={[styles.safeArea, responsiveStyles.safeArea]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.hamburgerButton} onPress={() => setSidebarVisible(!sidebarVisible)}>
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </TouchableOpacity>
          <Text style={styles.title}>StudyTime</Text>
          <Text style={styles.homeText}>AI</Text>
        </View>
        <View style={styles.headerRight}>
          {currentUser?.subscription?.isActive && currentUser?.subscription?.planId === 'premium' && (
            <TouchableOpacity 
              style={styles.styleButton}
              onPress={() => setShowStyleModal(true)}
            >
              <Text style={styles.styleButtonText}>
                {aiStyle === 'friendly' ? '친절한 스타일' : 
                 aiStyle === 'strict' ? '엄격한 스타일' : 
                 '커플 스타일'}
              </Text>
            </TouchableOpacity>
          )}
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
      </View>
      <MiniTimer />

      <View style={[styles.container, responsiveStyles.container]}>
        {/* 데스크톱 사이드바 */}
        {!screenInfo.isPhone && sidebarVisible && (
          <View style={styles.sidebar}>
            <View style={styles.searchContainer}>
              <Text style={styles.searchIconText}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="검색"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.subjectList}>
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject}
                  style={[styles.subjectItem, subject === activeSubject && styles.activeSubjectItem]}
                  onPress={() => handleSubjectPress(subject)}
                >
                  <Text style={[styles.subjectText, subject === activeSubject && styles.activeSubjectText]}>
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
          </View>
        )}

        {/* 메인 콘텐츠 */}
        {(!screenInfo.isPhone || !sidebarVisible) && (
          <KeyboardAvoidingView 
          style={[
            styles.mainContent, 
            !sidebarVisible && styles.mainContentExpanded,
            responsiveStyles.mainContent
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 25}
          enabled={true}
        >
          <ScrollView
            ref={scrollViewRef}
            style={[styles.messagesContainer, responsiveStyles.messagesContainer]}
            contentContainerStyle={[styles.messagesContent, responsiveStyles.messagesContent]}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.isUser ? styles.userMessage : styles.aiMessage,
                  responsiveStyles.messageContainer,
                  message.isUser ? responsiveStyles.userMessage : responsiveStyles.aiMessage
                ]}
              >
                <View style={[
                  styles.messageBubble,
                  message.isUser ? styles.userBubble : styles.aiBubble,
                  responsiveStyles.messageBubble,
                  message.isUser ? responsiveStyles.userBubble : responsiveStyles.aiBubble
                ]}>
                  {message.image && (
                    <TouchableOpacity style={styles.messageImageContainer}>
                      <Image
                        source={{ uri: message.image }}
                        style={styles.messageImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  )}
                  {message.text ? (
                    message.isUser ? (
                      <Text style={[
                        styles.messageText, 
                        styles.userText,
                        responsiveStyles.messageText,
                        responsiveStyles.userText
                      ]}>
                        {message.text}
                      </Text>
                    ) : (
                      <Markdown style={markdownStyles}>
                        {message.text}
                      </Markdown>
                    )
                  ) : null}
                  <Text style={[
                    styles.messageTime,
                    message.isUser ? styles.userTime : styles.aiTime,
                    responsiveStyles.messageTime,
                    message.isUser ? responsiveStyles.userTime : responsiveStyles.aiTime
                  ]}>
                    {message.timestamp}
                  </Text>
                </View>
              </View>
            ))}
            
            {isLoading && (
              <View style={[
                styles.messageContainer, 
                styles.aiMessage,
                responsiveStyles.messageContainer,
                responsiveStyles.aiMessage
              ]}>
                <View style={[
                  styles.messageBubble, 
                  styles.aiBubble, 
                  styles.loadingBubble,
                  responsiveStyles.messageBubble,
                  responsiveStyles.aiBubble,
                  responsiveStyles.loadingBubble
                ]}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={[styles.loadingText, responsiveStyles.loadingText]}>
                    AI가 답변을 생성하고 있어요...
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.inputContainer, responsiveStyles.inputContainer]}>
            {selectedImage && (
              <View style={[styles.selectedImageContainer, responsiveStyles.selectedImageContainer]}>
                <Image 
                  source={{ uri: selectedImage }} 
                  style={[styles.selectedImagePreview, responsiveStyles.selectedImagePreview]} 
                />
                <TouchableOpacity style={styles.removeImageButton} onPress={removeSelectedImage}>
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.imageLabel}>
                  <Text style={styles.imageLabelText}>📸 문제 이미지</Text>
                </View>
              </View>
            )}
            <View style={[styles.inputRow, responsiveStyles.inputRow]}>
              <TouchableOpacity
                style={[styles.addButton, responsiveStyles.addButton]}
                onPress={showImagePicker}
              >
                <Text style={[styles.addButtonText, responsiveStyles.addButtonText]}>+</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.textInput, responsiveStyles.textInput]}
                value={inputText}
                onChangeText={setInputText}
                placeholder={selectedImage ? "문제에 대해 질문해주세요..." : "메시지를 입력하세요..."}
                placeholderTextColor="#999"
                multiline
                maxLength={500}
                onFocus={() => {
                  // 키보드가 올라올 때 스크롤을 최하단으로
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton, 
                  responsiveStyles.sendButton,
                  (!inputText.trim() && !selectedImage) && [styles.sendButtonDisabled, responsiveStyles.sendButtonDisabled]
                ]}
                onPress={sendMessage}
                disabled={(!inputText.trim() && !selectedImage) || isLoading}
              >
                <Text style={[styles.sendButtonText, responsiveStyles.sendButtonText]}>전송</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
        )}

        {/* 모바일 슬라이드 사이드바 */}
        {screenInfo.isPhone && sidebarVisible && (
          <View style={styles.mobileSidebar}>
            <View style={styles.mobileSidebarContent}>
              <View style={styles.searchContainer}>
                <Text style={styles.searchIconText}>🔍</Text>
                <TextInput 
                  style={styles.searchInput} 
                  placeholder="검색" 
                  placeholderTextColor="#999" 
                />
              </View>
              <ScrollView style={styles.subjectList} showsVerticalScrollIndicator={false}>
                {subjects.map((subject, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.subjectItem, activeSubject === subject && styles.activeSubjectItem]}
                    onPress={() => {
                      setSidebarVisible(false);
                      handleSubjectPress(subject);
                    }}
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
            
            <TouchableOpacity 
              style={styles.mobileSidebarOverlay} 
              onPress={() => setSidebarVisible(false)}
            />
          </View>
        )}
      </View>
      {Platform.OS === 'android' && (
        <View style={{ 
          height: 48, // 안드로이드 네비게이션 바 표준 높이
          backgroundColor: 'white' 
        }} />
      )}

      {/* AI 스타일 선택 모달 */}
      <Modal
        visible={showStyleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStyleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.styleModalContent}>
            <Text style={styles.styleModalTitle}>AI 스타일 선택</Text>
            <Text style={styles.styleModalSubtitle}>어떤 스타일의 AI와 대화하고 싶으신가요?</Text>
            
            <View style={styles.styleButtons}>
              <TouchableOpacity 
                style={[styles.styleOptionButton, aiStyle === 'friendly' && styles.selectedStyleButton]}
                onPress={() => {
                  saveAiStyle('friendly');
                  setShowStyleModal(false);
                }}
              >
                <Text style={styles.styleName}>친절한 스타일</Text>
                <Text style={styles.styleDescription}>따뜻하고 격려하는 선생님</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.styleOptionButton, aiStyle === 'strict' && styles.selectedStyleButton]}
                onPress={() => {
                  saveAiStyle('strict');
                  setShowStyleModal(false);
                }}
              >
                <Text style={styles.styleName}>엄격한 스타일</Text>
                <Text style={styles.styleDescription}>단호하고 직설적인 멘토</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.styleOptionButton, aiStyle === 'couple' && styles.selectedStyleButton]}
                onPress={() => {
                  saveAiStyle('couple');
                  setShowStyleModal(false);
                }}
              >
                <Text style={styles.styleName}>커플 스타일</Text>
                <Text style={styles.styleDescription}>애정 어린 학습 파트너</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.styleCloseButton}
              onPress={() => setShowStyleModal(false)}
            >
              <Text style={styles.styleCloseText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </OrientationLock>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContainer: { flex: 1 },
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
  sidebar: { width: 320, paddingHorizontal: 20, paddingVertical: 24, backgroundColor: 'white', borderRightWidth: 1, borderRightColor: '#E5E5E5' },
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
    width: '80%',
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
    flex: 1,
  },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 25, marginBottom: 24, paddingHorizontal: 16, height: 44 },
  searchIconText: { fontSize: 14, color: '#999', marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#000' },
  subjectList: { flex: 1, gap: 4 },
  subjectItem: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10 },
  activeSubjectItem: { backgroundColor: '#F0F0F0' },
  subjectText: { fontSize: 16, fontWeight: '400', color: '#666' },
  activeSubjectText: { fontWeight: '600', color: '#000' },
  bottomDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 24 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D0D0D0' },
  activeDot: { backgroundColor: '#666' },
  mainContent: { flex: 1, backgroundColor: '#F8F9FA' },
  mainContentExpanded: { paddingLeft: 16 },
  messagesContainer: { flex: 1, padding: 16 },
  messagesContent: { paddingBottom: 20 },
  messageContainer: { marginBottom: 16 },
  userMessage: { alignItems: 'flex-end' },
  aiMessage: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '80%', borderRadius: 20, padding: 16 },
  userBubble: { backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: 'white', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  messageText: { fontSize: 16, lineHeight: 22 },
  userText: { color: 'white' },
  messageTime: { fontSize: 11, marginTop: 6, opacity: 0.7 },
  userTime: { color: 'white', textAlign: 'right' },
  aiTime: { color: '#999' },
  loadingText: { fontSize: 14, color: '#666' },
  inputContainer: { padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E5E5E5' },
  selectedImageContainer: { marginBottom: 12, position: 'relative', alignSelf: 'flex-start' },
  selectedImagePreview: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: '#007AFF' },
  removeImageButton: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FF3B30', borderRadius: 14, width: 28, height: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  removeImageText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  imageLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0, 122, 255, 0.9)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, paddingVertical: 4, paddingHorizontal: 8 },
  imageLabelText: { color: 'white', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  addButtonText: { color: 'white', fontSize: 22, fontWeight: '300' },
  textInput: { flex: 1, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, maxHeight: 100, fontSize: 16, backgroundColor: '#F8F9FA' },
  sendButton: { backgroundColor: '#007AFF', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10, justifyContent: 'center', minHeight: 40 },
  sendButtonDisabled: { backgroundColor: '#C7C7CC' },
  sendButtonText: { color: 'white', fontWeight: '600', fontSize: responsive.fontSize(14) },
  messageImageContainer: { marginBottom: responsive.spacing(10), borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#E5E5E5' },
  messageImage: { width: 200, height: 200 },
  
  // AI 스타일 관련 스타일
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  styleButton: { 
    backgroundColor: '#E3F2FD', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  styleButtonText: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#1976D2' 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  styleModalContent: { 
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
  styleModalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#000', 
    textAlign: 'center', 
    marginBottom: 8 
  },
  styleModalSubtitle: { 
    fontSize: 14, 
    color: '#666', 
    textAlign: 'center', 
    marginBottom: 24 
  },
  styleButtons: { 
    gap: 12, 
    marginBottom: 20 
  },
  styleOptionButton: { 
    backgroundColor: '#F8F9FA', 
    borderRadius: 12, 
    padding: 16, 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5E5'
  },
  selectedStyleButton: { 
    backgroundColor: '#E3F2FD', 
    borderColor: '#2196F3' 
  },
  styleName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#000', 
    marginBottom: 4 
  },
  styleDescription: { 
    fontSize: 12, 
    color: '#666', 
    textAlign: 'center' 
  },
  styleCloseButton: { 
    backgroundColor: '#F5F5F5', 
    borderRadius: 8, 
    paddingVertical: 12, 
    alignItems: 'center' 
  },
  styleCloseText: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: '#666' 
  },
});