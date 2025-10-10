// 음성채팅 시뮬레이션 서비스
class VoiceChatService {
  constructor() {
    this.activeRooms = new Map();
    this.userVoiceStatus = new Map();
  }

  // 음성채팅 방 초기화
  initializeVoiceRoom(roomCode) {
    if (!this.activeRooms.has(roomCode)) {
      this.activeRooms.set(roomCode, {
        users: [],
        activeVoices: new Set(),
        recordings: [],
        createdAt: new Date(),
      });
      console.log(`🎤 [VoiceChat] 음성채팅 방 초기화: ${roomCode}`);
    }
  }

  // 사용자 음성채팅 참여
  joinVoiceChat(roomCode, userId) {
    this.initializeVoiceRoom(roomCode);
    const room = this.activeRooms.get(roomCode);
    
    if (!room.users.includes(userId)) {
      room.users.push(userId);
      console.log(`🎤 [VoiceChat] ${userId}가 음성채팅에 참여: ${roomCode}`);
    }
    
    return {
      roomCode,
      userCount: room.users.length,
      activeVoices: Array.from(room.activeVoices),
    };
  }

  // 사용자 음성채팅 나가기
  leaveVoiceChat(roomCode, userId) {
    const room = this.activeRooms.get(roomCode);
    if (!room) return;

    room.users = room.users.filter(id => id !== userId);
    room.activeVoices.delete(userId);
    this.userVoiceStatus.delete(`${roomCode}_${userId}`);
    
    console.log(`🎤 [VoiceChat] ${userId}가 음성채팅에서 나감: ${roomCode}`);
    
    // 방이 비어있으면 삭제
    if (room.users.length === 0) {
      this.activeRooms.delete(roomCode);
      console.log(`🎤 [VoiceChat] 빈 음성채팅 방 삭제: ${roomCode}`);
    }
  }

  // 음성 상태 업데이트 (녹음 시작/중지)
  updateVoiceStatus(roomCode, userId, isActive) {
    const room = this.activeRooms.get(roomCode);
    if (!room) return;

    const statusKey = `${roomCode}_${userId}`;
    
    if (isActive) {
      room.activeVoices.add(userId);
      this.userVoiceStatus.set(statusKey, {
        isActive: true,
        startTime: new Date(),
        userId,
        roomCode,
      });
      console.log(`🎤 [VoiceChat] ${userId} 음성 활성화`);
    } else {
      room.activeVoices.delete(userId);
      const status = this.userVoiceStatus.get(statusKey);
      if (status) {
        const duration = new Date() - status.startTime;
        console.log(`🎤 [VoiceChat] ${userId} 음성 비활성화 (${Math.round(duration/1000)}초)`);
        
        // 녹음 기록 저장 (시뮬레이션)
        room.recordings.push({
          userId,
          duration,
          timestamp: new Date(),
          // 실제로는 여기에 오디오 데이터가 들어갈 것
          audioData: `simulated_audio_${Date.now()}`,
        });
      }
      this.userVoiceStatus.delete(statusKey);
    }

    return {
      roomCode,
      activeVoices: Array.from(room.activeVoices),
      userCount: room.users.length,
    };
  }

  // 방의 음성 상태 조회
  getVoiceRoomStatus(roomCode) {
    const room = this.activeRooms.get(roomCode);
    if (!room) {
      return null;
    }

    return {
      roomCode,
      userCount: room.users.length,
      users: room.users,
      activeVoices: Array.from(room.activeVoices),
      recordingCount: room.recordings.length,
      lastActivity: room.recordings.length > 0 
        ? room.recordings[room.recordings.length - 1].timestamp 
        : room.createdAt,
    };
  }

  // 음성 메시지 시뮬레이션
  simulateVoiceMessage(roomCode, userId, message) {
    const room = this.activeRooms.get(roomCode);
    if (!room) return null;

    const voiceMessage = {
      id: Date.now(),
      userId,
      message,
      timestamp: new Date(),
      type: 'voice_simulation',
      duration: message.length * 100, // 글자 수 기반 시뮬레이션
    };

    room.recordings.push(voiceMessage);
    console.log(`🎤 [VoiceChat] 음성 메시지 시뮬레이션: ${userId} - "${message}"`);

    return voiceMessage;
  }

  // 최근 음성 활동 조회
  getRecentVoiceActivity(roomCode, limit = 10) {
    const room = this.activeRooms.get(roomCode);
    if (!room) return [];

    return room.recordings
      .slice(-limit)
      .reverse()
      .map(recording => ({
        userId: recording.userId,
        timestamp: recording.timestamp,
        duration: recording.duration,
        type: recording.type || 'recording',
        message: recording.message || null,
      }));
  }

  // 전체 통계
  getGlobalStats() {
    const totalRooms = this.activeRooms.size;
    let totalUsers = 0;
    let totalActiveVoices = 0;
    let totalRecordings = 0;

    this.activeRooms.forEach(room => {
      totalUsers += room.users.length;
      totalActiveVoices += room.activeVoices.size;
      totalRecordings += room.recordings.length;
    });

    return {
      totalRooms,
      totalUsers,
      totalActiveVoices,
      totalRecordings,
      timestamp: new Date(),
    };
  }
}

// 싱글톤 인스턴스
const voiceChatService = new VoiceChatService();

export default voiceChatService;
