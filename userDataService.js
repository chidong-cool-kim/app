import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.45.53:5000/api';

class UserDataService {
    constructor() {
        this.currentUser = null;
    }

    // 현재 로그인한 사용자 정보 가져오기
    async getCurrentUser() {
        if (!this.currentUser) {
            const userInfo = await AsyncStorage.getItem('currentUser');
            if (userInfo) {
                this.currentUser = JSON.parse(userInfo);
                // StudyTimeService에 사용자 설정 (처음 로드 시)
                await this.setStudyTimeUser(this.currentUser.email);
            }
        }
        return this.currentUser;
    }

    // 사용자 데이터 전체 조회
    async getUserData() {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                throw new Error('로그인이 필요합니다.');
            }

            const response = await fetch(`${BASE_URL}/user-data/${user.email}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '데이터 조회에 실패했습니다.');
            }

            // 프로필 이미지 URL을 완전한 URL로 변환
            if (data.data && data.data.user && data.data.user.profileImage) {
                if (data.data.user.profileImage.startsWith('/uploads/')) {
                    data.data.user.profileImage = `http://192.168.45.53:5000${data.data.user.profileImage}`;
                }
            }

            return data.data;
        } catch (error) {
            console.error('사용자 데이터 조회 오류:', error);
            throw error;
        }
    }

    // 노트 관련 메서드들
    async addNote(title, content = '') {
        try {
            console.log('📝 [UserDataService] 노트 저장 시작:', { title, contentLength: content.length });
            
            const user = await this.getCurrentUser();
            if (!user) {
                throw new Error('로그인이 필요합니다.');
            }

            console.log('👤 [UserDataService] 현재 사용자:', user.email);

            const requestBody = {
                email: user.email,
                title,
                content
            };

            console.log('📤 [UserDataService] API 요청:', `${BASE_URL}/notes`, requestBody);

            const response = await fetch(`${BASE_URL}/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('📥 [UserDataService] API 응답 상태:', response.status);

            const data = await response.json();
            console.log('📥 [UserDataService] API 응답 데이터:', data);

            if (!response.ok) {
                throw new Error(data.message || '노트 저장에 실패했습니다.');
            }

            console.log('✅ [UserDataService] 노트 저장 성공:', data.note._id);
            return { success: true, note: data.note };
        } catch (error) {
            console.error('❌ [UserDataService] 노트 추가 오류:', error);
            throw error;
        }
    }

    async updateNote(noteId, title, content = '') {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                throw new Error('로그인이 필요합니다.');
            }

            const response = await fetch(`${BASE_URL}/notes/${noteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: user.email,
                    title,
                    content
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '노트 수정에 실패했습니다.');
            }

            return data.note;
        } catch (error) {
            console.error('노트 수정 오류:', error);
            throw error;
        }
    }

    async deleteNote(noteId) {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                throw new Error('로그인이 필요합니다.');
            }

            const response = await fetch(`${BASE_URL}/notes/${noteId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: user.email
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '노트 삭제에 실패했습니다.');
            }

            return data;
        } catch (error) {
            console.error('노트 삭제 오류:', error);
            throw error;
        }
    }

    async getNote(noteId) {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                throw new Error('로그인이 필요합니다.');
            }

            const response = await fetch(`${BASE_URL}/notes/${noteId}?email=${encodeURIComponent(user.email)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '노트 조회에 실패했습니다.');
            }

            return data.note;
        } catch (error) {
            console.error('노트 조회 오류:', error);
            throw error;
        }
    }

    // 공부 시간 추가
    async addStudyTime(minutes) {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                throw new Error('로그인이 필요합니다.');
            }

            const response = await fetch(`${BASE_URL}/study-time`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: user.email,
                    minutes
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '공부 시간 저장에 실패했습니다.');
            }

            return data.weeklyStudy;
        } catch (error) {
            console.error('공부 시간 추가 오류:', error);
            throw error;
        }
    }

    // 주간 공부시간 조회
    async getWeeklyStudyTime() {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                throw new Error('로그인이 필요합니다.');
            }

            const response = await fetch(`${BASE_URL}/weekly-study/${encodeURIComponent(user.email)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '주간 공부시간 조회에 실패했습니다.');
            }

            return data; // weeklyStudy, dailyStudy, levelSystem 모두 포함
        } catch (error) {
            console.error('주간 공부시간 조회 오류:', error);
            throw error;
        }
    }

    // 플래너 조회
    async getPlanner(date) {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                throw new Error('로그인이 필요합니다.');
            }

            const response = await fetch(`${BASE_URL}/planner/${user.email}/${date}`);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 404) {
                    // 플래너가 없는 경우 null 반환
                    return null;
                }
                throw new Error(data.message || '플래너 조회에 실패했습니다.');
            }

            return data.planner;
        } catch (error) {
            console.error('플래너 조회 오류:', error);
            // 네트워크 오류나 서버 오류의 경우 null 반환
            return null;
        }
    }

    // 플래너 저장/업데이트
    async savePlanner(date, tasks = [], memo = '') {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                throw new Error('로그인이 필요합니다.');
            }

            const response = await fetch(`${BASE_URL}/planner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: user.email,
                    date,
                    tasks,
                    memo
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '플래너 저장에 실패했습니다.');
            }

            return data.planner;
        } catch (error) {
            console.error('플래너 저장 오류:', error);
            throw error;
        }
    }

    // AI 채팅 저장
    async addAiChat(role, content) {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                throw new Error('로그인이 필요합니다.');
            }

            const response = await fetch(`${BASE_URL}/ai-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: user.email,
                    role,
                    content
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'AI 채팅 저장에 실패했습니다.');
            }

            return data.aiChats;
        } catch (error) {
            console.error('AI 채팅 저장 오류:', error);
            throw error;
        }
    }

    // 현재 사용자 정보 업데이트
    async updateCurrentUser(updatedUser) {
        this.currentUser = updatedUser;
        await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
        
        // StudyTimeService에 현재 사용자 설정
        await this.setStudyTimeUser(updatedUser.email);
    }

    // StudyTimeService에 현재 사용자 설정
    async setStudyTimeUser(userEmail) {
        try {
            const StudyTimeService = (await import('./services/StudyTimeService.js')).default;
            StudyTimeService.setCurrentUser(userEmail);
            await StudyTimeService.loadData();
            console.log(`👤 StudyTimeService 사용자 설정: ${userEmail}`);
        } catch (error) {
            console.error('StudyTimeService 사용자 설정 실패:', error);
        }
    }

    // 서버에서 최신 사용자 정보 가져와서 로컬 업데이트
    async refreshCurrentUser() {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                return null;
            }

            const userData = await this.getUserData();
            if (userData && userData.user) {
                // 프로필 이미지 URL을 완전한 URL로 변환
                let profileImageUrl = userData.user.profileImage;
                if (profileImageUrl && profileImageUrl.startsWith('/uploads/')) {
                    profileImageUrl = `http://192.168.45.53:5000${profileImageUrl}`;
                }
                
                const updatedUser = {
                    ...user,
                    ...userData.user,
                    profileImage: profileImageUrl
                };
                console.log('🔄 사용자 정보 새로고침:', {
                    email: updatedUser.email,
                    profileImage: updatedUser.profileImage
                });
                await this.updateCurrentUser(updatedUser);
                return updatedUser;
            }
            return user;
        } catch (error) {
            console.error('사용자 정보 새로고침 실패:', error);
            return await this.getCurrentUser();
        }
    }

    // 구독 정보 업데이트
    async updateSubscription(subscriptionData) {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                throw new Error('로그인이 필요합니다.');
            }

            const response = await fetch(`${BASE_URL}/subscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: user.email,
                    ...subscriptionData
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '구독 정보 업데이트에 실패했습니다.');
            }

            return data.subscription;
        } catch (error) {
            console.error('구독 정보 업데이트 오류:', error);
            throw error;
        }
    }

    // AI 질문 사용량 추가
    async addAiQuestionUsage() {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                throw new Error('로그인이 필요합니다.');
            }

            const response = await fetch(`${BASE_URL}/ai-usage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: user.email
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'AI 질문 사용량 업데이트에 실패했습니다.');
            }

            return data.usage;
        } catch (error) {
            console.error('AI 질문 사용량 업데이트 오류:', error);
            throw error;
        }
    }

    // 로그아웃 시 현재 사용자 정보 초기화
    async clearCurrentUser() {
        this.currentUser = null;
        
        // StudyTimeService도 초기화
        try {
            const StudyTimeService = (await import('./services/StudyTimeService.js')).default;
            StudyTimeService.setCurrentUser(null);
            StudyTimeService.resetData();
            console.log('👤 StudyTimeService 사용자 초기화');
        } catch (error) {
            console.error('StudyTimeService 초기화 실패:', error);
        }
    }
}

// 싱글톤 인스턴스
const userDataService = new UserDataService();
export default userDataService;
