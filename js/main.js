import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let raycaster = new THREE.Raycaster();
let pointer = new THREE.Vector2();
let INTERSECTED;
let chineseNamed = [];
let rotatingTarget = null;
let rotateSpeed = 0.01;
let animationRequest = null;

const loadingDiv = document.getElementById('loading');
const infoCard = document.getElementById('infoCard');
const cardTitle = document.getElementById('cardTitle');
const cardContent = document.getElementById('cardContent');
const buildingList = document.getElementById('buildingList');

init();
animate();

function init() {
    // 基本場景設定
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 50, 100);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const ambient = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambient);

    const loader = new GLTFLoader();

    loader.load(
        '../model/NCHU_model.glb',
        (gltf) => {
            scene.add(gltf.scene);

            // 找出中文命名物件
            gltf.scene.traverse(child => {
                if (child.isMesh && /[\u4e00-\u9fa5]/.test(child.name)) {
                    chineseNamed.push(child);
                    addBuildingButton(child);
                }
            });

            loadingDiv.style.display = 'none';
        },
        (xhr) => {
            let percent = (xhr.loaded / xhr.total * 100).toFixed(0);
            loadingDiv.textContent = `載入中... ${percent}%`;
        },
        (err) => {
            console.error('模型載入錯誤:', err);
        }
    );

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('click', onClick);
    window.addEventListener('resize', onWindowResize);
}

function addBuildingButton(obj) {
    const btn = document.createElement('button');
    btn.textContent = obj.name;
    btn.addEventListener('click', () => focusOnObject(obj));
    buildingList.appendChild(btn);
}

function focusOnObject(object) {
    const targetPos = new THREE.Vector3();
    object.getWorldPosition(targetPos);

    // 計算鏡頭的新位置（稍微往上與後方）
    const newPos = targetPos.clone().add(new THREE.Vector3(0, 20, 40));

    // 動畫過渡
    const duration = 1000;
    const startPos = camera.position.clone();
    const startTime = performance.now();

    function animateCam(time) {
        const elapsed = time - startTime;
        const t = Math.min(elapsed / duration, 1);
        camera.position.lerpVectors(startPos, newPos, t);
        controls.target.lerpVectors(controls.target.clone(), targetPos, t);
        controls.update();

        if (t < 1) { requestAnimationFrame(animateCam); }
    } requestAnimationFrame(animateCam);
} function
    onPointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1; pointer.y = -(event.clientY /
        window.innerHeight) * 2 + 1;
} function onClick() {
    raycaster.setFromCamera(pointer, camera); const
        intersects = raycaster.intersectObjects(chineseNamed, true); if (intersects.length > 0) {
            const target = intersects[0].object;
            rotatingTarget = target;

            cardTitle.textContent = target.name;
            cardContent.textContent = generateInfoText(target.name);
            infoCard.style.display = 'block';
        }
}

function generateInfoText(name) {
    return `這是${name}，它具有獨特的建築風格。\n同時也是校園中的重要地標之一。`;
}

function animate() {
    requestAnimationFrame(animate);

    if (rotatingTarget) {
        const pos = new THREE.Vector3();
        rotatingTarget.getWorldPosition(pos);

        const radius = 60;
        const time = Date.now() * 0.001;
        camera.position.x = pos.x + radius * Math.cos(time * rotateSpeed);
        camera.position.z = pos.z + radius * Math.sin(time * rotateSpeed);
        camera.lookAt(pos);
    }

    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}