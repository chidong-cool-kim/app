import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNIap from 'react-native-iap';
import userDataService from './userDataService';
import { useResponsive } from './hooks/useResponsive';
import OrientationLock from './components/OrientationLock';

// Google Play Console에 등록한 상품 ID
const PRODUCT_IDS = Platform.select({
  android: ['basic_monthly', 'premium_monthly'],
  ios: ['basic_monthly', 'premium_monthly'],
});

const PLANS = [
  {
    id: 'basic',
    productId: 'basic_monthly',
    name: '베이직',
    price: '9,900',
    aiQuestions: 30,
    aiModel: 'GPT-4o',
    features: [
      '프리미엄 프로필 커스터마이징',
      'AI 질문 월 30개',
      'GPT-4o mini 모델 사용',
      '전용 커뮤니티 스타일 제공',
      '노트 최대 15개 생성 (텍스트+그림)',
    ],
  },
  {
    id: 'premium',
    productId: 'premium_monthly',
    name: '프리미엄',
    price: '14,900',
    aiQuestions: 65,
    aiModel: 'GPT-4o',
    features: [
      '프리미엄 프로필 커스터마이징',
      'AI 질문 월 65개',
      'GPT-4o 최신 모델 사용',
      '더 많은 전용 커뮤니티 스타일 제공',
      'AI 응답 스타일 선택 가능 (6가지)',
      '노트 최대 25개 생성 (텍스트+그림)',
      '잠근된 모든 노트 기능 해제',
      '우선 지원',
    ],
  },
];

