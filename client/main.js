/*
 * Entry point for the STRATUS client. This file sets up the Three.js
 * renderer, defines a few photorealistic‑inspired scenes and a simple
 * flight model, and wires keyboard controls to fly an airplane through
 * the world. It uses plain JavaScript so that it can run directly in
 * the browser without a build step. Three.js is bundled locally in
 * `vendor/three.module.js` to avoid external dependencies.
 */

// Import Three.js from a CDN (unpkg) to avoid bundling vendor files in the
// repository.  If you wish to pin a specific version, update the version
// number in the URL below.
import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';

// Definitions for each of the photorealistic scenes. Colours and
// lighting values were chosen to loosely evoke the mood described in
// the project brief. Additional assets (heightmaps, textures) can
// replace the simple colours here without changing the core logic.
// Scene definitions describing the mood and appearance of each environment.  In
// addition to the original colour values, each scene now points to a
// corresponding ground texture.  These textures live in the `assets`
// subdirectory and were generated to loosely match the descriptions in
// the project brief (sand dunes, rocky alpine terrain with snow patches and
// grass, and a coastal beach with water foam).  When loaded, the textures
// are tiled across the vast ground plane to give the impression of an
// expansive environment without incurring a heavy memory cost.
const SCENES = [
  {
    id: 'coast',
    name: 'Côte luminescente',
    skyColor: 0x92aee0,
    fogColor: 0x88a8c0,
    groundColor: 0x47677c,
    ambient: 0x445570,
    directional: 0xffdcb2,
    groundTexture: 'assets/coast.png',
  },
  {
    id: 'alps',
    name: 'Alpes d’ardoise',
    skyColor: 0xa9cce3,
    fogColor: 0xcfd7e5,
    groundColor: 0x6d7a8a,
    ambient: 0x586273,
    directional: 0xeef5ff,
    groundTexture: 'assets/alps.png',
  },
  {
    id: 'desert',
    name: 'Désert mirage',
    skyColor: 0xf1c27d,
    fogColor: 0xe4b481,
    groundColor: 0xd5a86d,
    ambient: 0x8d6e4a,
    directional: 0xfff1c2,
    groundTexture: 'assets/desert.png',
  },
];

// Utility to clamp a value between min and max.
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Class representing the player controlled airplane. It holds
// references to the Three.js group that makes up the model and
// maintains state for control inputs and velocity. A simple physics
// update integrates orientation and position over time based on
// throttle, pitch and roll inputs.
class Airplane {
  constructor() {
    this.group = new THREE.Group();
    this.throttle = 0.3;
    this.pitchInput = 0;
    this.rollInput = 0;
    this.velocity = 0;
    this.buildModel();
  }
  // Build a very simple low‑poly airplane from boxes.
  buildModel() {
    const fuselage = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.3, roughness: 0.6 }),
    );
    fuselage.castShadow = true;
    fuselage.receiveShadow = true;
    this.group.add(fuselage);
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.1, 4),
      new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.2, roughness: 0.7 }),
    );
    wing.position.set(-0.5, 0, 0);
    wing.castShadow = true;
    wing.receiveShadow = true;
    this.group.add(wing);
    const wing2 = wing.clone();
    wing2.position.set(0.5, 0, 0);
    this.group.add(wing2);
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.1, 1),
      new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.2, roughness: 0.7 }),
    );
    tail.position.set(1.5, 0.2, 0);
    tail.castShadow = true;
    this.group.add(tail);
    // Start slightly above ground
    this.group.position.set(0, 5, 0);
  }
  // Update physics for the airplane.
  update(delta) {
    this.pitchInput = clamp(this.pitchInput, -1, 1);
    this.rollInput = clamp(this.rollInput, -1, 1);
    const maxPitchAngle = THREE.MathUtils.degToRad(30);
    const maxRollAngle = THREE.MathUtils.degToRad(75);
    const pitchRate = THREE.MathUtils.degToRad(30);
    const rollRate = THREE.MathUtils.degToRad(60);
    this.group.rotation.x += this.pitchInput * pitchRate * delta;
    this.group.rotation.z += this.rollInput * rollRate * delta;
    this.group.rotation.x = clamp(this.group.rotation.x, -maxPitchAngle, maxPitchAngle);
    this.group.rotation.z = clamp(this.group.rotation.z, -maxRollAngle, maxRollAngle);
    const minSpeed = 20;
    const maxSpeed = 150;
    this.velocity = THREE.MathUtils.lerp(minSpeed, maxSpeed, this.throttle);
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.group.quaternion);
    forward.normalize();
    const displacement = forward.multiplyScalar(this.velocity * delta);
    this.group.position.add(displacement);
    if (this.group.position.y < 2) {
      this.group.position.y = 2;
    }
  }
}

