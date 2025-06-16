import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/controls/OrbitControls.js';
import TWEEN from '@tweenjs/tween.js'; // 修正匯入方式：將 TWEEN 作為預設匯出

// 場景、攝影機、渲染器等核心變數
let scene, camera, renderer, controls;
// 光線投射器與滑鼠向量
let raycaster = new THREE.Raycaster();
let pointer = new THREE.Vector2();

// 用於追蹤當前懸停和已選中的物件
let currentHoveredObject = null; // 追蹤當前滑鼠懸停的建築物
let selectedObject = null; // 儲存當前被點擊的建築物 (儲存 Group 物件)

// 可互動的建築物網格列表 (儲存 Group 物件)
let interactiveBuildings = [];

// DOM 元素引用
const loadingDiv = document.getElementById('loading');
const buildingInfoPanel = document.getElementById('buildingInfoPanel');
const buildingName = document.getElementById('buildingName');
const buildingFeature = document.getElementById('buildingFeature');
const buildingList = document.getElementById('buildingList');
const backToDefaultViewBtn = document.getElementById('backToDefaultViewBtn');
const transitionOverlay = document.getElementById('transitionOverlay'); // 遮罩元素引用

// 預設攝影機視角參數 (校門口上方視角)
// 這些值需要根據您的實際模型校門口位置進行調整。
// 這裡假設校門口在 Z 軸正方向，略微偏上。
// 校門口 (building_gate) 的位置可能需要根據實際模型中心點和校門口位置來設定。
// 這裡假設校門口 Group 的中心點大致在 (0, 0, 0) 附近，且在 Z 軸正方向。
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 30, 150); // 校門口上方位置 (X, Y, Z)
const DEFAULT_CAMERA_LOOKAT = new THREE.Vector3(0, 10, 0); // 看向校園中心略高的位置

