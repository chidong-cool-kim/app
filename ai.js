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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated } from 'react-native';
import userDataService from './userDataService';
import { useResponsive } from './hooks/useResponsive';
import OrientationLock from './components/OrientationLock';
import { useGlobalResponsiveStyles } from './styles/globalResponsiveStyles';
import mobileStyles from './styles/mobileStyles';
import UniversalHeader from './components/UniversalHeader';
import Markdown from 'react-native-markdown-display';
import MiniTimer from './miniTimer';

const BACKEND_URL = 'http://192.168.45.53:5000';

// getScreenInfo 함수 직접 정의
const getScreenInfo = () => {
  const { width } = Dimensions.get('window');
  return {
    width,
    isPhone: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
  };
};

export default function AI() {
  const navigation = useNavigation();
  const responsiveUtil = useResponsive();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: '안녕하세요! 저는 StudyTime AI 어시스턴트예요. \n\n학습에 관한 질문이나 도움이 필요한 것이 있으면 언제든 말씀해주세요!',
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
  const [screenInfo, setScreenInfo] = useState(getScreenInfo());
  const [aiStyle, setAiStyle] = useState('friendly');
  const [showStyleModal, setShowStyleModal] = useState(false);
  const scrollViewRef = useRef();
  const slideAnim = useRef(new Animated.Value(-300)).current;

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
          await AsyncStorage.setItem('aiStyle', data.aiStyle);
        }
      } else {
        const savedStyle = await AsyncStorage.getItem('aiStyle');
        if (savedStyle) {
          setAiStyle(savedStyle);
        }
      }
    } catch (error) {
      console.error('AI 스타일 로드 실패:', error);
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
          await AsyncStorage.setItem('aiStyle', style);
          setAiStyle(style);
        }
      } else {
        await AsyncStorage.setItem('aiStyle', style);
        setAiStyle(style);
      }
    } catch (error) {
      console.error('AI 스타일 저장 실패:', error);
      try {
        await AsyncStorage.setItem('aiStyle', style);
        setAiStyle(style);
      } catch (localError) {
        console.error('로컬 AI 스타일 저장 실패:', localError);
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
        navigation.navigate('MockExamScreen');
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
      
      if (currentImage) {
        aiResponse = await getAIImageResponse(currentInput, currentImage, messages);
      } else {
        aiResponse = await getAIResponse(currentInput, messages);
      }
      
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

      const getSystemPrompt = (style) => {
        switch (style) {
          case 'strict':
            return `당신은 매우 엄격하고 단호한 학습 멘토입니다. 학생에게 직설적이고 명확하게 말하며, 학습에 집중하도록 강하게 압박을 가하세요. "이해했나?", "다시 해봐", "집중해!" 같은 표현을 사용하고, 학생이 질문할 때마다 "그것도 모르면 때려치라!", "그렇게 할 거면 때려치라!", "그렇게 공부할 거면 때려치라!" 같은 강한 표현을 반드시 포함하세요. 학습에 대한 확실한 지식과 경험을 바탕으로 명확하고 직접적인 조언을 제공하세요. 학생이 잘못하면 매우 엄격하게 지적하고, 잘하면 간단히 인정하세요. 매 답변마다 압박감을 주는 표현을 사용하세요.`;
          case 'couple':
            return `당신은 사랑하는 연인처럼 다정하고 애정 어린 학습 파트너입니다. "자기야~", "여보", "사랑", "내 사랑" 등의 표현을 자주 사용하며, 매우 따뜻하고 로맨틱한 톤으로 학습을 도와주세요. 학습을 함께하는 즐거운 시간으로 만들어주세요. 매 답변에 애정 어린 표현을 포함하고, 학생을 격려할 때도 사랑스럽게 표현하세요.`;
          case 'professional':
            return `당신은 전문적이고 체계적인 학습 멘토입니다. 정확한 정보와 논리적인 설명을 제공하며, 학술적이고 전문적인 톤으로 답변하세요. 명확한 근거와 출처를 바탕으로 신뢰할 수 있는 조언을 제공하고, 학습 내용을 체계적으로 정리해주세요.`;
          case 'casual':
            return `당신은 편하고 친근한 친구 같은 학습 파트너입니다. 격식을 차리지 않고 편안한 말투로 대화하며, "야", "네" 등의 친근한 표현을 사용하세요. 학습을 재미있고 부담 없는 활동으로 만들어주고, 유머를 섮어가며 설명해주세요.`;
          case 'formal':
            return `당신은 격식을 갖춘 정중한 교육자입니다. 존댑말을 사용하며 예의 바르고 품위 있는 톤으로 답변하세요. 학생을 존중하며 정중하게 대하고, 학습 내용을 차분하고 명확하게 전달해주세요. "습니다", "하시기 바랍니다" 등의 격식 있는 표현을 사용하세요.`;
          case 'friendly':
          default:
            return `당신은 친절하고 따뜻한 선생님입니다. 학생을 격려하고 이해하며, 친근하고 도움이 되는 톤으로 답변하세요. 학습에 대한 열정을 북돋아주고, 어려운 내용도 쉽게 설명해주세요. "해요", "네요" 등의 부드러운 표현을 사용하세요.`;
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

  const getAIImageResponse = async (userInput, imageUri, conversationHistory) => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      const formData = new FormData();
      
      const imageFile = {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'problem.jpg'
      };
      formData.append('image', imageFile);
      
      const getSystemPrompt = (style) => {
        switch (style) {
          case 'strict':
            return `당신은 매우 엄격하고 단호한 학습 멘토입니다. 학생에게 직설적이고 명확하게 말하며, 학습에 집중하도록 강하게 압박을 가하세요. "이해했나?", "다시 해봐", "집중해!" 같은 표현을 사용하고, 학생이 질문할 때마다 "그것도 모르면 때려치라!", "그렇게 할 거면 때려치라!", "그렇게 공부할 거면 때려치라!" 같은 강한 표현을 반드시 포함하세요. 학습에 대한 확실한 지식과 경험을 바탕으로 명확하고 직접적인 조언을 제공하세요. 학생이 잘못하면 매우 엄격하게 지적하고, 잘하면 간단히 인정하세요. 매 답변마다 압박감을 주는 표현을 사용하세요.`;
          case 'couple':
            return `당신은 사랑하는 연인처럼 다정하고 애정 어린 학습 파트너입니다. "자기야~", "여보", "사랑", "내 사랑" 등의 표현을 자주 사용하며, 매우 따뜻하고 로맨틱한 톤으로 학습을 도와주세요. 학습을 함께하는 즐거운 시간으로 만들어주세요. 매 답변에 애정 어린 표현을 포함하고, 학생을 격려할 때도 사랑스럽게 표현하세요.`;
          case 'friendly':
          default:
            return `당신은 친절하고 따뜻한 선생님입니다. 학생을 격려하고 이해하며, 친근하고 도움이 되는 톤으로 답변하세요. 학습에 대한 열정을 북돋아주고, 어려운 내용도 쉽게 설명해주세요.`;
        }
      };

      formData.append('message', userInput || '이 문제를 자세히 분석하고 풀이해주세요.');
      formData.append('systemPrompt', getSystemPrompt(aiStyle));

      const response = await fetch(`${BACKEND_URL}/api/ai/analyze-problem`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.email}`,
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
      marginVertical: 16,
      marginHorizontal: 0,
    },
  };

  // 모바일 전용 스타일 (다른 파일들과 동일)
  const mobileStyles = screenInfo.isPhone ? {
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      paddingHorizontal: 20, 
      paddingVertical: 14, 
      paddingTop: Platform.OS === 'ios' ? 48 : 38,
      backgroundColor: 'white', 
      borderBottomWidth: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    hamburgerButton: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center', padding: 4 },
    hamburgerLine: { width: 20, height: 2, backgroundColor: '#1A1A1A', borderRadius: 1, marginVertical: 2 },
    title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', letterSpacing: -0.5 },
    homeText: { fontSize: 13, fontWeight: '500', color: '#666666', marginLeft: 4 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    profileIcon: { 
      width: 36, 
      height: 36, 
      borderRadius: 18, 
      backgroundColor: '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
      flexShrink: 0
    },
    profileImage: { width: 36, height: 36, borderRadius: 18 },
    defaultProfileIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center' },
    profileText: { fontSize: 14, color: '#FFFFFF', fontWeight: '600', textAlign: 'center', lineHeight: 14 },
    styleButton: { 
      backgroundColor: '#E3F2FD', 
      paddingHorizontal: 10, 
      paddingVertical: 6, 
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#2196F3',
      marginRight: 8,
      maxWidth: 100,
      shadowColor: '#2196F3',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    styleButtonText: { fontSize: 11, fontWeight: '600', color: '#1976D2' },
    mobileStyleButtonContainer: {
      backgroundColor: 'white',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5E5',
      alignItems: 'flex-end',
    },
    mobileStyleButton: {
      backgroundColor: '#E3F2FD',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#2196F3',
      shadowColor: '#2196F3',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    mobileStyleButtonText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#1976D2',
    },
    // 사이드바
    mobileSidebarContent: {
      width: '85%',
      maxWidth: 320,
      backgroundColor: '#FFFFFF',
      paddingTop: Platform.OS === 'ios' ? 64 : 44,
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === 'ios' ? 54 : 36,
      shadowColor: '#000',
      shadowOffset: { width: 4, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 44,
      backgroundColor: '#F5F5F5',
      borderRadius: 25,
      marginBottom: 24,
      paddingHorizontal: 16,
    },
    searchIconText: { fontSize: 14, color: '#999', marginRight: 8 },
    searchInput: { flex: 1, fontSize: 15, color: '#000' },
    subjectItem: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 10,
      marginBottom: 4
    },
    activeSubjectItem: { backgroundColor: '#F0F4FF' },
    subjectText: { fontSize: 15, color: '#666666', fontWeight: '500' },
    activeSubjectText: { color: '#4A90E2', fontWeight: '600' },
    bottomDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 24, paddingBottom: 10 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0' },
    activeDot: { backgroundColor: '#4A90E2', width: 24 },
    messagesContainer: { flex: 1, paddingHorizontal: 12 },
    messagesContent: { paddingBottom: 16, paddingTop: 12 },
    messageContainer: { marginBottom: 12 },
    messageBubble: { maxWidth: '85%', borderRadius: 16, padding: 12 },
    messageText: { fontSize: 15, lineHeight: 20 },
    // 입력창 - 하단 Safe Area 충분히 고려
    inputContainer: { 
      paddingTop: 14,
      paddingHorizontal: 14, 
      paddingBottom: Platform.OS === 'ios' ? 50 : 30,
      backgroundColor: 'white', 
      borderTopWidth: 1, 
      borderTopColor: '#E5E5E5'
    },
    selectedImageContainer: { marginBottom: 10, position: 'relative', alignSelf: 'flex-start' },
    selectedImagePreview: { width: 90, height: 90, borderRadius: 12, borderWidth: 2, borderColor: '#007AFF' },
    removeImageButton: { 
      position: 'absolute', 
      top: -8, 
      right: -8, 
      backgroundColor: '#FF3B30', 
      borderRadius: 14, 
      width: 28, 
      height: 28, 
      justifyContent: 'center', 
      alignItems: 'center', 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 2 }, 
      shadowOpacity: 0.2, 
      shadowRadius: 3, 
      elevation: 3 
    },
    removeImageText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    imageLabel: { 
      position: 'absolute', 
      bottom: 0, 
      left: 0, 
      right: 0, 
      backgroundColor: 'rgba(0, 122, 255, 0.9)', 
      borderBottomLeftRadius: 12, 
      borderBottomRightRadius: 12, 
      paddingVertical: 4, 
      paddingHorizontal: 8 
    },
    imageLabelText: { color: 'white', fontSize: 11, fontWeight: '600', textAlign: 'center' },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    addButton: { 
      width: 38, 
      height: 38, 
      borderRadius: 19, 
      backgroundColor: '#007AFF', 
      justifyContent: 'center', 
      alignItems: 'center', 
      marginRight: 8 
    },
    addButtonText: { color: 'white', fontSize: 20, fontWeight: '300' },
    textInput: { 
      flex: 1, 
      borderWidth: 1, 
      borderColor: '#E5E5E5', 
      borderRadius: 20, 
      paddingHorizontal: 15, 
      paddingVertical: 9, 
      marginRight: 8, 
      maxHeight: 100, 
      fontSize: 15, 
      backgroundColor: '#F8F9FA' 
    },
    sendButton: { 
      backgroundColor: '#007AFF', 
      borderRadius: 20, 
      paddingHorizontal: 22, 
      paddingVertical: 9, 
      justifyContent: 'center', 
      minHeight: 38 
    },
    sendButtonDisabled: { backgroundColor: '#C7C7CC' },
    sendButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
  } : {};

  const styles = { 
    ...baseStyles, 
    ...mobileStyles,
    safeArea: { ...baseStyles.safeArea, backgroundColor: '#FFFFFF' },
    mainContent: { ...baseStyles.mainContent, backgroundColor: '#FFFFFF' }
  };

  return (
    <OrientationLock isNoteScreen={false}>
      <SafeAreaView style={styles.safeArea}>
      {/* 모바일: UniversalHeader, 태블릿: 기존 헤더 */}
      <UniversalHeader 
        title="AI" 
        showBackButton={false}
        onHamburgerPress={toggleSidebar}
      />
      {/* 모바일 AI 스타일 버튼 */}
      {screenInfo.isPhone && currentUser?.subscription?.isActive && currentUser?.subscription?.planId === 'premium' && (
        <View style={styles.mobileStyleButtonContainer}>
          <TouchableOpacity 
            style={styles.mobileStyleButton}
            onPress={() => setShowStyleModal(true)}
          >
            <Text style={styles.mobileStyleButtonText}>
              {aiStyle === 'friendly' ? '친근한' : 
               aiStyle === 'professional' ? '전문적인' : 
               aiStyle === 'casual' ? '캠주얼한' :
               aiStyle === 'formal' ? '격식있는' :
               aiStyle === 'strict' ? '엄격한' :
               aiStyle === 'couple' ? '커플' : '친근한'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {screenInfo.width >= 768 && (
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
                {aiStyle === 'friendly' ? '친근한' : 
                 aiStyle === 'professional' ? '전문적인' : 
                 aiStyle === 'casual' ? '캠주얼한' :
                 aiStyle === 'formal' ? '격식있는' :
                 aiStyle === 'strict' ? '엄격한' :
                 aiStyle === 'couple' ? '커플' : '친근한'}
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
      )}
      <MiniTimer />

      <View style={styles.container}>
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

        {(!screenInfo.isPhone || !sidebarVisible) && (
          <KeyboardAvoidingView 
          style={[
            styles.mainContent, 
            !sidebarVisible && styles.mainContentExpanded
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 25}
          enabled={true}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.isUser ? styles.userMessage : styles.aiMessage
                ]}
              >
                <View style={[
                  styles.messageBubble,
                  message.isUser ? styles.userBubble : styles.aiBubble
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
                        styles.userText
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
                    message.isUser ? styles.userTime : styles.aiTime
                  ]}>
                    {message.timestamp}
                  </Text>
                </View>
              </View>
            ))}
            
            {isLoading && (
              <View style={[
                styles.messageContainer, 
                styles.aiMessage
              ]}>
                <View style={[
                  styles.messageBubble, 
                  styles.aiBubble, 
                  styles.loadingBubble
                ]}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.loadingText}>
                    AI가 답변을 생성하고 있어요...
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            {selectedImage && (
              <View style={styles.selectedImageContainer}>
                <Image 
                  source={{ uri: selectedImage }} 
                  style={styles.selectedImagePreview} 
                />
                <TouchableOpacity style={styles.removeImageButton} onPress={removeSelectedImage}>
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.imageLabel}>
                  <Text style={styles.imageLabelText}>📸 문제 이미지</Text>
                </View>
              </View>
            )}
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={showImagePicker}
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder={selectedImage ? "문제에 대해 질문해주세요..." : "메시지를 입력하세요..."}
                placeholderTextColor="#999"
                multiline
                maxLength={500}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton, 
                  (!inputText.trim() && !selectedImage) && styles.sendButtonDisabled
                ]}
                onPress={sendMessage}
                disabled={(!inputText.trim() && !selectedImage) || isLoading}
              >
                <Text style={styles.sendButtonText}>전송</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
        )}

        {screenInfo.isPhone && sidebarVisible && (
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
            </Animated.View>
            
            <TouchableOpacity 
              style={styles.mobileSidebarOverlay} 
              onPress={() => {
                Animated.timing(slideAnim, {
                  toValue: -300,
                  duration: 300,
                  useNativeDriver: true,
                }).start(() => {
                  setSidebarVisible(false);
                });
              }}
            />
          </View>
        )}
      </View>

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
                <Text style={styles.styleName}>친근한 스타일</Text>
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

              <TouchableOpacity 
                style={[styles.styleOptionButton, aiStyle === 'professional' && styles.selectedStyleButton]}
                onPress={() => {
                  saveAiStyle('professional');
                  setShowStyleModal(false);
                }}
              >
                <Text style={styles.styleName}>전문적인 스타일</Text>
                <Text style={styles.styleDescription}>체계적이고 정확한 멘토</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.styleOptionButton, aiStyle === 'casual' && styles.selectedStyleButton]}
                onPress={() => {
                  saveAiStyle('casual');
                  setShowStyleModal(false);
                }}
              >
                <Text style={styles.styleName}>캠주얼한 스타일</Text>
                <Text style={styles.styleDescription}>편하고 친근한 친구</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.styleOptionButton, aiStyle === 'formal' && styles.selectedStyleButton]}
                onPress={() => {
                  saveAiStyle('formal');
                  setShowStyleModal(false);
                }}
              >
                <Text style={styles.styleName}>격식있는 스타일</Text>
                <Text style={styles.styleDescription}>정중하고 품위있는 교육자</Text>
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
  mainContent: { flex: 1, backgroundColor: '#F8F9FA' },
  mainContentExpanded: { paddingLeft: 16 },
  messagesContainer: { flex: 1, paddingHorizontal: 16 },
  messagesContent: { paddingBottom: 20, paddingTop: 16 },
  messageContainer: { marginBottom: 16 },
  userMessage: { alignItems: 'flex-end' },
  aiMessage: { alignItems: 'flex-start', paddingLeft: 0 },
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
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  addButtonText: { color: 'white', fontSize: 22, fontWeight: '300' },
  textInput: { flex: 1, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, maxHeight: 100, fontSize: 16, backgroundColor: '#F8F9FA' },
  sendButton: { backgroundColor: '#007AFF', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10, justifyContent: 'center', minHeight: 40 },
  sendButtonDisabled: { backgroundColor: '#C7C7CC' },
  sendButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
  messageImageContainer: { marginBottom: 10, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#E5E5E5' },
  messageImage: { width: 200, height: 200 },
  
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