// Global variables
let renderer;
let camera;
let scene;
let player;
let clock;

// Update HUD overlay
function updateHUD() {
  const hud = document.getElementById('hud');
  if (!hud || !player) return;
  const altitude = player.group.position.y.toFixed(1);
  const speed = player.velocity.toFixed(1);
  const throttle = (player.throttle * 100).toFixed(0);
  hud.innerHTML = `Altitude: ${altitude} m | Speed: ${speed} m/s | Throttle: ${throttle}%`;
}

// Shared texture loader used to fetch images for ground materials.  It is
// initialised once and reused each time a new scene is constructed.  The
// loader will resolve relative URLs based on the location of the running
// script, so `assets/...` paths point into the `client/assets` directory
// when served via Render.
const textureLoader = new THREE.TextureLoader();

// Build scene from definition.  This function resets the global `scene`
// object and constructs lights, fog, ground and the player airplane.  When
// a ground texture is specified on the scene definition it will be loaded
// asynchronously and applied to the ground material.  Until the texture
// finishes loading the ground will display a fallback solid colour defined
// by `groundColor`.
function buildScene(def) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(def.skyColor);
  scene.fog = new THREE.Fog(new THREE.Color(def.fogColor), 200, 15000);
  const ambient = new THREE.AmbientLight(def.ambient, 0.6);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(def.directional, 1.0);
  dirLight.position.set(-1, 1.5, 1);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 5000;
  scene.add(dirLight);
  const groundGeo = new THREE.PlaneGeometry(50000, 50000, 1, 1);
  const groundMat = new THREE.MeshStandardMaterial({
    color: def.groundColor,
    metalness: 0.0,
    roughness: 1.0,
  });
  // If a texture is provided for this scene, load it and assign to the
  // material.  Repeat the texture many times over the large plane to
  // create the illusion of an expansive surface.  We wrap both S and T
  // coordinates and adjust the repeat to a high value so details are
  // visible even at altitude.
  if (def.groundTexture) {
    textureLoader.load(def.groundTexture, (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      // Tiling factor chosen empirically; adjust for desired density
      tex.repeat.set(500, 500);
      groundMat.map = tex;
      groundMat.needsUpdate = true;
    });
  }
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  player = new Airplane();
  scene.add(player.group);
}

// Initialise renderer and UI
function init() {
  const canvasContainer = document.getElementById('app');
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  canvasContainer.appendChild(renderer.domElement);
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 50000);
  const selector = document.getElementById('scene-select');
  SCENES.forEach((def) => {
    const option = document.createElement('option');
    option.value = def.id;
    option.textContent = def.name;
    selector.appendChild(option);
  });
  buildScene(SCENES[0]);
  selector.value = SCENES[0].id;
  selector.addEventListener('change', (ev) => {
    const selectedId = ev.target.value;
    const def = SCENES.find((s) => s.id === selectedId);
    if (def) buildScene(def);
  });
  window.addEventListener('keydown', (ev) => {
    switch (ev.key) {
      case 'ArrowUp':
        player.throttle = clamp(player.throttle + 0.05, 0, 1);
        break;
      case 'ArrowDown':
        player.throttle = clamp(player.throttle - 0.05, 0, 1);
        break;
      case 'w':
      case 'W':
        player.pitchInput = -1;
        break;
      case 's':
      case 'S':
        player.pitchInput = 1;
        break;
      case 'a':
      case 'A':
        player.rollInput = -1;
        break;
      case 'd':
      case 'D':
        player.rollInput = 1;
        break;
    }
  });
  window.addEventListener('keyup', (ev) => {
    switch (ev.key) {
      case 'w':
      case 'W':
      case 's':
      case 'S':
        player.pitchInput = 0;
        break;
      case 'a':
      case 'A':
      case 'd':
      case 'D':
        player.rollInput = 0;
        break;
    }
  });
  window.addEventListener('resize', onWindowResize);
  clock = new THREE.Clock();
  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  player.update(delta);
  const offset = new THREE.Vector3(0, 5, 15);
  offset.applyQuaternion(player.group.quaternion);
  camera.position.copy(player.group.position).add(offset);
  camera.lookAt(player.group.position);
  renderer.render(scene, camera);
  updateHUD();
}

window.addEventListener('DOMContentLoaded', init);