// 模擬建築物資訊
// cameraOffset 定義從建築物中心到攝影機的向量，用於微調視角
const BUILDING_DATA = {
    // 既有建築物資訊
    'building_student_center': {
        name: '學生活動中心',
        description: '學生活動中心是學生日常活動、社團聚會和舉辦各類活動的重要場所。內部設有商店、餐廳、會議室等設施，為學生提供便利的生活機能與交流空間。',
        cameraOffset: new THREE.Vector3(0, 15, 60)
    },
    'building_library': {
        name: '圖書館',
        description: '中興大學圖書館藏書豐富，提供多樣化的學術資源和研究空間。是學生學習、研究和獲取知識的核心場所，設有閱覽室、討論區和電腦設備。',
        cameraOffset: new THREE.Vector3(40, 15, 0)
    },
    'building_main_building': {
        name: '行政大樓',
        description: '行政大樓是學校行政運作的核心，包含校長室、教務處、學務處等重要行政單位。其建築風格莊嚴，見證了學校的發展歷史，是師生辦理各項事務的主要地點。',
        cameraOffset: new THREE.Vector3(-40, 15, 0)
    },
    'building_research_building': {
        name: '綜合教學大樓',
        description: '綜合教學大樓提供了現代化的教學設施和實驗室，是多個學系的共用教學空間。設計注重採光和通風，為師生創造了舒適的學習環境。',
        cameraOffset: new THREE.Vector3(0, 15, -60)
    },
    'building_gym': {
        name: '體育館',
        description: '體育館是學校重要的運動設施，包含室內籃球場、羽球場及健身房等。除了日常體育課程，也常舉辦各類校內外體育賽事，是學生鍛鍊身體、參與體育活動的中心。',
        cameraOffset: new THREE.Vector3(-30, 15, -30)
    },
    // 新增建築物資訊 (根據您的要求和常見的命名習慣推測 building_ 前綴)
    'building_humanities_building': { // 人文大樓
        name: '人文大樓',
        description: '人文大樓是人文社會科學院的所在地，提供文學、歷史、哲學等學科的教學與研究空間。',
        cameraOffset: new THREE.Vector3(20, 15, 30) // 假設在某個方向，可調整
    },
    'building_gate': { // 校門口
        name: '校門口',
        description: '國立中興大學的主要入口，具有代表性的校園地標。',
        cameraOffset: new THREE.Vector3(0, 10, 50) // 攝影機置於校門口正前方，稍微遠一點
    },
    'building_crop_science_building': { // 作物科學大樓
        name: '作物科學大樓',
        description: '作物科學大樓是農學院的重點建築，致力於作物育種、栽培技術及農業生物科技的研究與教學。',
        cameraOffset: new THREE.Vector3(-25, 15, 25)
    },
    'building_yunping_building': { // 雲平樓
        name: '雲平樓',
        description: '雲平樓是一棟多功能大樓，提供行政辦公、會議及部分研究室空間。',
        cameraOffset: new THREE.Vector3(0, 18, -45) // 假設位置
    },
    'building_skating_rink': { // 溜冰場
        name: '溜冰場',
        description: '校園內的休閒娛樂設施，提供學生和教職員進行溜冰活動的場所。',
        cameraOffset: new THREE.Vector3(15, 8, -15) // 較低矮，攝影機也低一點
    },
    'building_greenhouse': { // 溫室
        name: '溫室',
        description: '用於植物研究和教學的實驗溫室，栽培多種植物供學術探索。',
        cameraOffset: new THREE.Vector3(-10, 10, -20)
    },
    'building_wannian_building': { // 萬年樓
        name: '萬年樓',
        description: '萬年樓是校園內歷史悠久的建築之一，承載著豐富的校園記憶與學術發展。',
        cameraOffset: new THREE.Vector3(30, 15, -10)
    },
    'building_agri_env_building': { // 農環大樓 (農業環境大樓)
        name: '農環大樓',
        description: '農環大樓專注於農業與環境科學領域的研究，探討永續農業發展與環境保護議題。',
        cameraOffset: new THREE.Vector3(-15, 20, 0) // 可能較高，攝影機抬高
    },
    'building_incubation_center': { // 興創基地
        name: '興創基地',
        description: '提供創新創業團隊的孵化空間與資源，是學生實現創業夢想的平台。',
        cameraOffset: new THREE.Vector3(-35, 10, 10)
    },
    'building_guard_room': { // 警衛室
        name: '警衛室',
        description: '校園安全與門禁管理的重要站點，負責維護校園秩序。',
        cameraOffset: new THREE.Vector3(5, 5, 20) // 較小建築，拉近
    },
    'building_social_cultural_building': { // 社館大樓 (社團活動館)
        name: '社館大樓',
        description: '社館大樓是各類學生社團的活動中心，提供排練、會議和交流的空間。',
        cameraOffset: new THREE.Vector3(10, 15, -20)
    },
    'building_basketball_court': { // 籃球場
        name: '籃球場',
        description: '戶外運動場所，提供學生進行籃球活動及體育鍛鍊的空間。',
        cameraOffset: new THREE.Vector3(0, 10, -30) // 較空曠區域，攝影機低一點
    }
};


init(); // 初始化 Three.js 場景
animate(); // 啟動動畫渲染迴圈

/**
 * 初始化 Three.js 場景、攝影機、渲染器和控制器。
 */
