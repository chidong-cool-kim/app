import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import userDataService from '../userDataService';

const TodayTasksWidget = ({ onPress, navigation }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadTodayTasks();

    // 화면 포커스 시 다시 로드
    const unsubscribe = navigation.addListener('focus', () => {
      loadTodayTasks();
    });

    // 주기적으로 업데이트 (5초마다)
    const interval = setInterval(() => {
      loadTodayTasks();
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [navigation]);

  const loadTodayTasks = async () => {
    try {
      setLoading(true);
      const savedData = await userDataService.getPlanner(today);
      
      if (savedData && savedData.tasks) {
        setTasks(savedData.tasks);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('오늘 할일 로드 실패:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (index) => {
    try {
      const updatedTasks = tasks.map((task, i) => 
        i === index ? { ...task, completed: !task.completed } : task
      );
      setTasks(updatedTasks);

      // 서버에 저장
      const savedData = await userDataService.getPlanner(today);
      const memo = savedData?.memo || '';
      await userDataService.savePlanner(today, updatedTasks, memo);
    } catch (error) {
      console.error('할 일 상태 저장 실패:', error);
      // 에러 발생 시 다시 로드
      loadTodayTasks();
    }
  };

  const completedCount = tasks.filter(task => task.completed).length;
  const totalCount = tasks.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#1D1D1F" />
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => navigation.navigate('Planner')}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={styles.title}>오늘 할 일</Text>
        {totalCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{completedCount}/{totalCount}</Text>
          </View>
        )}
      </View>

      {totalCount === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>등록된 할 일이 없습니다</Text>
          <Text style={styles.emptySubtext}>플래너에서 오늘 할 일을 추가해보세요</Text>
        </View>
      ) : (
        <>
          {/* 할 일 목록 (최대 3개만 표시) */}
          <View style={styles.tasksList}>
            {tasks.slice(0, 3).map((task, index) => (
              <View key={index} style={styles.taskItem}>
                <TouchableOpacity 
                  onPress={() => toggleTask(index)}
                  style={styles.checkboxContainer}
                >
                  <Text style={styles.checkbox}>
                    {task.completed ? '✓' : '○'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.taskTextContainer}
                  onPress={() => navigation.navigate('Planner')}
                >
                  <Text 
                    style={[
                      styles.taskTitle,
                      task.completed && styles.completedTask
                    ]}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                </TouchableOpacity>
                {task.time && (
                  <Text style={styles.taskTime}>
                    {(() => {
                      const [hours, minutes] = task.time.split(':');
                      const hour24 = parseInt(hours);
                      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                      const ampm = hour24 >= 12 ? 'PM' : 'AM';
                      return `${hour12}:${minutes} ${ampm}`;
                    })()}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* 더보기 */}
          {totalCount > 3 && (
            <Text style={styles.moreText}>
              +{totalCount - 3}개 더보기
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.3,
  },
  badge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D1D1F',
    letterSpacing: -0.2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 15,
    color: '#86868B',
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#C7C7CC',
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  tasksList: {
    gap: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxContainer: {
    padding: 4,
  },
  checkbox: {
    fontSize: 20,
    color: '#1D1D1F',
    width: 24,
  },
  taskTextContainer: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1D1D1F',
    letterSpacing: -0.3,
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: '#86868B',
    opacity: 0.6,
  },
  taskTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#86868B',
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    letterSpacing: -0.1,
  },
  moreText: {
    fontSize: 13,
    color: '#86868B',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: -0.1,
  },
});

export default TodayTasksWidget;
