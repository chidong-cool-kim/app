import React, { useEffect, useState, createContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppState, Dimensions } from 'react-native';
import { AuthProvider } from './authContext';
import { ThemeProvider } from './themeContext';
import { TimerProvider } from './timerContext';
import { useResponsiveStyle } from './styles/designSystem';
import ExamAnswers from './mtest';
import Wait from './wait';
import Login from './login';
import SignUp from './signup';
import Username from './username';
import Main from './main';
import Timer from './timer';
import Planner from './planner';
import NoteEditor from './noteEditor';
import NoteSelector from './NoteSelector';
import Note from './note';
import PdfViewer from './PdfViewer';
import Community from './community';
import Settings from './Settings';
import AI from './ai';
import AdminPanel from './AdminPanel';
import StudyGroup from './StudyGroupClean';
import StudyGroupDetail from './StudyGroupDetail';
import StudyStatsScreen from './StudyStatsScreen';
import Store from './Store';
import Mailbox from './Mailbox';
import MessageBox from './MessageBox';
import SnowEffectDemo from './SnowEffectDemo';
import TestSnowEffect from './TestSnowEffect';
import studyTimeService from './services/StudyTimeService';
// Gmail 기능 임시 비활성화
// import GmailDashboard from './GmailDashboard';
// import GmailExample from './GmailExample';

const Stack = createNativeStackNavigator();

// 반응형 Context 생성
export const ResponsiveContext = createContext(null);

export default function App() {
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const responsive = useResponsiveStyle(screenWidth);

  useEffect(() => {
    // 화면 크기 변화 감지
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    // 앱 상태 변화 감지
    const handleAppStateChange = (nextAppState) => {
      studyTimeService.handleAppStateChange(nextAppState);
    };

    // 앱 시작 시 자동 추적 시작
    studyTimeService.startAutoTracking();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      // 앱 종료 시 자동 추적 종료
      studyTimeService.endAutoTracking();
    };
  }, []);

  return (
    <ResponsiveContext.Provider value={responsive}>
      <AuthProvider>
        <ThemeProvider>
          <TimerProvider>
            <NavigationContainer>
            <Stack.Navigator 
              initialRouteName="Main"
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="Wait" component={Wait} />
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="SignUp" component={SignUp} />
              <Stack.Screen name="Username" component={Username} />
              <Stack.Screen name="Main" component={Main} />
              <Stack.Screen name="Timer" component={Timer} />
              <Stack.Screen name="Planner" component={Planner} />
              <Stack.Screen name="AI" component={AI} />
              <Stack.Screen name="Community" component={Community} />
              <Stack.Screen name="StudyGroup" component={StudyGroup} />
              <Stack.Screen name="StudyGroupDetail" component={StudyGroupDetail} />
              <Stack.Screen name="StudyStatsScreen" component={StudyStatsScreen} />
              <Stack.Screen name="Settings" component={Settings} />
              <Stack.Screen name="Store" component={Store} />
              <Stack.Screen name="Mailbox" component={Mailbox} />
              <Stack.Screen name="MessageBox" component={MessageBox} />
              <Stack.Screen name="SnowEffectDemo" component={SnowEffectDemo} />
              <Stack.Screen name="TestSnowEffect" component={TestSnowEffect} />
              <Stack.Screen name="AdminPanel" component={AdminPanel} />
              <Stack.Screen name="NoteSelector" component={NoteSelector} />
              <Stack.Screen name="NoteEditor" component={NoteEditor} />
              <Stack.Screen name="Note" component={Note} />
              <Stack.Screen name="ExamAnswers" component={ExamAnswers} />
              <Stack.Screen name="PdfViewer" component={PdfViewer} />
              {/* Gmail 기능 임시 비활성화
              <Stack.Screen 
                name="GmailDashboard" 
                component={GmailDashboard}
                options={{ 
                  headerShown: true,
                  title: 'Gmail Dashboard',
                  headerBackTitle: '뒤로'
                }}
              />
              <Stack.Screen 
                name="GmailExample" 
                component={GmailExample}
                options={{ 
                  headerShown: true,
                  title: 'Gmail 사용법',
                  headerBackTitle: '뒤로'
                }}
              />
              */}
            </Stack.Navigator>
          </NavigationContainer>
          </TimerProvider>
        </ThemeProvider>
      </AuthProvider>
    </ResponsiveContext.Provider>
  );
}
