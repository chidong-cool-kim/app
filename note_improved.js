import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  PanResponder,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userDataService from './userDataService';
import OrientationGuard from './components/OrientationGuard';
import { getScreenInfo, responsive } from './utils/responsive';
import Svg, { G, Path } from 'react-native-svg';
import Slider from '@react-native-community/slider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const NoteImproved = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [layers, setLayers] = useState([
    { id: 1, name: '레이어 1', visible: true, locked: false, paths: [] }
  ]);
  const [currentLayerId, setCurrentLayerId] = useState(1);
  const [currentPath, setCurrentPath] = useState('');
  const [screenInfo, setScreenInfo] = useState(getScreenInfo());
  const [noteTitle, setNoteTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // 라우트 파라미터에서 노트 정보 가져오기
  const noteId = route.params?.noteId;
  const initialTitle = route.params?.noteTitle || '새 노트';
  const [loadingNote, setLoadingNote] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [showBrushSizeModal, setShowBrushSizeModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [noteName, setNoteName] = useState('');
  const [notes, setNotes] = useState([]);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [translateY, setTranslateY] = useState(0);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [currentTool, setCurrentTool] = useState('pen'); // 연필 제거, 펜이 기본값
  const [currentColor, setCurrentColor] = useState('#000000');
  const [opacity, setOpacity] = useState(1);
  const [eraserSize, setEraserSize] = useState(20);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [toolbarX, setToolbarX] = useState(20);
  const [toolbarY, setToolbarY] = useState(100);
  const [newComment, setNewComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
  // 필압 관련 상태
  const [recentPressures, setRecentPressures] = useState([]);
  
  // Refs
  const pathRef = useRef('');
  const pathPointsRef = useRef([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0, time: 0 });
  const scaleRef = useRef(1);
  const translateXRef = useRef(0);
  const translateYRef = useRef(0);

  // 향상된 속도 기반 필압 계산 (만년필용)
  const calculateVelocityPressure = (currentX, currentY, currentTime) => {
    const dx = currentX - lastPointRef.current.x;
    const dy = currentY - lastPointRef.current.y;
    const dt = Math.max(currentTime - lastPointRef.current.time, 1);
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = distance / dt;
    
    // 향상된 속도 처리 - 더 자연스러운 필압 변화
    const minSpeed = 0;
    const maxSpeed = 3; // 범위 확대
    const normalizedSpeed = Math.min(Math.max(speed, minSpeed), maxSpeed) / maxSpeed;
    
    // 비선형 필압 변화 - 느린 속도에서 더 민감하게
    const pressureCurve = Math.pow(1 - normalizedSpeed, 1.5);
    const pressure = 0.2 + (pressureCurve * 0.8); // 0.2~1.0 범위
    
    return Math.max(0.2, Math.min(1.0, pressure));
  };
  
  // 필압 스무딩 함수
  const smoothPressure = (currentPressure) => {
    if (recentPressures.length === 0) return currentPressure;
    
    // 최근 3개 포인트의 평균 계산
    const recent = recentPressures.slice(-3);
    const avgPressure = recent.reduce((sum, p) => sum + p, 0) / recent.length;
    
    // 가중 평균으로 스무딩
    const smoothed = currentPressure * 0.7 + avgPressure * 0.3;
    
    // 최근 필압 배열 업데이트
    setRecentPressures(prev => {
      const updated = [...prev, currentPressure];
      return updated.length > 5 ? updated.slice(-5) : updated;
    });
    
    return smoothed;
  };

  // 화면 좌표를 캔버스 좌표로 변환
  const screenToCanvas = (x, y) => {
    return {
      x: (x - translateXRef.current) / scaleRef.current,
      y: (y - translateYRef.current) / scaleRef.current,
    };
  };

  // 터치 시작
  const handleTouchStart = (evt) => {
    const { touches } = evt.nativeEvent;
    if (touches.length !== 1) return;

    const { locationX, locationY, force, majorAxisLength, timestamp } = evt.nativeEvent;
    const canvasCoords = screenToCanvas(locationX, locationY);
    const currentTime = timestamp || Date.now();

    isDrawingRef.current = true;
    pathPointsRef.current = [{ ...canvasCoords }];
    
    let pressure = 1;
    if (currentTool === 'pen') {
      if (force !== undefined && force > 0) {
        pressure = Math.min(Math.max(force, 0.1), 1);
      } else if (majorAxisLength !== undefined && majorAxisLength > 0) {
        pressure = Math.min(Math.max(majorAxisLength / 20, 0.3), 1);
      } else {
        pressure = 0.7;
      }
    } else if (currentTool === 'fountain') {
      pressure = 0.8; // 만년필 시작 필압
    }

    pathRef.current = `M${canvasCoords.x.toFixed(2)},${canvasCoords.y.toFixed(2)}`;
    setCurrentPath(pathRef.current);

    lastPointRef.current = {
      x: canvasCoords.x,
      y: canvasCoords.y,
      time: currentTime
    };
  };

  // 터치 이동
  const handleTouchMove = (evt) => {
    const { touches } = evt.nativeEvent;
    
    if (!isDrawingRef.current || touches.length !== 1) return;

    const { locationX, locationY, force, majorAxisLength, timestamp } = evt.nativeEvent;
    const canvasCoords = screenToCanvas(locationX, locationY);
    const currentTime = timestamp || Date.now();
    
    let pressure = 1;
    let newPath = '';
    
    if (currentTool === 'fountain') {
      // 만년필: 향상된 속도 기반 필압
      const velocityPressure = calculateVelocityPressure(
        canvasCoords.x, 
        canvasCoords.y, 
        currentTime
      );
      
      // 필압 스무딩 적용
      pressure = smoothPressure(velocityPressure);
      
      newPath = `${pathRef.current} L${canvasCoords.x.toFixed(2)},${canvasCoords.y.toFixed(2)}`;
      
      // 속도 계산을 위한 이전 좌표 업데이트
      lastPointRef.current = {
        x: canvasCoords.x,
        y: canvasCoords.y,
        time: currentTime
      };
    } else if (currentTool === 'pen') {
      // 펜: 하드웨어 필압
      if (force !== undefined && force > 0) {
        pressure = Math.min(Math.max(force, 0.1), 1);
      } else if (majorAxisLength !== undefined && majorAxisLength > 0) {
        pressure = Math.min(Math.max(majorAxisLength / 20, 0.3), 1);
      } else {
        pressure = 0.7;
      }
      newPath = `${pathRef.current} L${canvasCoords.x.toFixed(2)},${canvasCoords.y.toFixed(2)}`;
    } else {
      // 지우개: 일정한 굵기
      newPath = `${pathRef.current} L${canvasCoords.x.toFixed(2)},${canvasCoords.y.toFixed(2)}`;
    }
    
    pathRef.current = newPath;
    setCurrentPath(newPath);
    
    pathPointsRef.current.push({
      x: canvasCoords.x,
      y: canvasCoords.y,
      pressure: pressure
    });
  };

  // 터치 종료
  const handleTouchEnd = () => {
    if (!isDrawingRef.current) return;
    
    isDrawingRef.current = false;
    
    if (pathRef.current) {
      const pathData = {
        d: pathRef.current,
        stroke: currentColor,
        strokeWidth: isEraser ? eraserSize : brushSize,
        fill: 'none',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        width: isEraser ? eraserSize : brushSize,
        opacity: opacity,
        isEraser: isEraser,
        tool: currentTool
      };
      
      setLayers(prevLayers =>
        prevLayers.map(layer =>
          layer.id === currentLayerId
            ? { ...layer, paths: [...layer.paths, pathData] }
            : layer
        )
      );
    }
    
    pathRef.current = '';
    setCurrentPath('');
    pathPointsRef.current = [];
    setRecentPressures([]); // 필압 히스토리 초기화
  };

  // 팬 응답자 설정
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: handleTouchStart,
    onPanResponderMove: handleTouchMove,
    onPanResponderRelease: handleTouchEnd,
  });

  // 도구 모음 렌더링
  const renderToolbar = () => (
    <View style={[styles.toolbar, { left: toolbarX, top: toolbarY }]}>
      <View style={styles.dragHandle} />
      
      {/* 펜 도구 */}
      <TouchableOpacity 
        style={[styles.tool, currentTool === 'pen' && styles.toolActive]} 
        onPress={() => {setCurrentTool('pen'); setIsEraser(false);}}
      >
        <Text style={styles.toolIcon}>🖋️</Text>
        <Text style={styles.toolLabel}>펜</Text>
      </TouchableOpacity>
      
      {/* 만년필 도구 */}
      <TouchableOpacity 
        style={[styles.tool, currentTool === 'fountain' && styles.toolActive]} 
        onPress={() => {setCurrentTool('fountain'); setIsEraser(false);}}
      >
        <Text style={styles.toolIcon}>🖊️</Text>
        <Text style={styles.toolLabel}>만년필</Text>
      </TouchableOpacity>
      
      {/* 지우개 도구 */}
      <TouchableOpacity 
        style={[styles.tool, currentTool === 'eraser' && styles.toolActive]} 
        onPress={() => {setCurrentTool('eraser'); setIsEraser(true);}}
      >
        <Text style={styles.toolIcon}>🧽</Text>
        <Text style={styles.toolLabel}>지우개</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <OrientationGuard allowPortrait={false}>
      <SafeAreaView style={styles.container}>
        {/* 캔버스 영역 */}
        <View style={styles.canvasContainer} {...panResponder.panHandlers}>
          <Svg width="100%" height="100%" style={styles.canvas}>
            <G transform={`translate(${translateX}, ${translateY}) scale(${scale})`}>
              {layers.map(layer => 
                layer.visible && layer.paths.map((path, index) => (
                  <Path
                    key={`${layer.id}-${index}`}
                    d={path.d}
                    stroke={path.stroke}
                    strokeWidth={path.width}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={path.opacity}
                  />
                ))
              )}
              {currentPath && (
                <Path
                  d={currentPath}
                  stroke={currentColor}
                  strokeWidth={isEraser ? eraserSize : brushSize}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={opacity}
                />
              )}
            </G>
          </Svg>
        </View>

        {/* 도구 모음 */}
        {renderToolbar()}

        {/* 상단 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.title}>향상된 노트</Text>
          <TouchableOpacity onPress={() => setShowSaveModal(true)}>
            <Text style={styles.saveButton}>저장</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </OrientationGuard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 60,
  },
  canvas: {
    flex: 1,
  },
  toolbar: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  dragHandle: {
    width: 30,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  tool: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
    minWidth: 60,
  },
  toolActive: {
    backgroundColor: '#007AFF20',
  },
  toolIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  toolLabel: {
    fontSize: 12,
    color: '#333',
  },
});

export default NoteImproved;
