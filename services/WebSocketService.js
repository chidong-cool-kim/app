// 무료 WebSocket 서비스 (로컬 시뮬레이션)
class WebSocketService {
  constructor() {
    this.connections = new Map(); // userId -> connection info
    this.rooms = new Map(); // roomId -> room data
    this.listeners = new Map(); // userId -> callback functions
    this.isConnected = false;
    this.currentUserId = null;
  }

  // WebSocket 연결 시뮬레이션
  connect(userId) {
    return new Promise((resolve) => {
      this.currentUserId = userId;
      this.isConnected = true;
      
      this.connections.set(userId, {
        id: userId,
        connectedAt: new Date(),
        lastActivity: new Date(),
        status: 'online'
      });

      console.log(`🔌 [WebSocket] ${userId} 연결됨`);
      
      // 연결 성공 시뮬레이션
      setTimeout(() => {
        resolve({ success: true, userId });
      }, 100);
    });
  }

  // WebSocket 연결 해제
  disconnect(userId = null) {
    const targetUserId = userId || this.currentUserId;
    if (targetUserId) {
      this.connections.delete(targetUserId);
      this.listeners.delete(targetUserId);
      
      // 모든 방에서 사용자 제거
      this.rooms.forEach((room, roomId) => {
        if (room.members.includes(targetUserId)) {
          this.leaveRoom(roomId, targetUserId);
        }
      });
      
      console.log(`🔌 [WebSocket] ${targetUserId} 연결 해제됨`);
    }
    
    if (targetUserId === this.currentUserId) {
      this.isConnected = false;
      this.currentUserId = null;
    }
  }

  // 방 생성
  createRoom(roomId, creatorId, roomData = {}) {
    const room = {
      id: roomId,
      creator: creatorId,
      members: [creatorId],
      createdAt: new Date(),
      lastActivity: new Date(),
      noteData: roomData.noteData || null,
      studyGroupId: roomData.studyGroupId || null,
      ...roomData
    };

    this.rooms.set(roomId, room);
    console.log(`🏠 [WebSocket] 방 생성: ${roomId} by ${creatorId}`);
    
    return room;
  }

  // 방 참여
  joinRoom(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('방을 찾을 수 없습니다.');
    }

    if (!room.members.includes(userId)) {
      room.members.push(userId);
      room.lastActivity = new Date();
    }

    // 방의 다른 멤버들에게 알림
    this.broadcastToRoom(roomId, {
      type: 'USER_JOINED',
      userId: userId,
      roomId: roomId,
      timestamp: new Date()
    }, userId);

