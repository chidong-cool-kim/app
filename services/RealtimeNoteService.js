// 실시간 노트 공유 서비스 (WebSocket 시뮬레이션)
class RealtimeNoteService {
  constructor() {
    this.rooms = new Map();
    this.listeners = new Map();
  }

  // 방 생성
  createRoom(roomCode, noteData) {
    this.rooms.set(roomCode, {
      noteData: noteData,
      users: [],
      createdAt: new Date(),
    });
    console.log(`📝 [RealtimeNote] 방 생성됨: ${roomCode}`);
    return roomCode;
  }

  // 방 참여
  joinRoom(roomCode, userId) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new Error('방을 찾을 수 없습니다.');
    }

    if (!room.users.includes(userId)) {
      room.users.push(userId);
    }

    console.log(`📝 [RealtimeNote] 사용자 ${userId}가 방 ${roomCode}에 참여`);
    return room.noteData;
  }

  // 방 나가기
  leaveRoom(roomCode, userId) {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.users = room.users.filter(id => id !== userId);
      console.log(`📝 [RealtimeNote] 사용자 ${userId}가 방 ${roomCode}에서 나감`);
      
      // 방에 아무도 없으면 삭제
      if (room.users.length === 0) {
        this.rooms.delete(roomCode);
        console.log(`📝 [RealtimeNote] 빈 방 ${roomCode} 삭제됨`);
      }
    }
  }

  // 노트 데이터 업데이트 (실시간 동기화)
  updateNote(roomCode, noteData, userId) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new Error('방을 찾을 수 없습니다.');
    }

    // 노트 데이터 업데이트
    room.noteData = { ...room.noteData, ...noteData };

    // 다른 사용자들에게 변경사항 전파
    this.broadcastToRoom(roomCode, {
      type: 'NOTE_UPDATE',
      data: noteData,
      userId: userId,
      timestamp: new Date(),
    }, userId);

    console.log(`📝 [RealtimeNote] 노트 업데이트: 방 ${roomCode}, 사용자 ${userId}`);
  }

  // 방의 모든 사용자에게 메시지 전파
  broadcastToRoom(roomCode, message, excludeUserId = null) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.users.forEach(userId => {
      if (userId !== excludeUserId) {
        const listener = this.listeners.get(userId);
        if (listener) {
          listener(message);
        }
      }
    });
  }

  // 실시간 업데이트 리스너 등록
  onUpdate(userId, callback) {
    this.listeners.set(userId, callback);
    console.log(`📝 [RealtimeNote] 리스너 등록: ${userId}`);
  }

  // 리스너 제거
  removeListener(userId) {
    this.listeners.delete(userId);
    console.log(`📝 [RealtimeNote] 리스너 제거: ${userId}`);
  }

  // 방 정보 조회
  getRoomInfo(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return null;
    }

    return {
      roomCode,
      userCount: room.users.length,
      users: room.users,
      createdAt: room.createdAt,
    };
  }

  // 음성 채팅 상태 업데이트
  updateVoiceStatus(roomCode, userId, isActive) {
    this.broadcastToRoom(roomCode, {
      type: 'VOICE_STATUS_UPDATE',
      userId: userId,
      isActive: isActive,
      timestamp: new Date(),
    }, userId);

    console.log(`🎤 [RealtimeNote] 음성 상태 업데이트: ${userId} - ${isActive ? '활성' : '비활성'}`);
  }

  // 그리기 이벤트 전파
  broadcastDrawing(roomCode, drawingData, userId) {
    this.broadcastToRoom(roomCode, {
      type: 'DRAWING_UPDATE',
      data: drawingData,
      userId: userId,
      timestamp: new Date(),
    }, userId);
  }
}

// 싱글톤 인스턴스
const realtimeNoteService = new RealtimeNoteService();

export default realtimeNoteService;
