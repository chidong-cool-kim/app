import React, { useEffect, useState, createContext, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppState, Dimensions, Linking, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context'; 
import * as WebBrowser from 'expo-web-browser';

import { AuthProvider } from './authContext';
import { ThemeProvider } from './themeContext';
import { TimerProvider } from './timerContext';
import { useResponsiveStyle } from './styles/designSystem';
import ExamAnswers from './mtest';
import MockExamScreen from './MockExamScreen';
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
import LevelUpScreen from './LevelUpScreen';
import SnowEffectDemo from './SnowEffectDemo';
import TestSnowEffect from './TestSnowEffect';
import studyTimeService from './services/StudyTimeService';

const Stack = createNativeStackNavigator();

export const ResponsiveContext = createContext(null);

export default function App() {
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const responsive = useResponsiveStyle(screenWidth);
  const navigationRef = useRef();
  const [initialUrl, setInitialUrl] = useState(null);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      studyTimeService.handleAppStateChange(nextAppState);
    };

    studyTimeService.startAutoTracking();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      studyTimeService.endAutoTracking();
    };
  }, []);

  // Deep Link 처리
  useEffect(() => {
    // 앱이 닫혀있을 때 링크로 열린 경우
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log(' Initial URL:', url);
        setInitialUrl(url);
        handleDeepLink(url);
      }
    });

    // 앱이 실행 중일 때 링크를 받은 경우
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log(' Deep Link received:', url);
      handleDeepLink(url);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const handleDeepLink = (url) => {
    if (!url) return;

    console.log(' Processing deep link:', url);

    // myapp://invite/studygroup/:groupId 또는 https://myapp.com/invite/studygroup/:groupId
    const inviteMatch = url.match(/\/invite\/studygroup\/([a-zA-Z0-9]+)/);
    
    if (inviteMatch && inviteMatch[1]) {
      const groupId = inviteMatch[1];
      console.log(' Study group invite detected, groupId:', groupId);
      
      // 앱이 미설치 상태에서 웹 링크로 접근한 경우 플레이스토어로 리다이렉트
      if (url.startsWith('https://') && Platform.OS === 'android') {
        WebBrowser.openBrowserAsync('https://play.google.com/store/apps/details?id=com.myapp');
        return;
      }

      // 네비게이션이 준비되면 초대 화면으로 이동
      setTimeout(() => {
        if (navigationRef.current) {
          navigationRef.current.navigate('StudyGroupInvite', { groupId });
        }
      }, 1000);
    }
  };

  return (
    <SafeAreaProvider> 
      <ResponsiveContext.Provider value={responsive}>
        <AuthProvider>
          <ThemeProvider>
            <TimerProvider>
              <NavigationContainer ref={navigationRef}>
                <Stack.Navigator 
                  initialRouteName="Wait"
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
                  <Stack.Screen name="StudyGroupInvite" component={require('./StudyGroupInvite').default} />
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
                  <Stack.Screen name="MockExamScreen" component={MockExamScreen} />
                  <Stack.Screen name="PdfViewer" component={PdfViewer} />
                  <Stack.Screen 
                    name="LevelUpScreen" 
                    component={LevelUpScreen}
                    options={{
                      presentation: 'transparentModal',
                      animation: 'fade',
                      headerShown: false,
                    }}
                  />
                </Stack.Navigator>
              </NavigationContainer>
            </TimerProvider>
          </ThemeProvider>
        </AuthProvider>
      </ResponsiveContext.Provider>
    </SafeAreaProvider>
  );
}