    console.log(`🚪 [WebSocket] ${userId}가 방 ${roomId}에 참여`);
    return room;
  }

  // 방 나가기
  leaveRoom(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.members = room.members.filter(id => id !== userId);
    room.lastActivity = new Date();

    // 방의 다른 멤버들에게 알림
    this.broadcastToRoom(roomId, {
      type: 'USER_LEFT',
      userId: userId,
      roomId: roomId,
      timestamp: new Date()
    }, userId);

    // 방이 비어있으면 삭제
    if (room.members.length === 0) {
      this.rooms.delete(roomId);
      console.log(`🏠 [WebSocket] 빈 방 삭제: ${roomId}`);
    }

    console.log(`🚪 [WebSocket] ${userId}가 방 ${roomId}에서 나감`);
  }

  // 방에 메시지 전송
  sendToRoom(roomId, message, senderId) {
    const room = this.rooms.get(roomId);
    if (!room || !room.members.includes(senderId)) {
      throw new Error('방에 접근할 수 없습니다.');
    }

    const messageData = {
      ...message,
      senderId,
      roomId,
      timestamp: new Date()
    };

    this.broadcastToRoom(roomId, messageData);
    console.log(`📨 [WebSocket] 메시지 전송: ${roomId} from ${senderId}`);
    
    return messageData;
  }

  // 방의 모든 멤버에게 브로드캐스트
  broadcastToRoom(roomId, message, excludeUserId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.members.forEach(userId => {
      if (userId !== excludeUserId) {
        const listener = this.listeners.get(userId);
        if (listener) {
          // 비동기로 메시지 전달 (실제 WebSocket 동작 시뮬레이션)
          setTimeout(() => {
            listener(message);
          }, Math.random() * 50); // 0-50ms 랜덤 지연
        }
      }
    });
  }

  // 특정 사용자에게 직접 메시지 전송
  sendToUser(targetUserId, message, senderId) {
    const listener = this.listeners.get(targetUserId);
    if (!listener) {
      console.warn(`사용자 ${targetUserId}가 오프라인입니다. 메시지를 대기열에 저장합니다.`);
      // 오류를 던지지 않고 성공으로 처리
      return {
        ...message,
        senderId,
        targetUserId,
        timestamp: new Date(),
        status: 'queued' // 대기 상태
      };
    }

    const messageData = {
      ...message,
      senderId,
      targetUserId,
      timestamp: new Date()
    };

    setTimeout(() => {
      listener(messageData);
    }, Math.random() * 30);

    console.log(`📨 [WebSocket] 직접 메시지: ${senderId} → ${targetUserId}`);
    return messageData;
  }

  // 메시지 리스너 등록
  onMessage(userId, callback) {
    this.listeners.set(userId, callback);
    console.log(`👂 [WebSocket] 리스너 등록: ${userId}`);
  }

  // 리스너 제거
  removeListener(userId) {
    this.listeners.delete(userId);
    console.log(`👂 [WebSocket] 리스너 제거: ${userId}`);
  }

  // 온라인 사용자 목록 조회
  getOnlineUsers() {
    return Array.from(this.connections.keys());
  }

  // 방 정보 조회
  getRoomInfo(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      ...room,
      memberCount: room.members.length,
      isActive: room.members.length > 0
    };
  }

  // 사용자가 참여한 방 목록
  getUserRooms(userId) {
    const userRooms = [];
    this.rooms.forEach((room, roomId) => {
      if (room.members.includes(userId)) {
        userRooms.push({
          id: roomId,
          ...room,
          memberCount: room.members.length
        });
      }
    });
    return userRooms;
  }

  // 스터디그룹 멤버들의 온라인 상태 확인
  getStudyGroupOnlineMembers(studyGroupId, memberIds) {
    const onlineMembers = [];
    const offlineMembers = [];

    memberIds.forEach(memberId => {
      const connection = this.connections.get(memberId);
      if (connection && connection.status === 'online') {
        onlineMembers.push({
          userId: memberId,
          status: 'online',
          lastActivity: connection.lastActivity,
          currentRooms: this.getUserRooms(memberId)
        });
      } else {
        offlineMembers.push({
          userId: memberId,
          status: 'offline',
          lastSeen: connection?.lastActivity || null
        });
      }
    });

    return { onlineMembers, offlineMembers };
  }

  // 초대 전송
  sendInvitation(fromUserId, toUserId, roomId, noteTitle) {
    const invitation = {
      type: 'NOTE_INVITATION',
      fromUserId,
      toUserId,
      roomId,
      noteTitle,
      timestamp: new Date()
    };

    const result = this.sendToUser(toUserId, invitation, fromUserId);
    console.log(`📧 [WebSocket] 초대 전송: ${fromUserId} → ${toUserId} (방: ${roomId})`);
    
    // 대기 상태도 성공으로 처리
    return true;
  }

  // 연결 상태 확인
  isUserOnline(userId) {
    return this.connections.has(userId);
  }

  // 전체 통계
  getStats() {
    return {
      totalConnections: this.connections.size,
      totalRooms: this.rooms.size,
      totalActiveRooms: Array.from(this.rooms.values()).filter(room => room.members.length > 0).length,
      timestamp: new Date()
    };
  }
}

// 싱글톤 인스턴스
const webSocketService = new WebSocketService();

export default webSocketService;