function init() {
    // 場景設定
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xddeeff); // 設置一個柔和的藍色背景

    // 攝影機設定: 視野角度(FOV), 長寬比(Aspect Ratio), 近截面(Near), 遠截面(Far)
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    // 設置攝影機初始位置為預設俯瞰視角 (校門口上方)
    camera.position.copy(DEFAULT_CAMERA_POSITION);
    camera.lookAt(DEFAULT_CAMERA_LOOKAT); // 攝影機看向模型中心

    // 渲染器設定: 啟用抗鋸齒
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight); // 設定渲染器尺寸
    renderer.setPixelRatio(window.devicePixelRatio); // 設定設備像素比，讓渲染更清晰
    document.body.appendChild(renderer.domElement); // 將渲染器的 DOM 元素添加到網頁中

    // OrbitControls 設置: 啟用阻尼效果，提供更平滑的控制體驗
    controls = new OrbitControls(camera, renderer.domElement);

    controls.enableDamping = true; // 啟用阻尼（慣性）
    controls.dampingFactor = 0.05; // 阻尼係數
    controls.minDistance = 10; // 攝影機最近距離
    controls.maxDistance = 500; // 攝影機最遠距離
    controls.target.copy(DEFAULT_CAMERA_LOOKAT); // 初始化控制器目標


    // 環境光: 提供整體照明，使模型不會完全黑暗 (來自隊友的程式碼)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444)); // 半球光，模擬天空和地面光

    // 平行光: 模擬太陽光，提供方向性照明和陰影 (來自隊友的程式碼)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(30, 100, 40); // 光源位置
    scene.add(dirLight);

    // 地板: 從隊友的程式碼中加入
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 200),
        new THREE.MeshStandardMaterial({ color: 0x999999 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);


    // GLTF 模型載入器
    const loader = new GLTFLoader();

    // 載入模型
    // 根據您提供的截圖，模型檔案位於 'model' 資料夾內，而 'model' 資料夾與 'js' 資料夾同級。
    // 所以從 'main.js' (位於 'js/' ) 存取模型需要 '../model/NCHU_model.glb'。
    loader.load(
        '../model/NCHU_model.glb', // 模型檔案路徑修正
        (gltf) => {
            const model = gltf.scene; // 取得模型場景
            scene.add(model); // 將載入的模型添加到場景中
            console.log('模型載入成功！');
            console.log('模型中所有名稱以 "building_" 開頭的可互動物件:');

            // 遍歷模型中的所有物件，找出可互動的建築物 Group
            model.traverse(child => {
                // 檢查是否為 Group 類型且名稱以 'building_' 開頭
                if (child.type === 'Group' && child.name.startsWith('building_')) {
                    interactiveBuildings.push(child); // 將符合條件的 Group 添加到互動列表中
                    console.log('    - 識別為互動建築物 Group:', child.name); // 輸出被識別為互動建築物的名稱
                    addBuildingButton(child); // 為每個建築物添加按鈕到右側選單
                }
                // 忽略模型中非建築物的網格 (例如：樹木、地面、路燈等)，它們不應觸發任何互動效果。
            });
            console.log('可互動建築物列表 (Group):', interactiveBuildings.map(b => b.name));

            // 模型載入完成，隱藏載入提示
            loadingDiv.style.display = 'none';
        },
        (xhr) => {
            // 載入進度更新
            let percent = (xhr.loaded / xhr.total * 100).toFixed(0);
            loadingDiv.textContent = `載入中... ${percent}%`;
        },
        (err) => {
            // 模型載入錯誤處理
            console.error('模型載入錯誤:', err);
            loadingDiv.textContent = '模型載入失敗，請檢查檔案。';
        }
    );

    // 事件監聽器
    window.addEventListener('pointermove', onPointerMove); // 滑鼠移動事件
    window.addEventListener('click', onClick); // 滑鼠點擊事件
    window.addEventListener('resize', onWindowResize); // 視窗大小改變事件
    backToDefaultViewBtn.addEventListener('click', backToDefaultView); // 返回按鈕點擊事件
}

/**
 * 為每個可互動建築物創建按鈕並添加到右側選單。
 * @param {THREE.Group} obj - 建築物 Group 物件。
 */
function addBuildingButton(obj) {
    const buildingInfo = BUILDING_DATA[obj.name];
    if (buildingInfo) { // 確保有對應的建築物資訊
        const btn = document.createElement('button');
        // 移除 building_ 前綴，並使用 BUILDING_DATA 中的中文名稱
        btn.textContent = buildingInfo.name;
        btn.addEventListener('click', () => {
            console.log(`點擊右側選單按鈕: ${obj.name}`);
            focusOnObject(obj); // 點擊按鈕聚焦到建築物
            selectedObject = obj; // 設定為已選中
            showBuildingInfo(obj); // 顯示建築物資訊
        });
        buildingList.appendChild(btn);
        console.log(`按鈕已為 ${buildingInfo.name} 添加。`); // 診斷用
    } else {
        // 如果 BUILDING_DATA 中沒有該建築物的資訊，仍創建按鈕，但名稱只移除 building_
        const btn = document.createElement('button');
        btn.textContent = obj.name.replace('building_', ''); // 移除 building_ 前綴顯示
        btn.addEventListener('click', () => {
            console.log(`點擊右側選單按鈕 (無詳細資訊): ${obj.name}`);
            focusOnObject(obj);
            selectedObject = obj;
            showBuildingInfo(obj); // 仍嘗試顯示資訊，會顯示預設文字
        });
        buildingList.appendChild(btn);
        console.warn(`未能在 BUILDING_DATA 中找到物件 ${obj.name} 的資訊。`);
    }
}

