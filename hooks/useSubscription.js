import { useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';

export const useSubscription = () => {
  const { user, setUser } = useContext(AuthContext);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  // 구독 상태 조회
  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/subscription/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
        return data;
      } else {
        console.error('구독 상태 조회 실패:', response.status);
        return null;
      }
    } catch (error) {
      console.error('구독 상태 조회 오류:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 구독 업그레이드
  const upgradeSubscription = async (plan) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });

      if (response.ok) {
        const data = await response.json();
        // 사용자 정보 업데이트
        if (user) {
          setUser({
            ...user,
            subscription: data.subscription
          });
        }
        await fetchSubscriptionStatus(); // 상태 새로고침
        return { success: true, data };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error };
      }
    } catch (error) {
      console.error('구독 업그레이드 오류:', error);
      return { success: false, error: '네트워크 오류가 발생했습니다.' };
    }
  };

  // 구독 해지
  const downgradeSubscription = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/subscription/downgrade', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // 사용자 정보 업데이트
        if (user) {
          setUser({
            ...user,
            subscription: { plan: 'free', isActive: false }
          });
        }
        await fetchSubscriptionStatus(); // 상태 새로고침
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error };
      }
    } catch (error) {
      console.error('구독 해지 오류:', error);
      return { success: false, error: '네트워크 오류가 발생했습니다.' };
    }
  };

  // 질문권 구매
  const buyTokens = async (amount) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/subscription/buy-tokens', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      if (response.ok) {
        await fetchSubscriptionStatus(); // 상태 새로고침
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error };
      }
    } catch (error) {
      console.error('질문권 구매 오류:', error);
      return { success: false, error: '네트워크 오류가 발생했습니다.' };
    }
  };

  // 출석 체크
  const checkAttendance = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/subscription/attendance/check', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await fetchSubscriptionStatus(); // 상태 새로고침
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error };
      }
    } catch (error) {
      console.error('출석 체크 오류:', error);
      return { success: false, error: '네트워크 오류가 발생했습니다.' };
    }
  };

  // 프로필 업데이트
  const updateProfile = async (customization) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/subscription/customize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customization),
      });

      if (response.ok) {
        await fetchSubscriptionStatus(); // 상태 새로고침
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error };
      }
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      return { success: false, error: '네트워크 오류가 발생했습니다.' };
    }
  };

  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus();
    }
  }, [user]);

  return {
    subscription,
    loading,
    refreshStatus: fetchSubscriptionStatus,
    upgradeSubscription,
    downgradeSubscription,
    buyTokens,
    checkAttendance,
    updateProfile,
    isPremium: subscription?.isActive || false,
    currentPlan: subscription?.plan || 'free'
  };
};
