import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Switch,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OrientationGuard from './components/OrientationGuard';
import { getScreenInfo, responsive, createResponsiveStyles } from './utils/responsive';
import userDataService from './userDataService';
import { useResponsive } from './hooks/useResponsive';
import OrientationLock from './components/OrientationLock';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';

// 푸시 알림 핸들러 설정 (조용한 알림)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false, // 소리 없이
    shouldSetBadge: true,   // 배지 표시
  }),
});

export default function Planner() {
  const navigation = useNavigation();
  const responsiveUtil = useResponsive();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [tasks, setTasks] = useState([]);
  const [memo, setMemo] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskMemo, setNewTaskMemo] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeSubject, setActiveSubject] = useState('플래너');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(null);
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmTime, setAlarmTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTaskTimePicker, setShowTaskTimePicker] = useState(false);
  const [tempHour, setTempHour] = useState(new Date().getHours());
  const [tempMinute, setTempMinute] = useState(new Date().getMinutes());
  const [taskTempHour, setTaskTempHour] = useState(9);
  const [taskTempMinute, setTaskTempMinute] = useState(0);
  const [taskTempAmPm, setTaskTempAmPm] = useState('AM');
  const [screenInfo, setScreenInfo] = useState(getScreenInfo());
  const hourScrollRef = useRef(null);
  const minuteScrollRef = useRef(null);
  // 알람음 선택 기능 제거 (고정 알람음 사용)
  const [showDateDetails, setShowDateDetails] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);

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

  // 플래너는 푸시 알림만 사용 (알람음 없음)

  const handleSubjectPress = (subjectName) => {
    setActiveSubject(subjectName);
    
    // 모바일에서 사이드바 닫기
    if (screenInfo.isPhone) {
      setSidebarVisible(false);
    }
    
    switch (subjectName) {
      case '홈':
        navigation.navigate('Main');
        break;
      case '타이머':
        navigation.navigate('Timer');
        break;
      case '플래너':
        // 이미 플래너 화면이므로 아무것도 안 함
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
        navigation.navigate('ExamAnswers');
        break;
      default:
        break;
    }
  };

  // 화면 크기 변경 감지 및 알림 권한 요청
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setScreenInfo(getScreenInfo());
    });
    
    // 앱 시작 시 알림 권한 자동 요청
    const requestNotificationPermissions = async () => {
      try {
        await Notifications.requestPermissionsAsync();
      } catch (error) {
        console.log('알림 권한 요청 실패:', error);
      }
    };
    
    requestNotificationPermissions();
    loadCurrentUser(); // 초기 사용자 정보 로드
    
    return () => subscription?.remove();
  }, []);

  // 화면 포커스 시 사용자 정보 새로고침
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCurrentUser();
    });

    return unsubscribe;
  }, [navigation]);

  // 컴포넌트 언마운트 시 알림 리스너 정리
  useEffect(() => {
    return () => {
      tasks.forEach(task => {
        if (task.notificationSubscription) {
          task.notificationSubscription.remove();
        }
      });
    };
  }, []);

  useEffect(() => {
    loadCurrentUser();
    loadTasks();
  }, [selectedDate]);

  // 12시 자동 초기화 체크
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      if (selectedDate !== today) {
        setSelectedDate(today);
      }
    };

    // 초기 체크
    checkMidnight();

    // 1분마다 체크
    const interval = setInterval(checkMidnight, 60000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  // 메모 자동 저장 (debounce)
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (memo !== '') {
        try {
          await userDataService.savePlanner(selectedDate, tasks, memo);
        } catch (error) {
          console.error('메모 저장 실패:', error);
        }
      }
    }, 1000); // 1초 후 저장

    return () => clearTimeout(timeoutId);
  }, [memo, selectedDate, tasks]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const savedData = await userDataService.getPlanner(selectedDate);
      if (savedData) {
        setTasks(savedData.tasks || []);
        setMemo(savedData.memo || '');
      } else {
        setTasks([]);
        setMemo('');
      }
    } catch (error) {
      console.error('플래너 데이터 로드 실패:', error);
      // 네트워크 오류가 아닌 경우에만 알림 표시
      if (!error.message.includes('Failed to fetch')) {
        Alert.alert('오류', '플래너 데이터를 불러오는데 실패했습니다.');
      }
      setTasks([]);
      setMemo('');
    } finally {
      setLoading(false);
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



  const addTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('알림', '할일을 입력해주세요.');
      return;
    }

    const newTask = {
      title: newTaskTitle.trim(),
      time: newTaskTime.trim(),
      memo: newTaskMemo.trim(),
      completed: false,
      alarm: null,
    };

    // 시간이 설정된 경우 자동으로 알림 설정
    if (newTaskTime.trim()) {
      const [hours, minutes] = newTaskTime.split(':');
      const alarmDate = new Date(selectedDate);
      alarmDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // 현재 시간보다 이후인 경우에만 알림 설정
      if (alarmDate > new Date()) {
        newTask.alarm = {
          time: alarmDate.toISOString(),
          type: 'notification',
        };
      }
    }

    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    
    // 알림이 설정된 경우 스케줄링
    if (newTask.alarm) {
      await scheduleNotification(newTask);
    }
    
    setNewTaskTitle('');
    setNewTaskTime('');
    setNewTaskMemo('');

    // DB에 자동 저장
    try {
      console.log('플래너 저장 시도:', { selectedDate, tasksCount: updatedTasks.length, memo: memo.substring(0, 50) });
      await userDataService.savePlanner(selectedDate, updatedTasks, memo);
      console.log('플래너 저장 성공');
    } catch (error) {
      console.error('할일 저장 실패:', error);
      console.error('오류 상세:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // 사용자에게 더 구체적인 오류 메시지 표시
      let errorMessage = '할일 저장에 실패했습니다.';
      if (error.message.includes('Failed to fetch')) {
        errorMessage = '서버 연결에 실패했습니다. 네트워크 상태를 확인해주세요.';
      } else if (error.message.includes('로그인')) {
        errorMessage = '로그인이 필요합니다.';
      }
      
      Alert.alert('오류', errorMessage);
    }
  };

  const toggleTask = async (index) => {
    const updatedTasks = tasks.map((task, i) => 
      i === index ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);

    // DB에 자동 저장
    try {
      await userDataService.savePlanner(selectedDate, updatedTasks, memo);
    } catch (error) {
      console.error('할일 상태 저장 실패:', error);
      // 네트워크 오류가 아닌 경우에만 알림 표시
      if (!error.message.includes('Failed to fetch')) {
        Alert.alert('오류', '할일 상태 저장에 실패했습니다.');
      }
    }
  };

  const handleTaskPress = (task, index) => {
    if (task.memo && task.memo.trim()) {
      setSelectedTaskDetail({ ...task, index });
      setShowTaskDetail(true);
    }
  };

  const deleteTask = (index) => {
    Alert.alert(
      '삭제 확인',
      '이 할일을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            const updatedTasks = tasks.filter((_, i) => i !== index);
            setTasks(updatedTasks);

            // DB에 자동 저장
            try {
              await userDataService.savePlanner(selectedDate, updatedTasks, memo);
            } catch (error) {
              console.error('할일 삭제 저장 실패:', error);
              // 네트워크 오류가 아닌 경우에만 알림 표시
              if (!error.message.includes('Failed to fetch')) {
                Alert.alert('오류', '할일 삭제 저장에 실패했습니다.');
              }
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };


  const setAlarmForTask = (taskIndex) => {
    setSelectedTaskIndex(taskIndex);
    const task = tasks[taskIndex];
    
    // 기존 알람 설정이 있으면 불러오기
    if (task.alarm) {
      setAlarmEnabled(true);
      setAlarmTime(new Date(task.alarm.time));
    } else {
      setAlarmEnabled(false);
      setAlarmTime(new Date());
    }
    
    setShowAlarmModal(true);
  };

  const openTimePicker = () => {
    const currentTime = alarmTime;
    setTempHour(currentTime.getHours());
    setTempMinute(currentTime.getMinutes());
    setShowTimePicker(true);
  };

  const confirmTimeSelection = () => {
    const newTime = new Date();
    newTime.setHours(tempHour);
    newTime.setMinutes(tempMinute);
    newTime.setSeconds(0);
    setAlarmTime(newTime);
    setShowTimePicker(false);
  };

  const adjustHour = (direction) => {
    if (direction === 'up') {
      setTempHour((prev) => (prev + 1) % 24);
    } else {
      setTempHour((prev) => (prev - 1 + 24) % 24);
    }
  };

  const adjustMinute = (direction) => {
    if (direction === 'up') {
      setTempMinute((prev) => (prev + 1) % 60);
    } else {
      setTempMinute((prev) => (prev - 1 + 60) % 60);
    }
  };

  // 할일 시간 선택 관련 함수들
  const openTaskTimePicker = () => {
    if (newTaskTime) {
      const [hours, minutes] = newTaskTime.split(':');
      const hour24 = parseInt(hours) || 9;
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      
      setTaskTempHour(hour12);
      setTaskTempMinute(parseInt(minutes) || 0);
      setTaskTempAmPm(ampm);
    } else {
      setTaskTempHour(9);
      setTaskTempMinute(0);
      setTaskTempAmPm('AM');
    }
    setShowTaskTimePicker(true);
    
    // 스크롤 위치를 현재 시간으로 설정 (다음 프레임에서 실행)
    setTimeout(() => {
      try {
        if (hourScrollRef.current) {
          const hourIndex = taskTempHour === 12 ? 0 : taskTempHour - 1;
          hourScrollRef.current.scrollTo({ y: hourIndex * 40, animated: false });
        }
        if (minuteScrollRef.current) {
          minuteScrollRef.current.scrollTo({ y: taskTempMinute * 40, animated: false });
        }
      } catch (error) {
        console.log('스크롤 설정 오류:', error);
      }
    }, 100);
  };

  const confirmTaskTimeSelection = () => {
    let hour24 = taskTempHour;
    if (taskTempAmPm === 'PM' && taskTempHour !== 12) {
      hour24 = taskTempHour + 12;
    } else if (taskTempAmPm === 'AM' && taskTempHour === 12) {
      hour24 = 0;
    }
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${taskTempMinute.toString().padStart(2, '0')}`;
    setNewTaskTime(timeString);
    setShowTaskTimePicker(false);
  };

  const adjustTaskHour = (direction) => {
    if (direction === 'up') {
      setTaskTempHour((prev) => prev === 12 ? 1 : prev + 1);
    } else {
      setTaskTempHour((prev) => prev === 1 ? 12 : prev - 1);
    }
  };

  const adjustTaskMinute = (direction) => {
    if (direction === 'up') {
      setTaskTempMinute((prev) => (prev + 1) % 60);
    } else {
      setTaskTempMinute((prev) => (prev - 1 + 60) % 60);
    }
  };

  const clearTaskTime = () => {
    setNewTaskTime('');
    setShowTaskTimePicker(false);
  };

  const saveAlarm = async () => {
    if (selectedTaskIndex !== null) {
      const updatedTasks = [...tasks];
      
      if (alarmEnabled) {
        updatedTasks[selectedTaskIndex].alarm = {
          time: alarmTime,
          type: 'notification', // 푸시 알림 타입
        };
        // 푸시 알림 스케줄링
        await scheduleNotification(updatedTasks[selectedTaskIndex]);
      } else {
        // 알림 비활성화 시 제거
        updatedTasks[selectedTaskIndex].alarm = null;
      }
      
      setTasks(updatedTasks);

      // DB에 자동 저장
      try {
        await userDataService.savePlanner(selectedDate, updatedTasks, memo);
      } catch (error) {
        console.error('알람 저장 실패:', error);
        // 네트워크 오류가 아닌 경우에만 알림 표시
        if (!error.message.includes('Failed to fetch')) {
          Alert.alert('오류', '알람 설정 저장에 실패했습니다.');
        }
      }
    }
    setShowAlarmModal(false);
    setSelectedTaskIndex(null);
  };

  // 커스텀 알람음 재생 함수
  const playPlannerAlarmSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/sounds/song.wav'),
        { shouldPlay: true, volume: 0.8 }
      );
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('플래너 알람음 재생 실패:', error);
    }
  };

  const scheduleNotification = async (task) => {
    try {
      // 알림 권한 자동 요청 (사용자에게 묻지 않음)
      await Notifications.requestPermissionsAsync();

      const trigger = new Date(task.alarm.time);
      
      // 푸시 알림 스케줄링
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '공부할 시간입니다!',
          body: `할일: ${task.title}`,
          sound: false, // 푸시 알림은 조용하게
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
          data: { taskTitle: task.title }, // 알림 데이터에 할일 제목 포함
        },
        trigger,
      });

      // 알림이 수신되었을 때 커스텀 알람음 재생을 위한 리스너 설정
      const subscription = Notifications.addNotificationReceivedListener(notification => {
        if (notification.request.content.data?.taskTitle === task.title) {
          playPlannerAlarmSound();
          Alert.alert(
            '공부할 시간입니다!',
            `할일: ${task.title}`,
            [{ text: '확인', style: 'default' }]
          );
        }
      });

      // 컴포넌트 언마운트 시 리스너 제거를 위해 저장
      task.notificationSubscription = subscription;
      
    } catch (error) {
      console.error('알림 스케줄링 실패:', error);
    }
  };

  const onDateSelect = (day) => {
    setSelectedDate(day.dateString);
    setShowDateDetails(true);
  };

  const getMarkedDates = () => {
    // 할일이 있는 날짜들을 표시
    const marked = {};
    // 여기서 모든 플래너 데이터를 확인하여 할일이 있는 날짜들을 마킹할 수 있습니다
    marked[selectedDate] = { selected: true, selectedColor: '#5C7CFA' };
    return marked;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5C7CFA" />
          <Text style={styles.loadingText}>플래너를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 반응형 스타일 생성
  const responsiveStyles = createResponsiveStyles(
    {}, // 기본 스타일
    { // 핸드폰 스타일
      safeArea: {
        backgroundColor: '#F8F9FA',
      },
      container: {
        padding: 12,
      },
      header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
      },
      headerTitle: {
        fontSize: 18,
      },
      taskCard: {
        marginBottom: 12,
        padding: 12,
      },
      taskTitle: {
        fontSize: 14,
      },
      taskTime: {
        fontSize: 12,
      },
    }
  );

  // 반응형 스타일 적용
  const styles = useMemo(
    () => responsiveUtil.applyAll(baseStyles), 
    [responsiveUtil]
  );

  return (
    <OrientationLock isNoteScreen={false}>
      <SafeAreaView style={[styles.safeArea, responsiveStyles.safeArea]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.hamburgerButton} 
            onPress={() => setSidebarVisible(!sidebarVisible)}
          >
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </TouchableOpacity>
          <Text style={styles.title}>StudyTime</Text>
          <Text style={styles.homeText}>플래너</Text>
        </View>
        <View style={styles.headerRight}>
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

      <View style={styles.container}>
        {/* 데스크톱 사이드바 */}
        {!screenInfo.isPhone && sidebarVisible && (
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
                  value={searchText}
                  onChangeText={setSearchText}
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
            
            <TouchableOpacity 
              style={styles.mobileSidebarOverlay} 
              onPress={() => setSidebarVisible(false)}
            />
          </View>
        )}

        {/* 모바일에서 사이드바가 열려있으면 메인 콘텐츠 숨김 */}
        {!(screenInfo.isPhone && sidebarVisible) && (
          <ScrollView style={[styles.mainContent, !sidebarVisible && styles.mainContentExpanded]}>
        {/* 월간 달력 */}
        <View style={styles.monthlyCalendarContainerFull}>
          <Calendar
            current={selectedDate}
            onDayPress={onDateSelect}
            markedDates={getMarkedDates()}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#b6c1cd',
              selectedDayBackgroundColor: '#5C7CFA',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#5C7CFA',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              dotColor: '#00adf5',
              selectedDotColor: '#ffffff',
              arrowColor: '#5C7CFA',
              disabledArrowColor: '#d9e1e8',
              monthTextColor: '#2d4150',
              indicatorColor: '#5C7CFA',
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '300',
              textDayFontSize: 18,
              textMonthFontSize: 20,
              textDayHeaderFontSize: 16
            }}
            style={styles.fullCalendar}
          />
        </View>

        {/* 날짜 클릭 시 할일 관리 */}
        {showDateDetails && (
          <>
            {/* 선택된 날짜 표시 */}
            <View style={styles.selectedDateContainer}>
              <View style={styles.selectedDateHeader}>
                <Text style={styles.selectedDateText}>{formatDate(selectedDate)}</Text>
                <TouchableOpacity 
                  onPress={() => setShowDateDetails(false)}
                  style={styles.closeDateDetails}
                >
                  <Text style={styles.closeDateDetailsText}>×</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 할일 추가 */}
            <View style={styles.addTaskContainer}>
              <Text style={styles.sectionTitle}>할일 추가</Text>
              <View style={styles.inputColumn}>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.taskInput]}
                    placeholder="할일을 입력하세요"
                    value={newTaskTitle}
                    onChangeText={setNewTaskTitle}
                  />
                  <TouchableOpacity
                    style={[styles.input, styles.timeButton]}
                    onPress={openTaskTimePicker}
                  >
                    <Text style={[styles.timeButtonText, !newTaskTime && styles.timeButtonPlaceholder]}>
                      {newTaskTime ? (() => {
                        const [hours, minutes] = newTaskTime.split(':');
                        const hour24 = parseInt(hours);
                        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                        const ampm = hour24 >= 12 ? 'PM' : 'AM';
                        return `${hour12}:${minutes} ${ampm}`;
                      })() : '시간 선택'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, styles.memoInputInline]}
                  placeholder="세부 메모사항 (선택)"
                  value={newTaskMemo}
                  onChangeText={setNewTaskMemo}
                  multiline
                  numberOfLines={2}
                />
                <TouchableOpacity onPress={addTask} style={styles.addButtonFull}>
                  <Text style={styles.addButtonText}>할일 추가</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 할일 목록 */}
            <View style={styles.tasksContainer}>
              <Text style={styles.sectionTitle}>할일 목록 ({tasks.length}개)</Text>
              {tasks.length === 0 ? (
                <Text style={styles.emptyText}>등록된 할일이 없습니다.</Text>
              ) : (
                tasks.map((task, index) => (
                  <View key={index} style={styles.taskItem}>
                    <TouchableOpacity 
                      onPress={() => toggleTask(index)}
                      style={styles.checkboxContainer}
                    >
                      <Text style={styles.checkbox}>
                        {task.completed ? '☑' : '☐'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleTaskPress(task, index)}
                      style={styles.taskTextContainer}
                    >
                      <Text style={[
                        styles.taskTitle,
                        task.completed && styles.completedTask
                      ]}>
                        {task.title}
                      </Text>
                      {task.memo && task.memo.trim() && (
                        <Text style={styles.memoIndicator}>메모 보기</Text>
                      )}
                    </TouchableOpacity>
                    <View style={styles.taskActions}>
                      <TouchableOpacity 
                        onPress={() => deleteTask(index)}
                        style={styles.deleteButton}
                      >
                        <Text style={styles.deleteButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* 메모 */}
            <View style={styles.memoContainer}>
              <Text style={styles.sectionTitle}>메모</Text>
              <TextInput
                style={styles.memoInput}
                placeholder="오늘의 메모를 작성하세요..."
                value={memo}
                onChangeText={setMemo}
                multiline
                numberOfLines={4}
              />
            </View>
          </>
        )}

        </ScrollView>
        )}
      </View>


      {/* 알람 설정 모달 */}
      <Modal
        visible={showAlarmModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAlarmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>알람 설정</Text>
              <TouchableOpacity onPress={() => setShowAlarmModal(false)}>
                <Text style={styles.modalCloseButton}>×</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.alarmSettingContainer}>
              {/* 알람 활성화/비활성화 토글 */}
              <View style={styles.alarmToggleContainer}>
                <Text style={styles.alarmLabel}>알람 설정</Text>
                <TouchableOpacity 
                  style={[styles.toggleButton, alarmEnabled && styles.toggleButtonActive]}
                  onPress={() => setAlarmEnabled(!alarmEnabled)}
                >
                  <View style={[styles.toggleCircle, alarmEnabled && styles.toggleCircleActive]} />
                </TouchableOpacity>
              </View>

              {/* 알람이 활성화된 경우에만 시간 및 소리 설정 표시 */}
              {alarmEnabled && (
                <>
                  <Text style={styles.alarmLabel}>알람 시간</Text>
                  <TouchableOpacity 
                    style={styles.timePickerButton}
                    onPress={openTimePicker}
                  >
                    <Text style={styles.timePickerText}>
                      {alarmTime.toLocaleTimeString('ko-KR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.alarmLabel}>📱 푸시 알림으로 전송됩니다</Text>
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowAlarmModal(false)}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveAlarmButton}
                  onPress={saveAlarm}
                >
                  <Text style={styles.saveAlarmButtonText}>저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 할일 시간 선택 모달 */}
      <Modal
        visible={showTaskTimePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTaskTimePicker(false)}
      >
        <View style={styles.timePickerModalOverlay}>
          <View style={styles.timePickerModalContent}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>시간 선택</Text>
            </View>
            
            <View style={styles.timePickerContainer}>
              {/* 시간 스크롤 선택 */}
              <View style={styles.scrollColumn}>
                <Text style={styles.scrollLabel}>시</Text>
                <View style={styles.scrollPickerContainer}>
                  <View style={styles.centerIndicator} />
                  <ScrollView 
                    ref={hourScrollRef}
                    style={styles.scrollPicker}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={40}
                    snapToAlignment="center"
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const index = Math.round(event.nativeEvent.contentOffset.y / 40);
                      const hour = index === 0 ? 12 : index;
                      setTaskTempHour(hour);
                    }}
                    onScrollEndDrag={(event) => {
                      const index = Math.round(event.nativeEvent.contentOffset.y / 40);
                      const hour = index === 0 ? 12 : index;
                      setTaskTempHour(hour);
                    }}
                  >
                    <View style={styles.scrollPadding} />
                    {Array.from({length: 12}, (_, i) => i === 0 ? 12 : i).map((hour) => (
                      <View key={hour} style={styles.scrollItem}>
                        <Text style={[
                          styles.scrollText,
                          hour === taskTempHour && styles.scrollTextActive
                        ]}>
                          {hour.toString().padStart(2, '0')}
                        </Text>
                      </View>
                    ))}
                    <View style={styles.scrollPadding} />
                  </ScrollView>
                </View>
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              {/* 분 스크롤 선택 */}
              <View style={styles.scrollColumn}>
                <Text style={styles.scrollLabel}>분</Text>
                <View style={styles.scrollPickerContainer}>
                  <View style={styles.centerIndicator} />
                  <ScrollView 
                    ref={minuteScrollRef}
                    style={styles.scrollPicker}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={40}
                    snapToAlignment="center"
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const index = Math.round(event.nativeEvent.contentOffset.y / 40);
                      setTaskTempMinute(index);
                    }}
                    onScrollEndDrag={(event) => {
                      const index = Math.round(event.nativeEvent.contentOffset.y / 40);
                      setTaskTempMinute(index);
                    }}
                  >
                    <View style={styles.scrollPadding} />
                    {Array.from({length: 60}, (_, i) => i).map((minute) => (
                      <View key={minute} style={styles.scrollItem}>
                        <Text style={[
                          styles.scrollText,
                          minute === taskTempMinute && styles.scrollTextActive
                        ]}>
                          {minute.toString().padStart(2, '0')}
                        </Text>
                      </View>
                    ))}
                    <View style={styles.scrollPadding} />
                  </ScrollView>
                </View>
              </View>

              {/* AM/PM 선택 */}
              <View style={styles.ampmColumn}>
                <TouchableOpacity 
                  style={[styles.ampmButton, taskTempAmPm === 'AM' && styles.ampmButtonActive]}
                  onPress={() => setTaskTempAmPm('AM')}
                >
                  <Text style={[styles.ampmText, taskTempAmPm === 'AM' && styles.ampmTextActive]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.ampmButton, taskTempAmPm === 'PM' && styles.ampmButtonActive]}
                  onPress={() => setTaskTempAmPm('PM')}
                >
                  <Text style={[styles.ampmText, taskTempAmPm === 'PM' && styles.ampmTextActive]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.timePickerButtons}>
              <TouchableOpacity 
                style={styles.timePickerClearButton}
                onPress={clearTaskTime}
              >
                <Text style={styles.timePickerClearText}>제거</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.timePickerCancelButton}
                onPress={() => setShowTaskTimePicker(false)}
              >
                <Text style={styles.timePickerCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.timePickerConfirmButton}
                onPress={confirmTaskTimeSelection}
              >
                <Text style={styles.timePickerConfirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 알람용 커스텀 시간 선택 모달 */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.timePickerModalOverlay}>
          <View style={styles.timePickerModalContent}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>시간 선택</Text>
            </View>
            
            <View style={styles.timePickerContainer}>
              {/* 시간 선택 */}
              <View style={styles.timeColumn}>
                <TouchableOpacity 
                  style={styles.timeAdjustButton}
                  onPress={() => adjustHour('up')}
                >
                  <Text style={styles.timeAdjustButtonText}>▲</Text>
                </TouchableOpacity>
                <View style={styles.timeDisplay}>
                  <Text style={styles.timeDisplayText}>
                    {tempHour.toString().padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.timeAdjustButton}
                  onPress={() => adjustHour('down')}
                >
                  <Text style={styles.timeAdjustButtonText}>▼</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              {/* 분 선택 */}
              <View style={styles.timeColumn}>
                <TouchableOpacity 
                  style={styles.timeAdjustButton}
                  onPress={() => adjustMinute('up')}
                >
                  <Text style={styles.timeAdjustButtonText}>▲</Text>
                </TouchableOpacity>
                <View style={styles.timeDisplay}>
                  <Text style={styles.timeDisplayText}>
                    {tempMinute.toString().padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.timeAdjustButton}
                  onPress={() => adjustMinute('down')}
                >
                  <Text style={styles.timeAdjustButtonText}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.timePickerButtons}>
              <TouchableOpacity 
                style={styles.timePickerCancelButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.timePickerCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.timePickerConfirmButton}
                onPress={confirmTimeSelection}
              >
                <Text style={styles.timePickerConfirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 할일 상세 모달 */}
      <Modal
        visible={showTaskDetail}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTaskDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.taskDetailModalContent}>
            <View style={styles.taskDetailHeader}>
              <Text style={styles.taskDetailTitle}>할일 상세</Text>
              <TouchableOpacity onPress={() => setShowTaskDetail(false)}>
                <Text style={styles.modalCloseButton}>×</Text>
              </TouchableOpacity>
            </View>
            
            {selectedTaskDetail && (
              <View style={styles.taskDetailBody}>
                <Text style={styles.taskDetailTaskTitle}>
                  {selectedTaskDetail.title}
                </Text>
                
                {selectedTaskDetail.time && (
                  <View style={styles.taskDetailTimeContainer}>
                    <Text style={styles.taskDetailTimeLabel}>알림 시간:</Text>
                    <Text style={styles.taskDetailTime}>
                      {(() => {
                        const [hours, minutes] = selectedTaskDetail.time.split(':');
                        const hour24 = parseInt(hours);
                        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                        const ampm = hour24 >= 12 ? 'PM' : 'AM';
                        return `${hour12}:${minutes} ${ampm}`;
                      })()}
                    </Text>
                  </View>
                )}
                
                {selectedTaskDetail.memo && (
                  <View style={styles.taskDetailMemoContainer}>
                    <Text style={styles.taskDetailMemoLabel}>메모:</Text>
                    <Text style={styles.taskDetailMemo}>
                      {selectedTaskDetail.memo}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      </SafeAreaView>
    </OrientationLock>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hamburgerButton: { width: 24, height: 24, justifyContent: 'space-between', paddingVertical: 2 },
  hamburgerLine: { width: '100%', height: 3, backgroundColor: '#333', borderRadius: 2 },
  homeText: { fontSize: 16, fontWeight: '500', color: '#000' },
  backButton: {
    fontSize: 16,
    color: '#5C7CFA',
  },
  title: { fontSize: 26, fontWeight: '700', color: '#000' },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  profileImage: { width: 44, height: 44, borderRadius: 22 },
  defaultProfileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center' },
  profileText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 250,
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#E5E5E5',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
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
    paddingHorizontal: 16,
    paddingVertical: 20,
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
    marginRight: 8,
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
  mainContent: {
    flex: 1,
    padding: 20,
  },
  mainContentExpanded: {
    flex: 1,
  },
  addTaskContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 16,
  },
  timeButtonPlaceholder: {
    color: '#999',
  },
  addButton: {
    backgroundColor: '#5C7CFA',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tasksContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  taskContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  checkboxContainer: {
    paddingRight: 4,
  },
  checkbox: {
    fontSize: 18,
    color: '#4CAF50',
    width: 20,
    textAlign: 'center',
  },
  taskTextContainer: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    lineHeight: 20,
  },
  memoIndicator: {
    fontSize: 12,
    color: '#7B68EE',
    fontStyle: 'italic',
    marginTop: 4,
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  taskTime: {
    fontSize: 14,
    color: '#7B68EE',
    fontWeight: '500',
    backgroundColor: '#F0F0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FFF5F5',
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#FF4757',
    fontWeight: '600',
  },
  memoContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  memoInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  // 새로운 스타일들
  monthlyCalendarContainerFull: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flex: 1,
    minHeight: 400,
  },
  fullCalendar: {
    width: '100%',
    height: '100%',
  },
  inputColumn: {
    gap: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    backgroundColor: '#FAFBFC',
    color: '#2C3E50',
  },
  taskInput: {
    flex: 1,
  },
  timeButton: {
    width: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  timeButtonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  timeButtonPlaceholder: {
    color: '#ADB5BD',
  },
  memoInputInline: {
    minHeight: 60,
    textAlignVertical: 'top',
    textAlign: 'center',
  },
  addButtonFull: {
    backgroundColor: '#5C7CFA',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#5C7CFA',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  taskMemo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  taskAlarm: {
    fontSize: 12,
    color: '#5C7CFA',
    marginTop: 2,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alarmButton: {
    padding: 8,
  },
  alarmButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  // 모달 스타일들
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#666',
  },
  alarmSettingContainer: {
    gap: 16,
  },
  alarmLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  alarmToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleButton: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleButtonActive: {
    backgroundColor: '#5C7CFA',
  },
  toggleCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  timePickerButton: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  timePickerText: {
    fontSize: 16,
    color: '#333',
  },
  soundPickerButton: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  soundPickerText: {
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  saveAlarmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#5C7CFA',
    alignItems: 'center',
  },
  saveAlarmButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  // 월간 뷰 관련 스타일들
  selectedDateContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5C7CFA',
  },
  closeDateDetails: {
    padding: 4,
  },
  closeDateDetailsText: {
    fontSize: 20,
    color: '#666',
  },
  
  // 커스텀 시간 선택기 스타일들
  timePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 350,
  },
  timePickerHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    height: 120,
  },
  scrollColumn: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  scrollLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  scrollPickerContainer: {
    position: 'relative',
    height: 120,
    width: 60,
  },
  centerIndicator: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(51, 51, 51, 0.1)',
    borderRadius: 8,
    zIndex: 1,
    pointerEvents: 'none',
  },
  scrollPicker: {
    height: 120,
    width: 60,
  },
  scrollContent: {
    paddingVertical: 0,
  },
  scrollPadding: {
    height: 40,
  },
  scrollItem: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollText: {
    fontSize: 16,
    color: '#CCC',
    fontWeight: '400',
  },
  scrollTextActive: {
    fontSize: 20,
    color: '#333',
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 28,
    fontWeight: '300',
    color: '#ADB5BD',
    marginHorizontal: 12,
  },
  ampmColumn: {
    alignItems: 'center',
    marginLeft: 8,
  },
  ampmButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
    backgroundColor: '#F5F5F5',
    minWidth: 40,
    alignItems: 'center',
  },
  ampmButtonActive: {
    backgroundColor: '#333',
  },
  ampmText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  ampmTextActive: {
    color: 'white',
  },
  timePickerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  timePickerClearButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  timePickerClearText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  timePickerCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  timePickerCancelText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  timePickerConfirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  timePickerConfirmText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  
  // 할일 상세 모달 스타일
  taskDetailModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  taskDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  taskDetailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
  taskDetailBody: {
    gap: 16,
  },
  taskDetailTaskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    lineHeight: 24,
  },
  taskDetailTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskDetailTimeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  taskDetailTime: {
    fontSize: 14,
    color: '#7B68EE',
    fontWeight: '600',
    backgroundColor: '#F0F0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  taskDetailMemoContainer: {
    gap: 8,
  },
  taskDetailMemoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  taskDetailMemo: {
    fontSize: 15,
    color: '#555555',
    lineHeight: 22,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#7B68EE',
  },
});