/**
 * 聚焦到指定的 3D 物件 (Group)，並平滑移動攝影機。
 * @param {THREE.Object3D} object - 要聚焦的 3D 物件 (通常是 Group)。
 */
function focusOnObject(object) {
    console.log('聚焦到物件:', object.name);
    // 禁用 OrbitControls，避免動畫期間使用者操作
    controls.enabled = false;
    transitionOverlay.style.pointerEvents = 'auto'; // 啟用遮罩阻擋互動

    // 計算物件的中心點 (用於 lookAt 和計算攝影機位置)
    const bbox = new THREE.Box3().setFromObject(object);
    const objectCenter = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3()); // 取得包圍盒尺寸

    // -- 動態攝影機位置計算邏輯 --
    // 從場景原點 (0,0,0) 到建築物中心點的向量，用於確定「方向」
    const vectorFromOriginToBuilding = objectCenter.clone().normalize();

    // 根據建築物最大維度計算期望的攝影機距離，確保建築物全景可見
    const maxDim = Math.max(size.x, size.y, size.z);
    // 調整這個係數來控制放大時離建築物的距離，越大則越遠。
    const desiredDistance = maxDim * 2.5; 

    // 計算攝影機的高度偏移，使其可以較好地看到整個建築物
    const cameraHeightOffset = size.y * 0.7; 

    // 計算攝影機的目標位置：
    // 建築物中心 + (從原點到建築物方向 * 期望距離) + 垂直偏移
    let targetCameraPosition = objectCenter.clone()
        .add(vectorFromOriginToBuilding.multiplyScalar(desiredDistance))
        .add(new THREE.Vector3(0, cameraHeightOffset, 0)); // 在Y軸上增加高度偏移

    // 如果 BUILDING_DATA 中有指定 cameraOffset，則優先使用其定義的偏移
    const buildingInfo = BUILDING_DATA[object.name];
    if (buildingInfo && buildingInfo.cameraOffset) {
        targetCameraPosition = objectCenter.clone().add(buildingInfo.cameraOffset);
    }

    // 將動畫拆分為兩部分：
    // 1. 遮罩淡入 (變暗)
    // 2. 攝影機移動 + 遮罩淡出 (變亮)
    const fadeDuration = 150; // 淡入淡出動畫時間縮短 (毫秒)
    const cameraMoveDuration = 700; // 攝影機移動動畫時間縮短 (毫秒)
    const maxOverlayOpacity = 0.7; // 遮罩最大透明度 (調整為更淺的黑，避免完全黑屏)

    // 第一階段：遮罩淡入 (變暗)
    new TWEEN.Tween({ opacity: 0 })
        .to({ opacity: maxOverlayOpacity }, fadeDuration)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate((obj) => {
            transitionOverlay.style.opacity = obj.opacity;
        })
        .onComplete(() => {
            // 當遮罩達到最大透明度時，開始攝影機移動和遮罩淡出
            // 攝影機移動
            new TWEEN.Tween(camera.position)
                .to(targetCameraPosition, cameraMoveDuration)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(() => {
                    camera.lookAt(objectCenter);
                    controls.target.copy(objectCenter);
                })
                .start();

            // 遮罩淡出 (與攝影機移動同時進行)
            new TWEEN.Tween({ opacity: maxOverlayOpacity })
                .to({ opacity: 0 }, fadeDuration)
                .easing(TWEEN.Easing.Quadratic.In)
                // 延遲時間縮短，讓淡出更快開始 (使淡出與攝影機移動更同步)
                .delay(cameraMoveDuration - fadeDuration - 100) // 稍微提前淡出，以避免黑屏延遲
                .onUpdate((obj) => {
                    transitionOverlay.style.opacity = obj.opacity;
                })
                .onComplete(() => {
                    // 所有動畫完成後
                    controls.enabled = true;
                    controls.target.copy(objectCenter);
                    controls.update();
                    backToDefaultViewBtn.style.display = 'block';
                    transitionOverlay.style.pointerEvents = 'none'; // 恢復遮罩點擊穿透
                    console.log('攝影機動畫完成，OrbitControls 已重新啟用。');
                })
                .start();
        })
        .start();

    // 顯示建築物資訊面板
    showBuildingInfo(object);
}

