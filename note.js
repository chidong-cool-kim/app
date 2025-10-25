import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { useResponsive } from './hooks/useResponsive';
import OrientationLock from './components/OrientationLock';
import { getScreenInfo, responsive } from './utils/responsive';
import Svg, { G, Path } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import AssetsEyes from './components/AssetsEyes';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const Note = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const responsiveUtil = useResponsive();
  const [layers, setLayers] = useState([
    { id: 1, name: '레이어 1', visible: true, locked: false, paths: [] }
  ]);
  const [currentLayerId, setCurrentLayerId] = useState(1);
  const [currentPath, setCurrentPath] = useState('');
  const [screenInfo, setScreenInfo] = useState(getScreenInfo());
  const [noteTitle, setNoteTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  const noteId = route.params?.noteId;
  const initialTitle = route.params?.noteTitle || '새 노트';
  const [loadingNote, setLoadingNote] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [showBrushSizeModal, setShowBrushSizeModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAssetsEyes, setShowAssetsEyes] = useState(false);
  const [noteName, setNoteName] = useState('');
  const [notes, setNotes] = useState([]);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [translateY, setTranslateY] = useState(0);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [currentTool, setCurrentTool] = useState('pen');
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
  const [selectedLayers, setSelectedLayers] = useState([]);
  
  const pathRef = useRef('');
  const pathPointsRef = useRef([]);
  const isDrawingRef = useRef(false);
  const scaleRef = useRef(1);
  const translateXRef = useRef(0);
  const translateYRef = useRef(0);
  const lastDistance = useRef(0);
  const lastScale = useRef(1);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const centerX = useRef(0);
  const centerY = useRef(0);
  const lastTimeRef = useRef(0);

  // 색상 배열을 2D 배열로 변경
  const colors = [
    ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF'],
    ['#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'],
    ['#FFC0CB', '#A52A2A', '#808080', '#FFD700', '#00CED1']
  ];

  const canvasWidth = screenWidth;
  const canvasHeight = screenHeight - 140;

  useEffect(() => {
    if (noteId) {
      loadExistingNote();
    } else {
      setNoteTitle(initialTitle);
    }
  }, [noteId, initialTitle]);

  const loadExistingNote = async () => {
    try {
      setLoadingNote(true);
      console.log('📖 [Note] 기존 노트 로드 시작:', noteId);
      
      const note = await userDataService.getNote(noteId);
      console.log('📖 [Note] 노트 데이터 수신:', note);
      
      setNoteTitle(note.title);
      setIsEditing(true);
      
      if (note.content) {
        try {
          const drawingData = JSON.parse(note.content);
          if (drawingData.type === 'drawing' && drawingData.layers) {
            console.log('[Note] 그림 데이터 로드:', drawingData.layers.length, '개 레이어');
            setLayers(drawingData.layers);
            if (drawingData.layers.length > 0) {
              setCurrentLayerId(drawingData.layers[0].id);
            }
          }
        } catch (parseError) {
          console.error('❌ [Note] 그림 데이터 파싱 실패:', parseError);
        }
      }
    } catch (error) {
      console.error('❌ [Note] 노트 로드 실패:', error);
      Alert.alert('오류', '노트를 불러오는데 실패했습니다.');
    } finally {
      setLoadingNote(false);
    }
  };

  const getDistance = (touches) => {
    const [touch1, touch2] = touches;
    const dx = touch1.pageX - touch2.pageX;
    const dy = touch1.pageY - touch2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getCenter = (touches) => {
    const [touch1, touch2] = touches;
    return {
      x: (touch1.pageX + touch2.pageX) / 2,
      y: (touch1.pageY + touch2.pageY) / 2,
    };
  };

  const screenToCanvas = (x, y) => {
    return {
      x: (x - translateXRef.current) / scaleRef.current,
      y: (y - translateYRef.current) / scaleRef.current,
    };
  };

  // 만년필용 속도 기반 필압 계산 (개선됨)
  const calculateFountainPressure = (points) => {
    if (points.length < 2) return 0.8;
    
    const lastPoint = points[points.length - 1];
    const prevPoint = points[points.length - 2];
    
    const dx = lastPoint.x - prevPoint.x;
    const dy = lastPoint.y - prevPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const dt = Math.max(lastPoint.time - prevPoint.time, 1);
    
    const speed = distance / dt;
    
    // 속도를 필압으로 변환
    // 느리면 두껍게 (1.0), 빠르면 가늘게 (0.4)
    const minSpeed = 0;
    const maxSpeed = 3;
    const normalizedSpeed = Math.min(Math.max(speed, minSpeed), maxSpeed) / maxSpeed;
    
    // 부드러운 전환을 위한 곡선 적용
    const pressure = 1.0 - (normalizedSpeed * 0.6);
    
    // 이전 필압과 블렌딩 (부드러운 전환)
    if (points.length > 2) {
      const prevPressure = prevPoint.pressure || 0.8;
      return prevPressure * 0.3 + pressure * 0.7;
    }
    
    return Math.max(0.4, Math.min(1.0, pressure));
  };

  const canvasPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => screenInfo.isPhone, // 모바일에서만 캡처 우선순위
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => screenInfo.isPhone, // 모바일에서만 캡처 우선순위

    onPanResponderGrant: (evt) => {
      const touches = evt.nativeEvent.touches;
      const currentLayer = layers.find(l => l.id === currentLayerId);
      
      if (currentLayer?.locked) {
        Alert.alert('알림', '레이어가 잠겨있습니다.');
        return;
      }
      
      if (touches.length === 2) {
        const distance = getDistance(touches);
        lastDistance.current = distance;
        lastScale.current = scaleRef.current;
        
        const center = getCenter(touches);
        centerX.current = center.x;
        centerY.current = center.y;
        lastX.current = center.x;
        lastY.current = center.y;
        return;
      }
      
      if (touches.length === 1) {
        const { locationX, locationY, force, majorAxisLength, timestamp } = evt.nativeEvent;
        const canvasCoords = screenToCanvas(locationX, locationY);
        const currentTime = timestamp || Date.now();
        
        lastTimeRef.current = currentTime;
        pathPointsRef.current = [{
          x: canvasCoords.x,
          y: canvasCoords.y,
          time: currentTime,
          pressure: 0.8
        }];
        
        const newPath = `M${canvasCoords.x.toFixed(2)},${canvasCoords.y.toFixed(2)}`;
        pathRef.current = newPath;
        setCurrentPath(newPath);
        isDrawingRef.current = true;
      }
    },

    onPanResponderMove: (evt) => {
      const touches = evt.nativeEvent.touches;
      
      if (touches.length === 2) {
        const distance = getDistance(touches);
        const center = getCenter(touches);
        
        const newScale = Math.max(0.5, Math.min(5, lastScale.current * (distance / lastDistance.current)));
        const scaleChange = newScale / scaleRef.current;
        
        const focusX = centerX.current;
        const focusY = centerY.current;
        
        const newTranslateX = focusX - (focusX - translateXRef.current) * scaleChange;
        const newTranslateY = focusY - (focusY - translateYRef.current) * scaleChange;
        
        const dx = center.x - lastX.current;
        const dy = center.y - lastY.current;
        
        scaleRef.current = newScale;
        translateXRef.current = newTranslateX + dx;
        translateYRef.current = newTranslateY + dy;
        
        setScale(newScale);
        setTranslateX(translateXRef.current);
        setTranslateY(translateYRef.current);
        
        lastX.current = center.x;
        lastY.current = center.y;
        return;
      }
      
      if (!isDrawingRef.current || touches.length !== 1) return;
      
      const { locationX, locationY, force, majorAxisLength, timestamp } = evt.nativeEvent;
      const canvasCoords = screenToCanvas(locationX, locationY);
      const currentTime = timestamp || Date.now();
      
      let pressure = 1;
      let strokeWidth = brushSize;
      
      if (currentTool === 'fountain') {
        // 만년필: 속도 기반 필압
        pathPointsRef.current.push({
          x: canvasCoords.x,
          y: canvasCoords.y,
          time: currentTime,
          pressure: 0.8
        });
        
        pressure = calculateFountainPressure(pathPointsRef.current);
        pathPointsRef.current[pathPointsRef.current.length - 1].pressure = pressure;
        strokeWidth = brushSize * pressure * 1.3;
        
      } else if (currentTool === 'pen') {
        // 펜: 하드웨어 필압
        if (force !== undefined && force > 0) {
          pressure = Math.min(Math.max(force, 0.1), 1);
        } else if (majorAxisLength !== undefined && majorAxisLength > 0) {
          pressure = Math.min(Math.max(majorAxisLength / 20, 0.3), 1);
        } else {
          pressure = 0.7;
        }
        strokeWidth = brushSize * pressure;
      }
      
      const newPath = `${pathRef.current} L${canvasCoords.x.toFixed(2)},${canvasCoords.y.toFixed(2)}`;
      pathRef.current = newPath;
      setCurrentPath(newPath);
    },

    onPanResponderRelease: () => {
      if (!isDrawingRef.current || !pathRef.current || pathRef.current.split(' ').length < 2) {
        isDrawingRef.current = false;
        setCurrentPath('');
        pathRef.current = '';
        pathPointsRef.current = [];
        return;
      }
      
      const newPathData = {
        path: pathRef.current,
        color: isEraser ? 'transparent' : currentColor,
        width: isEraser ? eraserSize : brushSize,
        opacity: opacity,
        isEraser: isEraser,
        tool: currentTool,
        points: currentTool === 'fountain' ? [...pathPointsRef.current] : undefined
      };
      
      setLayers(prevLayers =>
        prevLayers.map(layer =>
          layer.id === currentLayerId
            ? { ...layer, paths: [...layer.paths, newPathData] }
            : layer
        )
      );
      
      setCurrentPath('');
      pathRef.current = '';
      pathPointsRef.current = [];
      isDrawingRef.current = false;
    },

    onPanResponderTerminate: () => {
      setCurrentPath('');
      pathRef.current = '';
      pathPointsRef.current = [];
      isDrawingRef.current = false;
    }
  });

  const toolbarPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      setToolbarX(Math.max(0, Math.min(screenWidth - 60, toolbarX + gestureState.dx)));
      setToolbarY(Math.max(60, Math.min(screenHeight - 250, toolbarY + gestureState.dy)));
    },
  });

  const addLayer = () => {
    const newLayer = {
      id: Date.now(),
      name: `레이어 ${layers.length + 1}`,
      visible: true,
      locked: false,
      paths: []
    };
    setLayers([...layers, newLayer]);
    setCurrentLayerId(newLayer.id);
  };

  const deleteLayer = (id) => {
    if (layers.length === 1) {
      Alert.alert('알림', '마지막 레이어는 삭제할 수 없습니다.');
      return;
    }
    Alert.alert(
      '레이어 삭제',
      '이 레이어를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            const filtered = layers.filter(l => l.id !== id);
            setLayers(filtered);
            if (currentLayerId === id) {
              setCurrentLayerId(filtered[0].id);
            }
          }
        }
      ]
    );
  };

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setSelectedLayers([]);
  };

  const toggleLayerSelection = (layerId) => {
    if (selectedLayers.includes(layerId)) {
      setSelectedLayers(selectedLayers.filter(id => id !== layerId));
    } else {
      setSelectedLayers([...selectedLayers, layerId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLayers.length === layers.length) {
      setSelectedLayers([]);
    } else {
      setSelectedLayers(layers.map(layer => layer.id));
    }
  };

  const deleteSelectedLayers = () => {
    if (selectedLayers.length === 0) {
      Alert.alert('알림', '삭제할 레이어를 선택해주세요.');
      return;
    }

    if (layers.length - selectedLayers.length < 1) {
      Alert.alert('알림', '최소 하나의 레이어는 남겨두어야 합니다.');
      return;
    }

    Alert.alert(
      '레이어 삭제',
      `선택된 ${selectedLayers.length}개의 레이어를 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            const filtered = layers.filter(l => !selectedLayers.includes(l.id));
            setLayers(filtered);
            
            if (selectedLayers.includes(currentLayerId)) {
              setCurrentLayerId(filtered[0].id);
            }
            
            setSelectedLayers([]);
            setIsMultiSelectMode(false);
          }
        }
      ]
    );
  };

  const toggleLayerVisibility = (id) => {
    setLayers(layers.map(l =>
      l.id === id ? { ...l, visible: !l.visible } : l
    ));
  };

  const toggleLayerLock = (id) => {
    setLayers(layers.map(l =>
      l.id === id ? { ...l, locked: !l.locked } : l
    ));
  };

  const undo = () => {
    setLayers(prevLayers =>
      prevLayers.map(layer =>
        layer.id === currentLayerId && layer.paths.length > 0
          ? { ...layer, paths: layer.paths.slice(0, -1) }
          : layer
      )
    );
  };

  const resetZoom = () => {
    Alert.alert(
      '화면 초기화',
      '모든 내용을 지우고 화면을 초기화하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: () => {
            // 모든 레이어의 내용 지우기
            setLayers(layers.map(layer => ({
              ...layer,
              paths: []
            })));
            
            // 화면 줄과 위치 초기화
            scaleRef.current = 1;
            translateXRef.current = 0;
            translateYRef.current = 0;
            setScale(1);
            setTranslateX(0);
            setTranslateY(0);
            
            // 현재 그리고 있는 경로 초기화
            setCurrentPath('');
            pathRef.current = '';
            pathPointsRef.current = [];
          }
        }
      ]
    );
  };

  const saveNote = async () => {
    setIsSaving(true);
    try {
      console.log('💾 [Note] 저장 시작...');
      
      const drawingData = {
        layers: layers,
        type: 'drawing'
      };

      if (isEditing && noteId) {
        await userDataService.updateNote(noteId, noteTitle, JSON.stringify(drawingData));
        console.log('✅ [Note] 노트 수정 완료');
        
        Alert.alert(
          '저장 완료',
          '그림 노트가 성공적으로 수정되었습니다.',
          [
            {
              text: '확인',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Main' }],
                });
              }
            }
          ]
        );
      } else {
        const finalTitle = noteTitle || `그림 노트 ${new Date().toLocaleDateString('ko-KR')} ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
        
        await userDataService.addNote(finalTitle, JSON.stringify(drawingData));
        console.log('✅ [Note] 새 노트 저장 완료');
        
        Alert.alert(
          '저장 완료',
          '그림 노트가 성공적으로 저장되었습니다.',
          [
            {
              text: '확인',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Main' }],
                });
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ [Note] 저장 실패:', error);
      
      // 제한 도달 에러 처리
      if (error.limitReached) {
        const planName = error.currentPlan === 'free' ? '무료' : 
                        error.currentPlan === 'basic' ? '베이직' : '프리미엄';
        
        Alert.alert(
          '노트 개수 제한',
          `${error.message}\n\n현재 플랜: ${planName}\n\n더 많은 노트를 생성하려면 스토어에서 플랜을 업그레이드하세요.`,
          [
            { text: '취소', style: 'cancel' },
            { text: '스토어로 이동', onPress: () => navigation.navigate('Store') }
          ]
        );
      } else {
        Alert.alert('저장 실패', error.message || '노트 저장 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const currentSize = isEraser ? eraserSize : brushSize;
  const setCurrentSize = isEraser ? setEraserSize : setBrushSize;
  const minSize = isEraser ? 10 : 0.5;
  const maxSize = isEraser ? 50 : 20;

  const getResponsiveStyles = () => {
    if (screenInfo.isPhone) {
      return phoneStyles;
    }
    return {};
  };

  const responsiveStyles = getResponsiveStyles();

  // 반응형 스타일 적용
  const styles = useMemo(
    () => responsiveUtil.applyAll(baseStyles), 
    [responsiveUtil]
  );

  // 모바일에서는 그림 노트 차단
  if (screenInfo.isPhone) {
    return (
      <OrientationLock isNoteScreen={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backBtn}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>그림 노트</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.tabletOnlyContainer}>
            <Text style={styles.tabletOnlyIcon}>📱🚫</Text>
            <Text style={styles.tabletOnlyTitle}>태블릿 전용 기능</Text>
            <Text style={styles.tabletOnlyMessage}>
              그림 노트는 태블릿에서만{"\n"}
              사용 가능합니다.
            </Text>
            <Text style={styles.tabletOnlyHint}>
              글 노트는 모바일에서도{"\n"}
              사용하실 수 있습니다.
            </Text>
          </View>
        </View>
      </OrientationLock>
    );
  }

  return (
  <OrientationLock isNoteScreen={true}>
  <View style={[styles.container, responsiveStyles.container]}>
    <View style={[styles.statusBar, responsiveStyles.statusBar]} />
    <View style={[styles.header, responsiveStyles.header]}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={[styles.backBtn, responsiveStyles.backBtn]}>←</Text>
      </TouchableOpacity>
      <Text style={[styles.title, responsiveStyles.title]}>{noteTitle || '새 노트'}</Text>
      <TouchableOpacity onPress={saveNote} disabled={isSaving || loadingNote}>
        {isSaving ? (
          <ActivityIndicator size="small" color="#3B82F6" />
        ) : (
          <Text style={[styles.saveBtn, responsiveStyles.saveBtn]}>저장</Text>
        )}
      </TouchableOpacity>
    </View>

    <View style={styles.canvas} {...canvasPanResponder.panHandlers}>
      <Svg width={canvasWidth} height={canvasHeight}>
        <G scale={scale} translateX={translateX} translateY={translateY}>
          {layers.map(layer => (
            layer.visible && (
              <G key={layer.id}>
                {layer.paths.map((pathData, index) => (
                  <Path
                    key={`${layer.id}-${index}`}
                    d={pathData.path}
                    stroke={pathData.isEraser ? 'white' : pathData.color}
                    strokeWidth={pathData.width / scale}
                    opacity={pathData.opacity}
                    fill="transparent"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </G>
            )
          ))}
          
          {currentPath && (
            <Path
              d={currentPath}
              stroke={isEraser ? 'white' : currentColor}
              strokeWidth={(isEraser ? eraserSize : brushSize) / scale}
              opacity={opacity}
              fill="transparent"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </G>
      </Svg>
    </View>

    <View style={[styles.bottomControls, responsiveStyles.bottomControls]}>
      <View style={[styles.singleControlRow, responsiveStyles.singleControlRow]}>
        <View style={[styles.controlGroup, responsiveStyles.controlGroup]}>
          <Text style={[styles.controlLabel, responsiveStyles.controlLabel]}>{currentSize.toFixed(1)}px</Text>
          <TouchableOpacity onPress={() => setCurrentSize(Math.max(minSize, currentSize - 0.5))}>
            <View style={[styles.controlBtn, responsiveStyles.controlBtn]}>
              <Text style={[styles.controlBtnText, responsiveStyles.controlBtnText]}>−</Text>
            </View>
          </TouchableOpacity>
          <Slider
            style={[styles.halfSlider, responsiveStyles.halfSlider]}
            minimumValue={minSize}
            maximumValue={maxSize}
            value={currentSize}
            onValueChange={setCurrentSize}
            step={0.5}
            minimumTrackTintColor="#3B82F6"
            maximumTrackTintColor="#D1D5DB"
          />
          <TouchableOpacity onPress={() => setCurrentSize(Math.min(maxSize, currentSize + 0.5))}>
            <View style={[styles.controlBtn, responsiveStyles.controlBtn]}>
              <Text style={[styles.controlBtnText, responsiveStyles.controlBtnText]}>+</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.controlGroup, responsiveStyles.controlGroup]}>
          <Text style={[styles.controlLabel, responsiveStyles.controlLabel]}>{Math.round(opacity * 100)}%</Text>
          <TouchableOpacity onPress={() => setOpacity(Math.max(0, opacity - 0.1))}>
            <View style={[styles.controlBtn, responsiveStyles.controlBtn]}>
              <Text style={[styles.controlBtnText, responsiveStyles.controlBtnText]}>−</Text>
            </View>
          </TouchableOpacity>
          <Slider
            style={[styles.halfSlider, responsiveStyles.halfSlider]}
            minimumValue={0}
            maximumValue={1}
            value={opacity}
            onValueChange={setOpacity}
            step={0.01}
            minimumTrackTintColor="#000000"
            maximumTrackTintColor="#D1D5DB"
          />
          <TouchableOpacity onPress={() => setOpacity(Math.min(1, opacity + 0.1))}>
            <View style={[styles.controlBtn, responsiveStyles.controlBtn]}>
              <Text style={[styles.controlBtnText, responsiveStyles.controlBtnText]}>+</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.layerControlBtn, responsiveStyles.layerControlBtn]} 
          onPress={() => setShowLayerPanel(!showLayerPanel)}
        >
          <Image source={require('./assets/layer.png')} style={[styles.layerControlImage, responsiveStyles.layerControlImage]} />
        </TouchableOpacity>
      </View>
    </View>

    <View style={[styles.toolbar, responsiveStyles.toolbar, { left: toolbarX, top: toolbarY }]} {...toolbarPanResponder.panHandlers}>
      <View style={styles.dragHandle} />
      
      <TouchableOpacity 
        style={[styles.tool, responsiveStyles.tool, currentTool === 'pen' && styles.toolActive]} 
        onPress={() => {setCurrentTool('pen'); setIsEraser(false);}}
      >
        <Text style={[styles.toolIcon, responsiveStyles.toolIcon]}>🖋️</Text>
        <Text style={[styles.toolLabel, responsiveStyles.toolLabel]}>펜</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.tool, responsiveStyles.tool, currentTool === 'fountain' && styles.toolActive]} 
        onPress={() => {setCurrentTool('fountain'); setIsEraser(false);}}
      >
        <Text style={[styles.toolIcon, responsiveStyles.toolIcon]}>🖊️</Text>
        <Text style={[styles.toolLabel, responsiveStyles.toolLabel]}>만년필</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.tool, responsiveStyles.tool, currentTool === 'eraser' && styles.toolActive]} 
        onPress={() => {setCurrentTool('eraser'); setIsEraser(true);}}
      >
        <Image 
          source={require('./assets/erase.png')} 
          style={[styles.toolImage, responsiveStyles.toolImage]} 
        />
        <Text style={[styles.toolLabel, responsiveStyles.toolLabel]}>지우개</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={[styles.colorBtn, responsiveStyles.colorBtn, { backgroundColor: currentColor }]} onPress={() => setShowColorPicker(!showColorPicker)} />

      {showColorPicker && (
        <ScrollView style={[styles.colorPalette, responsiveStyles.colorPalette]} showsVerticalScrollIndicator={false}>
          {colors.map((colorRow, idx) => (
            <View key={idx} style={[styles.colorRow, responsiveStyles.colorRow]}>
              {colorRow.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorItem,
                    responsiveStyles.colorItem,
                    { backgroundColor: color },
                    currentColor === color && styles.colorActive,
                    color === '#FFFFFF' && styles.whiteColor
                  ]}
                  onPress={() => {
                    setCurrentColor(color);
                    setIsEraser(false);
                  }}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.divider} />

      <TouchableOpacity style={styles.tool} onPress={undo}>
        <Text style={styles.toolIcon}>↶</Text>
        <Text style={styles.toolLabel}>실행취소</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tool} onPress={resetZoom}>
        <Text style={styles.toolIcon}>↻</Text>
        <Text style={styles.toolLabel}>화면초기화</Text>
      </TouchableOpacity>
    </View>

    <Modal visible={showLayerPanel} transparent animationType="fade" onRequestClose={() => setShowLayerPanel(false)}>
      <TouchableOpacity style={styles.layerModalOverlay} activeOpacity={1} onPress={() => setShowLayerPanel(false)}>
        <View style={[styles.layerModal, responsiveStyles.layerModal]}>
          <View style={[styles.layerHeader, responsiveStyles.layerHeader]}>
            <Text style={[styles.layerTitle, responsiveStyles.layerTitle]}>레이어</Text>
            <View style={styles.layerHeaderButtons}>
              <TouchableOpacity 
                onPress={toggleMultiSelectMode} 
                style={[styles.multiSelectBtn, responsiveStyles.multiSelectBtn, isMultiSelectMode && styles.multiSelectBtnActive]}>
                <Text style={[
                  styles.multiSelectBtnText, 
                  responsiveStyles.multiSelectBtnText,
                  isMultiSelectMode && { color: '#FFF' }
                ]}>
                  {isMultiSelectMode ? '완료' : '선택'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addLayer} style={[styles.addLayerBtn, responsiveStyles.addLayerBtn]}>
                <Text style={[styles.addLayerText, responsiveStyles.addLayerText]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {isMultiSelectMode && (
            <View style={[styles.multiSelectControls, responsiveStyles.multiSelectControls]}>
              <TouchableOpacity onPress={toggleSelectAll} style={[styles.selectAllBtn, responsiveStyles.selectAllBtn]}>
                <Text style={[styles.selectAllText, responsiveStyles.selectAllText]}>
                  {selectedLayers.length === layers.length ? '전체 해제' : '전체 선택'}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.selectedCount, responsiveStyles.selectedCount]}>
                {selectedLayers.length}개 선택됨
              </Text>
              <TouchableOpacity 
                onPress={deleteSelectedLayers} 
                style={[styles.deleteSelectedBtn, responsiveStyles.deleteSelectedBtn]}
                disabled={selectedLayers.length === 0}
              >
                <Text style={[styles.deleteSelectedText, responsiveStyles.deleteSelectedText]}>삭제</Text>
              </TouchableOpacity>
            </View>
          )}
          <ScrollView style={styles.layerScrollView} showsVerticalScrollIndicator={false}>
            {layers.map((layer, index) => (
              <View
                key={layer.id}
                style={[
                  styles.layerItem, 
                  responsiveStyles.layerItem, 
                  currentLayerId === layer.id && styles.layerActive,
                  selectedLayers.includes(layer.id) && styles.layerSelected
                ]}
              >
                <View style={styles.layerContent}>
                  {isMultiSelectMode && (
                    <TouchableOpacity
                      style={[styles.layerCheckbox, responsiveStyles.layerCheckbox]}
                      onPress={() => toggleLayerSelection(layer.id)}
                    >
                      <Text style={[styles.checkboxIcon, responsiveStyles.checkboxIcon]}>
                        {selectedLayers.includes(layer.id) ? '☑️' : '☐'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.layerMainArea, responsiveStyles.layerMainArea]}
                    onPress={() => isMultiSelectMode ? toggleLayerSelection(layer.id) : setCurrentLayerId(layer.id)}
                  >
                    <Text style={[styles.layerName, responsiveStyles.layerName]}>{layer.name}</Text>
                    <Text style={[styles.layerDetails, responsiveStyles.layerDetails]}>{layer.paths.length}개</Text>
                  </TouchableOpacity>
                </View>
                
                {!isMultiSelectMode && (
                  <View style={[styles.layerActions, responsiveStyles.layerActions]}>
                    <TouchableOpacity 
                      onPress={() => toggleLayerVisibility(layer.id)}
                      style={[styles.layerActionBtn, responsiveStyles.layerActionBtn]}
                    >
                      <Image 
                        source={layer.visible ? require('./assets/eyesopen.png') : require('./assets/eyesclose.png')} 
                        style={{ width: 28, height: 28 }} 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => toggleLayerLock(layer.id)}
                      style={[styles.layerActionBtn, responsiveStyles.layerActionBtn]}
                    >
                      <Text style={styles.layerActionIcon}>{layer.locked ? '🔒' : '🔓'}</Text>
                    </TouchableOpacity>
                    
                    {layers.length > 1 && (
                      <TouchableOpacity 
                        onPress={() => deleteLayer(layer.id)}
                        style={[styles.layerActionBtn, responsiveStyles.layerActionBtn]}
                      >
                        <Text style={styles.layerActionIcon}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  </View>
  </OrientationLock>
  );
};

const baseStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  statusBar: { height: 25, backgroundColor: '#FFF' },
  header: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { fontSize: 24, color: '#000' },
  title: { fontSize: 18, fontWeight: '600', color: '#000' },
  saveBtn: { fontSize: 16, color: '#3B82F6', fontWeight: '600' },
  canvas: { flex: 1, backgroundColor: '#FFF' },
  bottomControls: { backgroundColor: '#F8F9FA', paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  singleControlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  controlGroup: { flexDirection: 'row', alignItems: 'center', flex: 1, marginHorizontal: 8 },
  controlLabel: { fontSize: 13, fontWeight: '600', color: '#374151', width: 45, textAlign: 'center' },
  controlBtn: { width: 28, height: 28, backgroundColor: '#FFF', borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D5DB', marginHorizontal: 4 },
  controlBtnText: { fontSize: 16, color: '#374151', fontWeight: '600' },
  halfSlider: { flex: 1, marginHorizontal: 8, height: 40 },
  layerControlBtn: { marginLeft: 12, alignItems: 'center', justifyContent: 'center', width: 40, height: 40 },
  layerControlImage: { width: 40, height: 40, resizeMode: 'contain' },
  toolbar: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 12, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  dragHandle: { width: 32, height: 4, backgroundColor: '#D0D0D0', borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  tool: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginVertical: 2 },
  toolActive: { backgroundColor: '#E3F2FD' },
  toolIcon: { fontSize: 20 },
  toolImage: { width: 32, height: 32, resizeMode: 'contain' },
  toolLabel: { fontSize: 8, color: '#666', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 8 },
  colorBtn: { width: 36, height: 36, borderRadius: 18, alignSelf: 'center', borderWidth: 2, borderColor: '#E0E0E0' },
  colorPalette: { maxHeight: 200, backgroundColor: '#F8F8F8', borderRadius: 8, padding: 8, marginVertical: 4 },
  colorRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  colorItem: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  colorActive: { borderColor: '#3B82F6', borderWidth: 2 },
  whiteColor: { borderColor: '#D0D0D0' },
  layerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  layerModal: { 
    position: 'absolute', 
    bottom: 80, 
    right: 20, 
    width: 240, 
    height: 350, 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  layerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  layerTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  layerHeaderButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  multiSelectBtn: { backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', justifyContent: 'center' },
  multiSelectBtnActive: { backgroundColor: '#3B82F6' },
  multiSelectBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  multiSelectControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 4, backgroundColor: '#F9FAFB', borderRadius: 6, marginBottom: 8 },
  selectAllBtn: { backgroundColor: '#E5E7EB', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  selectAllText: { fontSize: 11, color: '#374151', fontWeight: '500' },
  selectedCount: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  deleteSelectedBtn: { backgroundColor: '#EF4444', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  deleteSelectedText: { fontSize: 11, color: '#FFF', fontWeight: '600' },
  addLayerBtn: { backgroundColor: '#3B82F6', borderRadius: 6, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  addLayerText: { fontSize: 16, color: '#FFF', fontWeight: '600' },
  layerScrollView: { flex: 1 },
  layerItem: { backgroundColor: '#F8F9FA', borderRadius: 6, marginBottom: 6, borderWidth: 1, borderColor: 'transparent', overflow: 'hidden' },
  layerActive: { backgroundColor: '#EBF4FF', borderColor: '#3B82F6' },
  layerSelected: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  layerContent: { flexDirection: 'row', alignItems: 'center' },
  layerCheckbox: { paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  checkboxIcon: { fontSize: 16 },
  layerMainArea: { flex: 1, padding: 6 },
  layerName: { fontSize: 13, fontWeight: '600', color: '#000', marginBottom: 1 },
  layerDetails: { fontSize: 10, color: '#6B7280' },
  layerActions: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 3, paddingVertical: 3, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  layerActionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, borderRadius: 4, marginHorizontal: 1 },
  layerActionIcon: { fontSize: 14 },
  tabletOnlyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  tabletOnlyIcon: { fontSize: 80, marginBottom: 20 },
  tabletOnlyTitle: { fontSize: 24, fontWeight: '700', color: '#000', marginBottom: 12, textAlign: 'center' },
  tabletOnlyMessage: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  tabletOnlyHint: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
});

const phoneStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    fontSize: 20,
    color: '#000',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  saveBtn: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  bottomControls: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  singleControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    width: 35,
    textAlign: 'center',
  },
  controlBtn: {
    width: 24,
    height: 24,
    backgroundColor: '#FFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginHorizontal: 3,
  },
  controlBtnText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  halfSlider: {
    flex: 1,
    marginHorizontal: 6,
    height: 30,
  },
  layerControlBtn: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  layerControlImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  toolbar: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 10,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tool: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    marginVertical: 1,
  },
  toolIcon: {
    fontSize: 16,
  },
  toolImage: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  toolLabel: {
    fontSize: 7,
    color: '#666',
    marginTop: 1,
  },
  colorBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  colorPalette: {
    maxHeight: 160,
    backgroundColor: '#F8F8F8',
    borderRadius: 6,
    padding: 6,
    marginVertical: 3,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  colorItem: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  layerModal: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -140,
    marginLeft: -100,
    width: 200,
    height: 280,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  layerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  layerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  layerHeaderButtons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  multiSelectBtn: { backgroundColor: '#F3F4F6', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3, alignItems: 'center', justifyContent: 'center' },
  multiSelectBtnActive: { backgroundColor: '#3B82F6' },
  multiSelectBtnText: { fontSize: 10, color: '#374151', fontWeight: '600' },
  multiSelectControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 3, backgroundColor: '#F9FAFB', borderRadius: 5, marginBottom: 6 },
  selectAllBtn: { backgroundColor: '#E5E7EB', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 2 },
  selectAllText: { fontSize: 9, color: '#374151', fontWeight: '500' },
  selectedCount: { fontSize: 9, color: '#6B7280', fontWeight: '500' },
  deleteSelectedBtn: { backgroundColor: '#EF4444', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 2 },
  deleteSelectedText: { fontSize: 9, color: '#FFF', fontWeight: '600' },
  addLayerBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 5,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLayerText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  layerItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 5,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  layerSelected: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  layerContent: { flexDirection: 'row', alignItems: 'center' },
  layerCheckbox: { paddingHorizontal: 6, paddingVertical: 4, alignItems: 'center', justifyContent: 'center' },
  checkboxIcon: { fontSize: 14 },
  layerMainArea: {
    flex: 1,
    padding: 5,
  },
  layerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    marginBottom: 1,
  },
  layerDetails: {
    fontSize: 9,
    color: '#6B7280',
  },
  layerActions: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  layerActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    borderRadius: 3,
    marginHorizontal: 1,
  },
});

export default Note;