export default function Store() {
  const navigation = useNavigation();
  const responsiveUtil = useResponsive();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [products, setProducts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);

  useEffect(() => {
    initializeIAP();
    loadUserData();
    checkSubscriptionStatus(); // 구독 상태 체크
  }, []);

  // 구독 상태 주기적 체크
  useEffect(() => {
    const interval = setInterval(() => {
      checkSubscriptionStatus();
    }, 60000); // 1분마다 체크

    return () => clearInterval(interval);
  }, [currentUser]);

  // IAP 초기화
  const initializeIAP = async () => {
    try {
      console.log('🔧 IAP 초기화 시작...');
      
      // IAP 연결
      const result = await RNIap.initConnection();
      console.log('✅ IAP 연결 성공:', result);

      // 상품 정보 가져오기
      if (Platform.OS === 'android') {
        const products = await RNIap.getSubscriptions({ skus: PRODUCT_IDS.android });
        console.log('📦 구독 상품 정보:', products);
        setAvailableProducts(products);
      } else if (Platform.OS === 'ios') {
        const products = await RNIap.getProducts({ skus: PRODUCT_IDS.ios });
        console.log('📦 상품 정보:', products);
        setAvailableProducts(products);
      }

      // 구매 업데이트 리스너 등록
      const purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
        async (purchase) => {
          console.log('💳 구매 업데이트:', purchase);
          const receipt = purchase.transactionReceipt || purchase.purchaseToken;
          
          if (receipt) {
            try {
              // 서버에 영수증 검증 요청
              await verifyPurchase(purchase);
              
              // 구매 완료 처리
              if (Platform.OS === 'android') {
                await RNIap.acknowledgePurchaseAndroid({
                  token: purchase.purchaseToken,
                });
              } else if (Platform.OS === 'ios') {
                await RNIap.finishTransaction({ purchase });
              }
              
              console.log('✅ 구매 완료 처리됨');
            } catch (error) {
              console.error('❌ 구매 검증 실패:', error);
            }
          }
        }
      );

      const purchaseErrorSubscription = RNIap.purchaseErrorListener(
        (error) => {
          console.error('❌ 구매 오류:', error);
          setPurchaseInProgress(false);
          if (error.code !== 'E_USER_CANCELLED') {
            Alert.alert('구매 실패', error.message || '구매 중 오류가 발생했습니다.');
          }
        }
      );

      // 컴포넌트 언마운트 시 리스너 해제
      return () => {
        purchaseUpdateSubscription?.remove();
        purchaseErrorSubscription?.remove();
        RNIap.endConnection();
      };
    } catch (error) {
      console.error('❌ IAP 초기화 실패:', error);
      console.log('⚠️ 개발 모드에서는 임시 결제 시스템을 사용합니다.');
    }
  };

  const loadUserData = async () => {
    try {
      setLoading(true);

      const user = await userDataService.getCurrentUser();
      if (user) {
        const userData = await userDataService.getUserData();
        setUserData(userData);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('사용자 데이터 로드 실패:', error);
      Alert.alert('오류', '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 구독 상태 체크 함수
  const checkSubscriptionStatus = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user || !user.email) return;

      // 서버에서 최신 구독 정보 가져오기 (만료 체크 포함)
      const response = await fetch(`http://192.168.45.53:5000/api/subscription/${user.email}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.subscription) {
          // 로컬 사용자 정보 업데이트
          const updatedUser = {
            ...user,
            subscription: data.subscription
          };
          await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);
          
          // 만료된 경우 알림
          if (!data.subscription.isActive && user.subscription?.isActive) {
            Alert.alert(
              '구독 만료',
              '구독 기간이 만료되었습니다. 계속 이용하시려면 구독을 갱신해주세요.',
              [{ text: '확인' }]
            );
          }
        }
      }
    } catch (error) {
      console.error('구독 상태 체크 실패:', error);
    }
  };


  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  // 구매 검증
  const verifyPurchase = async (purchase) => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) throw new Error('사용자 정보를 찾을 수 없습니다.');

      const response = await fetch('http://192.168.45.53:5000/api/iap/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          platform: Platform.OS,
          productId: purchase.productId,
          transactionId: purchase.transactionId,
          purchaseToken: purchase.purchaseToken,
          receiptData: purchase.transactionReceipt,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // 로컬 사용자 정보 업데이트
        const plan = PLANS.find(p => p.productId === purchase.productId);
        if (plan) {
          const subscriptionData = {
            planId: plan.id,
            planName: plan.name,
            price: plan.price,
            aiQuestions: plan.aiQuestions,
            aiModel: plan.aiModel,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
            productId: purchase.productId,
            transactionId: purchase.transactionId,
            purchaseToken: purchase.purchaseToken,
          };

          const updatedUser = {
            ...user,
            subscription: subscriptionData,
          };

          await userDataService.updateCurrentUser(updatedUser);
          setCurrentUser(updatedUser);
          
          setProcessingPayment(false);
          setShowPaymentModal(false);
          setPurchaseInProgress(false);
          Alert.alert(
            '구독 완료!',
            `${plan.name} 플랜이 활성화되었습니다!\n\n✅ ${plan.aiModel} 모델 사용 가능\n✅ AI 질문 ${plan.aiQuestions}개/월\n✅ 프로필 커스터마이징 기능`,
            [{ text: '확인', onPress: () => loadUserData() }]
          );
        }
      } else {
        throw new Error(data.message || '구매 검증에 실패했습니다.');
      }
    } catch (error) {
      console.error('구매 검증 오류:', error);
      throw error;
    }
  };

  // 실제 결제 처리
  const handlePayment = async () => {
    if (!selectedPlan || purchaseInProgress) return;

    try {
      setProcessingPayment(true);
      setPurchaseInProgress(true);
      console.log('🛒 결제 시작:', selectedPlan.name);

      // IAP가 초기화되지 않았으면 오류 표시
      if (availableProducts.length === 0) {
        Alert.alert(
          '결제 불가',
          '결제 시스템이 초기화되지 않았습니다.\n\n앱을 다시 시작하거나 잠시 후 다시 시도해주세요.',
          [{ text: '확인' }]
        );
        setProcessingPayment(false);
        setPurchaseInProgress(false);
        return;
      }

      // 실제 구매 요청
      if (Platform.OS === 'android') {
        await RNIap.requestSubscription({
          sku: selectedPlan.productId,
        });
      } else if (Platform.OS === 'ios') {
        await RNIap.requestSubscription({
          sku: selectedPlan.productId,
        });
      }

      console.log('✅ 구매 요청 완료');
    } catch (error) {
      console.error('❌ 결제 실패:', error);
      setProcessingPayment(false);
      setPurchaseInProgress(false);
      
      if (error.code === 'E_USER_CANCELLED') {
        console.log('사용자가 결제를 취소했습니다.');
      } else {
        Alert.alert('결제 실패', error.message || '결제 중 오류가 발생했습니다.');
      }
    }
  };

  // 구독 복원
  const restorePurchases = async () => {
    try {
      console.log('🔄 구독 복원 시작...');
      
      if (availableProducts.length === 0) {
        Alert.alert(
          '알림',
          'IAP가 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.',
          [{ text: '확인' }]
        );
        return;
      }

      const purchases = await RNIap.getAvailablePurchases();
      console.log('📦 구매 내역:', purchases);

      if (purchases.length === 0) {
        Alert.alert(
          '구독 없음',
          '복원할 구독이 없습니다.',
          [{ text: '확인' }]
        );
        return;
      }

      // 가장 최근 구매 복원
      const latestPurchase = purchases[purchases.length - 1];
      await verifyPurchase(latestPurchase);

      Alert.alert(
        '복원 완료',
        '구독이 복원되었습니다.',
        [{ text: '확인', onPress: () => loadUserData() }]
      );
    } catch (error) {
      console.error('❌ 구독 복원 실패:', error);
      Alert.alert(
        '복원 실패',
        '구독 복원에 실패했습니다. 나중에 다시 시도해주세요.',
        [{ text: '확인' }]
      );
    }
  };

  const getCurrentSubscription = () => {
    if (!currentUser?.subscription) return null;
    return currentUser.subscription;
  };

  const currentSubscription = getCurrentSubscription();


  // 가격 포맷팅
  const formatPrice = (product) => {
    if (!product) return '가격 정보 없음';
    
    if (product.localizedPrice) {
      return product.localizedPrice;
    }
    
    if (product.price) {
      return `₩${product.price.toLocaleString()}`;
    }
    
    return '가격 정보 없음';
  };

  // 반응형 스타일 적용
  const styles = useMemo(
    () => responsiveUtil.applyAll(baseStyles), 
    [responsiveUtil]
  );

  if (loading) {
    return (
      <OrientationLock isNoteScreen={false}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>로딩 중...</Text>
          </View>
        </SafeAreaView>
      </OrientationLock>
    );
  }

  return (
    <OrientationLock isNoteScreen={false}>
      <SafeAreaView style={styles.container}> 
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>스토어</Text>
          <TouchableOpacity onPress={restorePurchases}>
            <Text style={styles.restoreButton}>복원</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            Dimensions.get('window').width >= 768 && styles.scrollContentTablet
          ]}
        >
          {/* 현재 구독 상태 */}
          {currentSubscription && (
            <View style={styles.currentSubscription}>
              <Text style={styles.currentSubscriptionTitle}>현재 구독 중</Text>
              <View style={styles.subscriptionCard}>
                <Text style={styles.subscriptionName}>{currentSubscription.planName}</Text>
                <Text style={styles.subscriptionPrice}>월 {currentSubscription.price}원</Text>
                <Text style={styles.subscriptionExpiry}>
                  만료일: {new Date(currentSubscription.endDate).toLocaleDateString('ko-KR')}
                </Text>
                <View style={styles.subscriptionFeatures}>
                  <Text style={styles.subscriptionFeature}>
                    ✅ {currentSubscription.aiModel} 모델 사용
                  </Text>
                  <Text style={styles.subscriptionFeature}>
                    ✅ AI 질문 {currentSubscription.aiQuestions}개/월
                  </Text>
                  <Text style={styles.subscriptionFeature}>
                    ✅ 프로필 커스터마이징 활성화
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 플랜 선택 */}
          <View style={styles.plansSection}>
            <Text style={styles.sectionTitle}>플랜 선택</Text>
            <Text style={styles.sectionSubtitle}>
              프로필을 더 멋지게 꾸미고 AI 질문을 더 많이 사용해보세요!
            </Text>

            {PLANS.map((plan) => {
              const product = availableProducts.find(p => p.productId === plan.productId);
              const displayPrice = product ? formatPrice(product) : `월 ${plan.price}원`;

              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    currentSubscription?.planId === plan.id && styles.currentPlanCard,
                  ]}
                  onPress={() => handlePlanSelect(plan)}
                  disabled={currentSubscription?.planId === plan.id}
                >
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.planPrice}>{displayPrice}</Text>
                    </View>
                  </View>

                  <View style={styles.planContent}>
                    <View style={styles.planFeatures}>
                      {plan.features.map((feature, index) => (
                        <Text key={index} style={styles.planFeature}>
                          • {feature}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.planFooter}>
                      {currentSubscription?.planId === plan.id ? (
                        <Text style={styles.currentPlanText}>현재 플랜</Text>
                      ) : (
                        <TouchableOpacity
                          style={styles.subscribeButton}
                          onPress={() => handlePlanSelect(plan)}
                        >
                          <Text style={styles.subscribeButtonText}>구독하기</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 추가 정보 */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>💡 유의사항</Text>
            <Text style={styles.infoText}>
              • 구독은 매월 자동으로 갱신됩니다{'\n'}
              • 구독 취소는 Google Play 설정에서 언제든지 가능합니다{'\n'}
              • 사용하지 않은 AI 질문권은 다음 달로 이월되지 않습니다{'\n'}
              • 결제는 Google Play 계정으로 청구됩니다{'\n'}
              • 환불 정책은 Google Play 정책을 따릅니다
            </Text>
          </View>
        </ScrollView>

        {/* 결제 확인 모달 */}
        <Modal
          visible={showPaymentModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPaymentModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>결제 확인</Text>

              {selectedPlan && (
                <>
                  <View style={styles.modalPlanInfo}>
                    <Text style={styles.modalPlanName}>{selectedPlan.name} 플랜</Text>
                    <Text style={styles.modalPlanModel}>{selectedPlan.aiModel} 모델</Text>
                    <Text style={styles.modalPlanPrice}>월 {selectedPlan.price}원</Text>
                    <Text style={styles.modalPlanQuestions}>
                      AI 질문 {selectedPlan.aiQuestions}개/월
                    </Text>
                  </View>

                  <View style={styles.modalFeatures}>
                    <Text style={styles.modalFeaturesTitle}>포함된 기능:</Text>
                    {selectedPlan.features.map((feature, index) => (
                      <Text key={index} style={styles.modalFeature}>
                        • {feature}
                      </Text>
                    ))}
                  </View>

                  <Text style={styles.modalNote}>
                    Google Play를 통해 결제가 진행됩니다.
                  </Text>
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowPaymentModal(false)}
                  disabled={processingPayment}
                >
                  <Text style={styles.modalCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalConfirmButton,
                    processingPayment && styles.disabledButton,
                  ]}
                  onPress={handlePayment}
                  disabled={processingPayment}
                >
                  {processingPayment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmText}>결제하기</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>


      </SafeAreaView>
    </OrientationLock>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    height: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  backButton: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '500',
  },
  restoreButton: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '500',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  scrollContentTablet: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 40,
  },
  currentSubscription: {
    margin: 20,
    marginBottom: 0,
  },
  currentSubscriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  subscriptionCard: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
  },
  subscriptionName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subscriptionPrice: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  subscriptionExpiry: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  subscriptionFeatures: {
    gap: 4,
  },
  subscriptionFeature: {
    fontSize: 14,
    color: '#fff',
  },
  plansSection: {
    margin: 20,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'space-between',
    minHeight: 180,
  },
  currentPlanCard: {
    borderColor: '#4A90E2',
    borderWidth: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A90E2',
  },
  planContent: {
    flex: 1,
  },
  planFeatures: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 16,
  },
  planFeature: {
    fontSize: 14,
    color: '#666',
  },
  planFooter: {
    alignItems: 'flex-end',
  },
  subscribeButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  currentPlanText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  infoSection: {
    margin: 20,
    marginTop: 0,
    marginBottom: 10,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalPlanInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalPlanName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalPlanPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 8,
  },
  modalPlanModel: {
    fontSize: 14,
    color: '#4A90E2',
    marginBottom: 4,
  },
  modalPlanQuestions: {
    fontSize: 16,
    color: '#666',
  },
  modalFeatures: {
    marginBottom: 16,
  },
  modalFeaturesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalFeature: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  modalNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ccc',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.6,
  },
  
  // AI 스타일 관련 스타일
  modalAiStyleSection: {
    marginVertical: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5E5',
  },
  modalAiStyleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalAiStyleButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalAiStyleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  modalAiStyleArrow: {
    fontSize: 12,
    color: '#666',
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
  styleIcon: { 
    fontSize: 32, 
    marginBottom: 8 
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