/**
 * 將攝影機平滑移動回預設視角。
 */
function backToDefaultView() {
    console.log('點擊返回全景按鈕。');
    // 禁用 OrbitControls
    controls.enabled = false;
    transitionOverlay.style.pointerEvents = 'auto'; // 啟用遮罩阻擋互動

    const fadeDuration = 150; // 淡入淡出動畫時間縮短 (毫秒)
    const cameraMoveDuration = 1000; // 攝影機移動動畫時間 (毫秒)
    const maxOverlayOpacity = 0.7; // 遮罩最大透明度 (調整為更淺的黑)

    // 第一階段：遮罩淡入 (變暗)
    new TWEEN.Tween({ opacity: 0 })
        .to({ opacity: maxOverlayOpacity }, fadeDuration)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate((obj) => {
            transitionOverlay.style.opacity = obj.opacity;
        })
        .onComplete(() => {
            // 當遮罩達到最大透明度時，開始攝影機移動和遮罩淡出
            // 攝影機移動
            new TWEEN.Tween(camera.position)
                .to(DEFAULT_CAMERA_POSITION, cameraMoveDuration)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(() => {
                    camera.lookAt(DEFAULT_CAMERA_LOOKAT);
                    controls.target.copy(DEFAULT_CAMERA_LOOKAT);
                })
                .start();

            // 遮罩淡出 (與攝影機移動同時進行)
            new TWEEN.Tween({ opacity: maxOverlayOpacity })
                .to({ opacity: 0 }, fadeDuration)
                .easing(TWEEN.Easing.Quadratic.In)
                .delay(cameraMoveDuration - fadeDuration - 100) // 延遲，使其在攝影機移動快結束時開始淡出
                .onUpdate((obj) => {
                    transitionOverlay.style.opacity = obj.opacity;
                })
                .onComplete(() => {
                    // 所有動畫完成後
                    controls.enabled = true;
                    controls.target.copy(DEFAULT_CAMERA_LOOKAT);
                    controls.update();
                    backToDefaultViewBtn.style.display = 'none';
                    buildingInfoPanel.style.display = 'none';
                    selectedObject = null; // 清除已選中物件，允許再次懸停和點擊
                    document.body.classList.remove('custom-cursor');
                    document.body.style.cursor = 'default';
                    transitionOverlay.style.pointerEvents = 'none'; // 恢復遮罩點擊穿透
                    console.log('返回預設視角動畫完成。');
                })
                .start();
        })
        .start();

    // 隱藏建築物說明欄 (在遮罩開始變暗前先隱藏，讓過渡更自然)
    buildingInfoPanel.style.display = 'none';
}

/**
 * 處理滑鼠移動事件，用於顯示滑鼠游標為手型。
 * @param {MouseEvent} event - 滑鼠事件物件。
 */
