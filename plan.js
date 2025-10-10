import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import userDataService from './userDataService';

// 알림 핸들러 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function Planner() {
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [tasks, setTasks] = useState([]);
  const [memo, setMemo] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskMemo, setNewTaskMemo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeSubject, setActiveSubject] = useState('플래너');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(null);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [showDateDetails, setShowDateDetails] = useState(false);

  const subjects = [
    '홈',
    '타이머',
    '플래너',
    'AI',
    '스터디그룹 찾기',
    '커뮤니티',
    '스토어',
  ];

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('알림 권한 필요', '알람 기능을 사용하려면 알림 권한이 필요합니다.');
    }
  };

  const handleSubjectPress = (subjectName) => {
    setActiveSubject(subjectName);
    
    switch (subjectName) {
      case '홈':
        navigation.navigate('Main');
        break;
      case '타이머':
        navigation.navigate('Timer');
      case '플래너':
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
      default:
        break;
    }
  };

  useEffect(() => {
    loadPlannerData();
    loadCurrentUser();
  }, [selectedDate]);

  // 화면 포커스 시 사용자 정보 새로고침
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCurrentUser();
    });

    return unsubscribe;
  }, [navigation]);

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

  const loadPlannerData = async () => {
    try {
      setLoading(true);
      const userData = await userDataService.getUserData();
      const todayPlanner = userData.planners.find(p => p.date === selectedDate);
      
      if (todayPlanner) {
        setTasks(todayPlanner.tasks || []);
        setMemo(todayPlanner.memo || '');
      } else {
        setTasks([]);
        setMemo('');
      }
    } catch (error) {
      console.error('플래너 데이터 로드 실패:', error);
      Alert.alert('오류', '플래너 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const savePlannerData = async () => {
    try {
      setSaving(true);
      await userDataService.savePlanner(selectedDate, tasks, memo);
      Alert.alert('성공', '플래너가 저장되었습니다.');
    } catch (error) {
      console.error('플래너 저장 실패:', error);
      Alert.alert('오류', '플래너 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const addTask = () => {
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
      notificationId: null,
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setNewTaskTime('');
    setNewTaskMemo('');
  };

  const toggleTask = (index) => {
    const updatedTasks = tasks.map((task, i) => 
      i === index ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
  };

  const deleteTask = async (index) => {
    Alert.alert(
      '삭제 확인',
      '이 할일을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            const task = tasks[index];
            if (task.notificationId) {
              await Notifications.cancelScheduledNotificationAsync(task.notificationId);
            }
            const updatedTasks = tasks.filter((_, i) => i !== index);
            setTasks(updatedTasks);
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
      const alarmDate = new Date(task.alarm);
      setSelectedHour(alarmDate.getHours());
      setSelectedMinute(alarmDate.getMinutes());
    }
    setShowAlarmModal(true);
  };

  const saveAlarm = async () => {
    if (selectedTaskIndex === null) return;

    const task = tasks[selectedTaskIndex];
    
    // 기존 알림 취소
    if (task.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(task.notificationId);
    }

    // 알람 시간 생성
    const alarmDate = new Date(selectedDate);
    alarmDate.setHours(selectedHour, selectedMinute, 0, 0);

    // 과거 시간인지 확인
    if (alarmDate <= new Date()) {
      Alert.alert('오류', '알람 시간은 현재 시간 이후여야 합니다.');
      return;
    }

    try {
      // 알림 스케줄링
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📚 할일 알림',
          body: task.title,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: alarmDate,
      });

      // 태스크 업데이트
      const updatedTasks = [...tasks];
      updatedTasks[selectedTaskIndex] = {
        ...task,
        alarm: alarmDate.toISOString(),
        notificationId: notificationId,
      };
      setTasks(updatedTasks);

      Alert.alert(
        '알람 설정 완료',
        `${selectedHour}시 ${selectedMinute}분에 알람이 울립니다.`
      );
      setShowAlarmModal(false);
      setSelectedTaskIndex(null);
    } catch (error) {
      console.error('알람 설정 실패:', error);
      Alert.alert('오류', '알람 설정에 실패했습니다.');
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

  const renderNumberPicker = (value, onChange, max, label) => {
    return (
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>{label}</Text>
        <View style={styles.pickerWrapper}>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => onChange(value > 0 ? value - 1 : max)}
          >
            <Text style={styles.pickerButtonText}>−</Text>
          </TouchableOpacity>
          <View style={styles.pickerValue}>
            <Text style={styles.pickerValueText}>{String(value).padStart(2, '0')}</Text>
          </View>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => onChange(value < max ? value + 1 : 0)}
          >
            <Text style={styles.pickerButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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

  return (
    <SafeAreaView style={styles.safeArea}>
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
        {/* 사이드바 */}
        {sidebarVisible && (
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
                  style={[
                    styles.subjectItem,
                    activeSubject === subject && styles.activeSubjectItem,
                  ]}
                  onPress={() => handleSubjectPress(subject)}
                >
                  <Text
                    style={[
                      styles.subjectText,
                      activeSubject === subject && styles.activeSubjectText,
                    ]}
                  >
                    {subject}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 메인 콘텐츠 */}
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
              <View style={styles.selectedDateContainer}>
                <View style={styles.selectedDateHeader}>
                  <Text style={styles.selectedDateText}>{formatDate(selectedDate)}</Text>
                  <View style={styles.dateHeaderActions}>
                    <TouchableOpacity onPress={savePlannerData} disabled={saving} style={styles.saveButtonInModal}>
                      {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonModalText}>저장</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setShowDateDetails(false)}
                      style={styles.closeDateDetails}
                    >
                      <Text style={styles.closeDateDetailsText}>×</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

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
                    <TextInput
                      style={[styles.input, styles.timeInput]}
                      placeholder="시간 (선택)"
                      value={newTaskTime}
                      onChangeText={setNewTaskTime}
                    />
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

              <View style={styles.tasksContainer}>
                <Text style={styles.sectionTitle}>할일 목록 ({tasks.length}개)</Text>
                {tasks.length === 0 ? (
                  <Text style={styles.emptyText}>등록된 할일이 없습니다.</Text>
                ) : (
                  tasks.map((task, index) => (
                    <View key={index} style={styles.taskItem}>
                      <TouchableOpacity 
                        onPress={() => toggleTask(index)}
                        style={styles.taskContent}
                      >
                        <Text style={styles.checkbox}>
                          {task.completed ? '✅' : '⬜'}
                        </Text>
                        <View style={styles.taskTextContainer}>
                          <Text style={[
                            styles.taskTitle,
                            task.completed && styles.completedTask
                          ]}>
                            {task.title}
                          </Text>
                          {task.time && (
                            <Text style={styles.taskTime}>⏰ {task.time}</Text>
                          )}
                          {task.memo && (
                            <Text style={styles.taskMemo}>📝 {task.memo}</Text>
                          )}
                          {task.alarm && (
                            <Text style={styles.taskAlarm}>
                              🔔 {new Date(task.alarm).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                      <View style={styles.taskActions}>
                        <TouchableOpacity 
                          onPress={() => setAlarmForTask(index)}
                          style={styles.alarmButton}
                        >
                          <Text style={styles.alarmButtonText}>🔔</Text>
                        </TouchableOpacity>
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
      </View>

      {/* 새로운 알람 설정 모달 */}
      <Modal
        visible={showAlarmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAlarmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alarmModalContent}>
            <View style={styles.alarmModalHeader}>
              <Text style={styles.alarmModalTitle}>⏰ 알람 설정</Text>
              <TouchableOpacity 
                onPress={() => setShowAlarmModal(false)}
                style={styles.alarmModalClose}
              >
                <Text style={styles.alarmModalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timePickerSection}>
              {renderNumberPicker(selectedHour, setSelectedHour, 23, '시')}
              <Text style={styles.timeSeparator}>:</Text>
              {renderNumberPicker(selectedMinute, setSelectedMinute, 59, '분')}
            </View>

            <View style={styles.alarmModalButtons}>
              <TouchableOpacity 
                style={styles.alarmCancelButton}
                onPress={() => setShowAlarmModal(false)}
              >
                <Text style={styles.alarmCancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.alarmSaveButton}
                onPress={saveAlarm}
              >
                <Text style={styles.alarmSaveButtonText}>설정</Text>
              </TouchableOpacity>
            </View>
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
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  defaultProfileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  taskInput: {
    flex: 1,
  },
  timeInput: {
    width: 100,
  },
  tasksContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  taskContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    fontSize: 16,
    marginRight: 12,
  },
  taskTextContainer: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    color: '#333',
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  taskTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#FF6B6B',
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
    gap: 12,
  },
  memoInputInline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  addButtonFull: {
    backgroundColor: '#5C7CFA',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
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
    fontWeight: '500',
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
    fontSize: 16,
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
  dateHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveButtonInModal: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#5C7CFA',
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonModalText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  closeDateDetails: {
    padding: 4,
  },
  closeDateDetailsText: {
    fontSize: 24,
    color: '#666',
    fontWeight: '300',
  },
  // 새로운 알람 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmModalContent: {
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
  alarmModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  alarmModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  alarmModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmModalCloseText: {
    fontSize: 24,
    color: '#666',
    fontWeight: '300',
  },
  timePickerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
  },
  pickerContainer: {
    alignItems: 'center',
    gap: 12,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 8,
    gap: 8,
  },
  pickerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pickerButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#5C7CFA',
  },
  pickerValue: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#5C7CFA',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5C7CFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pickerValueText: {
    fontSize: 36,
    fontWeight: '700',
    color: 'white',
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: '#5C7CFA',
    marginHorizontal: 4,
  },
  alarmModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  alarmCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  alarmCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  alarmSaveButton: {
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
  alarmSaveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});