import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  SafeAreaView,
  Alert,
  Modal,
  Switch,
  Dimensions,
  ActivityIndicator,
  Image,
  Platform,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScreenInfo } from './utils/responsive';
import userDataService from './userDataService';
import OrientationLock from './components/OrientationLock';
import { useGlobalResponsiveStyles, getPlannerResponsiveStyles } from './styles/globalResponsiveStyles';
import mobileStyles from './styles/mobileStyles';
import UniversalHeader from './components/UniversalHeader';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import * as React from 'react';
const { useState, useEffect, useRef, useMemo } = React;
// 푸시 알림 핸들러 설정 (조용한 알림)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

// Main.js와 동일한 메뉴 함수
const getSubjects = (isAdmin = false) => {
  const baseSubjects = [
    '홈',
    '타이머',
    '플래너',
    'AI',
    '스터디그룹 찾기',
    '커뮤니티',
    '스토어',
    '모의고사',
  ];  
  if (isAdmin) {
    baseSubjects.push('👥 사용자 관리');
    baseSubjects.push('📝 게시글 관리');
  }
  
  return baseSubjects;
};

export default function Planner() {
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [tasks, setTasks] = useState([]);
  const [memo, setMemo] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskMemo, setNewTaskMemo] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeSubject, setActiveSubject] = useState('플래너');
  const [sidebarVisible, setSidebarVisible] = useState(!getScreenInfo().isPhone);
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
  const [showDateDetails, setShowDateDetails] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);
  const [slideAnim] = useState(new Animated.Value(-300));
  const [isAdmin, setIsAdmin] = useState(false);
  const [taskAnimations, setTaskAnimations] = useState([]);
  const [successAnim] = useState(new Animated.Value(0));
  const [completionAnim] = useState(new Animated.Value(0));

  // Main.js와 동일한 메뉴 핸들러
  const handleSubjectPress = (subjectName) => {
    console.log('클릭된 메뉴:', subjectName);
    setActiveSubject(subjectName);
    
    // 모바일에서 사이드바 닫기
    if (screenInfo.isPhone) {
      setSidebarVisible(false);
      slideAnim.setValue(-300);
    }
    
    const screenMap = {
      '홈': 'Main',
      '타이머': 'Timer',
      '플래너': null, // 현재 화면
      'AI': 'AI',
      '스터디그룹 찾기': 'StudyGroup',
      '커뮤니티': 'Community',
      '스토어': 'Store',
      '모의고사': 'MockExamScreen'
    };  
    
    // 관리자 메뉴의 경우 탭 정보를 전달
    if (subjectName === '👥 사용자 관리') {
      navigation.navigate('AdminPanel', { initialTab: 'users' });
    } else if (subjectName === '📝 게시글 관리') {
      navigation.navigate('AdminPanel', { initialTab: 'posts' });
    } else if (subjectName === '📊 관리자 통계') {
      navigation.navigate('AdminPanel', { initialTab: 'stats' });
    } else if (screenMap[subjectName]) {
      navigation.navigate(screenMap[subjectName]);
    }
  };

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      const newScreenInfo = getScreenInfo();
      setScreenInfo(newScreenInfo);
      setSidebarVisible(!newScreenInfo.isPhone);
    });
    
    const requestNotificationPermissions = async () => {
      try {
        await Notifications.requestPermissionsAsync();
      } catch (error) {
        console.log('알림 권한 요청 실패:', error);
      }
    };
    
    requestNotificationPermissions();
    loadCurrentUser();
    
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCurrentUser();
    });

    return unsubscribe;
  }, [navigation]);

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

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (memo !== '') {
        try {
          await userDataService.savePlanner(selectedDate, tasks, memo);
        } catch (error) {
          console.error('메모 저장 실패:', error);
        }
      }
    }, 1000);

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
        
        // 사용자 데이터도 함께 가져오기
        const userData = await userDataService.getUserData();
        
        // 관리자 권한 확인
        const adminStatus = userData.user.email === 'drda00001@gmail.com' || userData.user.role === 'admin';
        setIsAdmin(adminStatus);
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

    if (newTaskTime.trim()) {
      const [hours, minutes] = newTaskTime.split(':');
      const alarmDate = new Date(selectedDate);
      alarmDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      if (alarmDate > new Date()) {
        newTask.alarm = {
          time: alarmDate.toISOString(),
          type: 'notification',
        };
      }
    }

    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    
    // 성공 애니메이션
    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 300,
        delay: 800,
        useNativeDriver: true,
      }),
    ]).start();
    
    if (newTask.alarm) {
      await scheduleNotification(newTask);
    }
    
    setNewTaskTitle('');
    setNewTaskTime('');
    setNewTaskMemo('');

    try {
      await userDataService.savePlanner(selectedDate, updatedTasks, memo);
    } catch (error) {
      console.error('할일 저장 실패:', error);
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
    const task = tasks[index];
    const isCompleting = !task.completed;
    
    const updatedTasks = tasks.map((task, i) => 
      i === index ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);

    // 완료 시 축하 애니메이션
    if (isCompleting) {
      Animated.sequence([
        Animated.spring(completionAnim, {
          toValue: 1,
          tension: 50,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.timing(completionAnim, {
          toValue: 0,
          duration: 300,
          delay: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }

    try {
      await userDataService.savePlanner(selectedDate, updatedTasks, memo);
    } catch (error) {
      console.error('할일 상태 저장 실패:', error);
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

            try {
              await userDataService.savePlanner(selectedDate, updatedTasks, memo);
            } catch (error) {
              console.error('할일 삭제 저장 실패:', error);
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
          type: 'notification',
        };
        await scheduleNotification(updatedTasks[selectedTaskIndex]);
      } else {
        updatedTasks[selectedTaskIndex].alarm = null;
      }
      
      setTasks(updatedTasks);

      try {
        await userDataService.savePlanner(selectedDate, updatedTasks, memo);
      } catch (error) {
        console.error('알람 저장 실패:', error);
        if (!error.message.includes('Failed to fetch')) {
          Alert.alert('오류', '알람 설정 저장에 실패했습니다.');
        }
      }
    }
    setShowAlarmModal(false);
    setSelectedTaskIndex(null);
  };

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
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('알림 권한 필요', '알림을 받으려면 권한을 허용해주세요.');
        return;
      }

      const triggerDate = new Date(task.alarm.time);
      const now = new Date();
      
      // 과거 시간이면 알림 설정 안함
      if (triggerDate <= now) {
        Alert.alert('알림 설정 실패', '과거 시간에는 알림을 설정할 수 없습니다.');
        return;
      }
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📚 공부할 시간입니다!',
          body: `할일: ${task.title}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
          data: { taskTitle: task.title },
        },
        trigger: triggerDate,
      });

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
    const marked = {};
    marked[selectedDate] = { selected: true, selectedColor: '#5C7CFA' };
    return marked;
  };

const toggleSidebar = () => {
  if (screenInfo.isPhone) {
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

const globalStyles = useGlobalResponsiveStyles();
const plannerStyles = getPlannerResponsiveStyles();
const mobilePlannerStyles = screenInfo.isPhone ? {
  ...mobileStyles.commonStyles,
  ...mobileStyles.headerStyles,
  ...mobileStyles.sidebarStyles,
} : {};
const styles = { ...baseStyles, ...globalStyles, ...plannerStyles, ...mobilePlannerStyles };

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

return (
    <OrientationLock isNoteScreen={false}>
      <SafeAreaView style={styles.safeArea}>
        {/* 모바일: UniversalHeader, 태블릿: 기존 헤더 */}
        <UniversalHeader 
          title="플래너" 
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
            <Text style={styles.homeText}>플래너</Text>
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
          {/* 데스크톱 사이드바 - Main.js와 동일 */}
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

          {/* 모바일 슬라이드 사이드바 - Main.js와 동일 */}
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
                    value={searchText}
                    onChangeText={setSearchText}
                  />
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

          {!(screenInfo.isPhone && sidebarVisible) && (
            <ScrollView style={[styles.mainContent, !sidebarVisible && styles.mainContentExpanded]}>
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

              {showDateDetails && (
                <>
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

                  {/* 성공 메시지 배너 */}
                  <Animated.View 
                    style={[
                      styles.successBanner,
                      {
                        opacity: successAnim,
                        transform: [{
                          translateY: successAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-20, 0],
                          }),
                        }],
                      },
                    ]}
                    pointerEvents="none"
                  >
                    <Text style={styles.successBannerText}>✓ 할일이 추가되었습니다!</Text>
                  </Animated.View>

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
                        <Text style={styles.addButtonText}>✓ 할일 추가</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 완료 축하 메시지 */}
                  <Animated.View 
                    style={[
                      styles.completionBanner,
                      {
                        opacity: completionAnim,
                        transform: [{
                          scale: completionAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        }],
                      },
                    ]}
                    pointerEvents="none"
                  >
                    <Text style={styles.completionBannerText}>🎉 잘했어요!</Text>
                  </Animated.View>

                  <View style={styles.tasksContainer}>
                    <View style={styles.taskHeaderRow}>
                      <Text style={styles.sectionTitle}>할일 목록 ({tasks.length}개)</Text>
                      {tasks.length > 0 && (
                        <View style={styles.progressContainer}>
                          <Text style={styles.progressText}>
                            {tasks.filter(t => t.completed).length}/{tasks.length}
                          </Text>
                          <View style={styles.progressBar}>
                            <View 
                              style={[
                                styles.progressFill,
                                { width: `${(tasks.filter(t => t.completed).length / tasks.length) * 100}%` }
                              ]} 
                            />
                          </View>
                        </View>
                      )}
                    </View>
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
                <View style={styles.alarmToggleContainer}>
                  <Text style={styles.alarmLabel}>알람 설정</Text>
                  <TouchableOpacity 
                    style={[styles.toggleButton, alarmEnabled && styles.toggleButtonActive]}
                    onPress={() => setAlarmEnabled(!alarmEnabled)}
                  >
                    <View style={[styles.toggleCircle, alarmEnabled && styles.toggleCircleActive]} />
                  </TouchableOpacity>
                </View>

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

// Main.js와 동일한 스타일
const baseStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
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
  monthlyCalendarContainerFull: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    minHeight: 350,
  },
  fullCalendar: {
    width: '100%',
  },
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
  successBanner: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    backgroundColor: '#34C759',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  successBannerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  completionBanner: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    backgroundColor: '#FF9500',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  completionBannerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  taskHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D1D1F',
    letterSpacing: -0.2,
  },
  progressBar: {
    width: 60,
    height: 6,
    backgroundColor: '#E8E8ED',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 3,
  },
  addTaskContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F5F5F7',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 20,
    letterSpacing: -0.3,
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
    borderColor: '#E8E8ED',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 15,
    backgroundColor: '#FAFAFA',
    color: '#1D1D1F',
    fontWeight: '400',
  },
  taskInput: {
    flex: 1,
  },
  timeButton: {
    width: 130,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E8E8ED',
  },
  timeButtonText: {
    fontSize: 14,
    color: '#1D1D1F',
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  timeButtonPlaceholder: {
    color: '#86868B',
  },
  memoInputInline: {
    minHeight: 70,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  addButtonFull: {
    backgroundColor: '#1D1D1F',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  tasksContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F5F5F7',
  },
  emptyText: {
    textAlign: 'center',
    color: '#86868B',
    fontSize: 15,
    fontWeight: '400',
    paddingVertical: 20,
    letterSpacing: -0.2,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  checkboxContainer: {
    paddingRight: 12,
  },
  checkbox: {
    fontSize: 22,
    color: '#1D1D1F',
    width: 24,
    textAlign: 'center',
  },
  taskTextContainer: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1D1D1F',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  memoIndicator: {
    fontSize: 12,
    color: '#5C7CFA',
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0,
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: '#86868B',
    opacity: 0.6,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#86868B',
    fontWeight: '400',
  },
  memoContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F5F5F7',
  },
  memoInput: {
    borderWidth: 1,
    borderColor: '#E8E8ED',
    borderRadius: 14,
    padding: 18,
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 120,
    backgroundColor: '#FAFAFA',
    color: '#1D1D1F',
    lineHeight: 22,
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 24,
    color: '#666',
    fontWeight: '300',
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
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveAlarmButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#5C7CFA',
    alignItems: 'center',
    shadowColor: '#5C7CFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveAlarmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  timePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerModalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  timePickerHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timePickerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  timePickerCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  timePickerConfirmButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#5C7CFA',
    shadowColor: '#5C7CFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  timePickerConfirmText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '700',
    textAlign: 'center',
  },
  timeColumn: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  timeAdjustButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  timeAdjustButtonText: {
    fontSize: 20,
    color: '#666',
  },
  timeDisplay: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginVertical: 8,
  },
  timeDisplayText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
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