function onPointerMove(event) {
    // 將滑鼠座標轉換為標準化設備座標 (NDC)
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 更新 Raycaster
    raycaster.setFromCamera(pointer, camera);

    // 檢測光線與互動建築物列表的交集 (遞歸檢查 Group 內的 Mesh)
    const intersects = raycaster.intersectObjects(interactiveBuildings, true);

    let foundHoveredGroup = null;
    if (intersects.length > 0) {
        // 找到最近的交集物件，並向上遍歷其父級，直到找到 `interactiveBuildings` 中的 Group 物件
        let currentObject = intersects[0].object;
        while (currentObject) {
            if (interactiveBuildings.includes(currentObject)) {
                foundHoveredGroup = currentObject;
                break;
            }
            currentObject = currentObject.parent;
        }
    }

    // 處理懸停效果的邏輯
    // 無論是否有選中物件，只要懸停在可互動建築物上，游標就變成手型
    if (foundHoveredGroup) {
        document.body.style.cursor = 'pointer'; // 游標變為手型
    } else {
        document.body.style.cursor = 'default'; // 游標恢復預設
    }
}

/**
 * 處理滑鼠點擊事件，用於選中建築物。
 */
function onClick() {
    raycaster.setFromCamera(pointer, camera);
    // 遞歸檢查所有互動建築物 Group 及其子物件
    const intersects = raycaster.intersectObjects(interactiveBuildings, true);
    console.log('點擊事件觸發。');

    if (intersects.length > 0) {
        // 找到最近的交集物件，並向上遍歷其父級，直到找到 `interactiveBuildings` 中的 Group 物件
        let clickedGroup = null;
        let currentObject = intersects[0].object;
        while (currentObject) {
            if (interactiveBuildings.includes(currentObject)) {
                clickedGroup = currentObject;
                break;
            }
            currentObject = currentObject.parent;
        }

        if (clickedGroup) { // 如果找到了可互動的 Group
            selectedObject = clickedGroup; // 設定已選中物件
            console.log('點擊的物件 Group:', clickedGroup.name);

            // 點擊後，確保游標恢復預設 (因為已經進入選中狀態，此時游標應恢復預設)
            document.body.style.cursor = 'default';

            // 聚焦到被點擊的建築物 Group
            focusOnObject(clickedGroup);
            // 顯示建築物資訊
            showBuildingInfo(clickedGroup);
        } else {
            console.log('點擊到非可互動物件的子元素。');
        }
    } else {
        console.log('未點擊到任何互動建築物。');
    }
}

/**
 * 顯示建築物資訊面板。
 * @param {THREE.Object3D} object - 被點擊的建築物 Group 物件。
 */
function showBuildingInfo(object) {
    const buildingInfo = BUILDING_DATA[object.name];
    console.log('--- showBuildingInfo 函數被呼叫 ---');
    console.log('被點擊物件的名稱 (object.name):', object.name);
    console.log('在 BUILDING_DATA 中找到的資訊 (buildingInfo):', buildingInfo);

    if (buildingInfo) {
        buildingName.textContent = buildingInfo.name; // 建築物名稱 (已移除 building_ 前綴)
        buildingFeature.textContent = buildingInfo.description; // 建築物特色描述
        buildingInfoPanel.style.display = 'block'; // 顯示資訊面板
        console.log('資訊面板內容已設定，display 設定為:', buildingInfoPanel.style.display);
    } else {
        // 如果沒有找到對應資訊，顯示預設文字，並移除 building_ 前綴
        buildingName.textContent = object.name.replace('building_', '');
        buildingFeature.textContent = '此建築物尚無詳細描述。';
        buildingInfoPanel.style.display = 'block';
        console.warn('BUILDING_DATA 中未找到該物件的資訊。資訊面板內容已設定預設值，display 設定為:', buildingInfoPanel.style.display);
    }
    // 再次檢查最終的 display 屬性
    console.log('資訊面板最終的 display 屬性:', getComputedStyle(buildingInfoPanel).display);
}

/**
 * 主動畫迴圈。
 */
function animate() {
    requestAnimationFrame(animate); // 循環呼叫 animate 函數

    TWEEN.update(); // 更新 Tween.js 的動畫進度

    controls.update(); // 更新 OrbitControls
    renderer.render(scene, camera); // 渲染場景
}

/**
 * 處理視窗大小改變事件，調整攝影機和渲染器尺寸。
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight; // 更新攝影機長寬比
    camera.updateProjectionMatrix(); // 更新攝影機投影矩陣
    renderer.setSize(window.innerWidth, window.innerHeight); // 更新渲染器尺寸
}
