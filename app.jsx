import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { WebsimSocket, useQuery } from "@websim/use-query";
import confetti from "canvas-confetti";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
const room = new WebsimSocket();
const ROUND_DURATION = 60 * 1e3;
const INTERMISSION_DURATION = 15 * 1e3;
const MAX_PIMPLES = 15;
const MAX_INGROWN_HAIRS = 8;
const PULL_THRESHOLD = 80;
function App() {
  const [roomState, setRoomState] = useState(room.roomState);
  const [peers, setPeers] = useState(room.peers);
  const [clientId, setClientId] = useState(room.clientId);
  const [isHost, setIsHost] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  useEffect(() => {
    const init = async () => {
      await room.initialize();
      setClientId(room.clientId);
      const creator = await window.websim.getCreator();
      setIsHost(Object.keys(room.peers).length === 1 || room.clientId === creator.id);
      room.subscribeRoomState(setRoomState);
      room.subscribePresence((updatedPeers) => {
        setPeers(new Map(Object.entries(updatedPeers)));
      });
      if (Object.keys(room.roomState).length === 0 && isHost) {
        room.updateRoomState({
          gameState: "intermission",
          intermissionEndTime: Date.now() + 5e3,
          // 5s initial countdown
          pimples: {},
          ingrownHairs: {},
          scores: {}
        });
      }
    };
    init();
  }, []);
  useEffect(() => {
    if (!isHost) return;
    const loop = setInterval(() => {
      const now = Date.now();
      if (room.roomState.gameState === "playing" && now > room.roomState.roundEndTime) {
        endRound();
      } else if (room.roomState.gameState === "intermission" && now > room.roomState.intermissionEndTime) {
        startNewRound();
      } else if (room.roomState.gameState === "playing") {
        if (Object.keys(room.roomState.pimples || {}).length < MAX_PIMPLES && Math.random() < 0.1) {
          spawnPimple();
        }
        if (Object.keys(room.roomState.ingrownHairs || {}).length < MAX_INGROWN_HAIRS && Math.random() < 0.05) {
          spawnIngrownHair();
        }
      }
    }, 500);
    return () => clearInterval(loop);
  }, [isHost, roomState]);
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (roomState.gameState === "playing") {
        setTimeRemaining(Math.max(0, Math.round((roomState.roundEndTime - now) / 1e3)));
      } else if (roomState.gameState === "intermission") {
        setTimeRemaining(Math.max(0, Math.round((roomState.intermissionEndTime - now) / 1e3)));
      }
    }, 1e3);
    return () => clearInterval(timer);
  }, [roomState]);
  const startNewRound = () => {
    const newPimples = {};
    const newHairs = {};
    for (let i = 0; i < 5; i++) {
      const p = createNewPimple();
      newPimples[p.id] = p;
    }
    for (let i = 0; i < 2; i++) {
      const h = createNewIngrownHair();
      newHairs[h.id] = h;
    }
    room.updateRoomState({
      gameState: "playing",
      roundEndTime: Date.now() + ROUND_DURATION,
      pimples: newPimples,
      ingrownHairs: newHairs,
      scores: {},
      winner: null,
      winnerScore: null,
      winnerUsername: null
    });
  };
  const endRound = async () => {
    const scores = room.roomState.scores || {};
    let winnerId = null;
    let winnerScore = -1;
    for (const [id, score] of Object.entries(scores)) {
      if (score > winnerScore) {
        winnerScore = score;
        winnerId = id;
      }
    }
    let winnerUsername = "No one";
    if (winnerId) {
      winnerUsername = room.peers[winnerId]?.username || "A player";
      const user = room.peers[winnerId];
      if (user) {
        const existingWins = await room.collection("leaderboard").filter({ user_id: user.id }).getList();
        const currentWins = existingWins.length > 0 ? existingWins[0].wins : 0;
        await room.collection("leaderboard").upsert({
          id: user.id,
          user_id: user.id,
          wins: currentWins + 1
        });
      }
    }
    room.updateRoomState({
      gameState: "intermission",
      intermissionEndTime: Date.now() + INTERMISSION_DURATION,
      pimples: {},
      ingrownHairs: {},
      winner: winnerId,
      winnerScore,
      winnerUsername
    });
  };
  const { data: leaderboardData, loading: leaderboardLoading } = useQuery(room.query(`
        SELECT l.user_id, l.wins, u.username, u.avatar_url
        FROM public.leaderboard l
        JOIN public.user u ON l.user_id = u.id
        ORDER BY l.wins DESC
        LIMIT 10
    `));
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("h1", { children: "Pimple Popper 3D: Multiplayer Mayhem" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 166,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { id: "game-info", children: [
      roomState.gameState === "playing" && `Time: ${timeRemaining}s`,
      roomState.gameState === "intermission" && `Next Round: ${timeRemaining}s`,
      roomState.gameState !== "playing" && roomState.gameState !== "intermission" && "Waiting for game to start..."
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 167,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { id: "game-container", children: [
      /* @__PURE__ */ jsxDEV(PlayerList, { peers, scores: roomState.scores || {} }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 173,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(PimplePopperGame, { roomState }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 174,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(Leaderboard, { leaderboardData, loading: leaderboardLoading }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 175,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 172,
      columnNumber: 14
    }, this),
    /* @__PURE__ */ jsxDEV("div", { id: "instructions", children: "Click pimples to pop them. Click and drag to pull out ingrown hairs!" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 177,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 165,
    columnNumber: 9
  }, this);
}
function PlayerList({ peers, scores }) {
  const sortedPeers = Object.values(peers).sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  return /* @__PURE__ */ jsxDEV("div", { className: "sidebar player-list", children: [
    /* @__PURE__ */ jsxDEV("h2", { children: "Players" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 187,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("ul", { children: sortedPeers.map((peer) => /* @__PURE__ */ jsxDEV("li", { children: [
      /* @__PURE__ */ jsxDEV("div", { className: "player-info", children: [
        /* @__PURE__ */ jsxDEV("img", { src: peer.avatarUrl, alt: peer.username }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 192,
          columnNumber: 29
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "player-name", children: peer.username }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 193,
          columnNumber: 29
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 191,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("span", { className: "player-score", children: scores[peer.id] || 0 }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 195,
        columnNumber: 25
      }, this)
    ] }, peer.id, true, {
      fileName: "<stdin>",
      lineNumber: 190,
      columnNumber: 21
    }, this)) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 188,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 186,
    columnNumber: 9
  }, this);
}
function Leaderboard({ leaderboardData, loading }) {
  if (loading) return /* @__PURE__ */ jsxDEV("div", { className: "sidebar leaderboard-list", children: [
    /* @__PURE__ */ jsxDEV("h2", { children: "Leaderboard" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 204,
      columnNumber: 67
    }, this),
    /* @__PURE__ */ jsxDEV("p", { children: "Loading..." }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 204,
      columnNumber: 87
    }, this)
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 204,
    columnNumber: 25
  }, this);
  return /* @__PURE__ */ jsxDEV("div", { className: "sidebar leaderboard-list", children: [
    /* @__PURE__ */ jsxDEV("h2", { children: "Leaderboard \u{1F3C6}" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 207,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("ul", { children: (leaderboardData || []).map((entry) => /* @__PURE__ */ jsxDEV("li", { children: [
      /* @__PURE__ */ jsxDEV("div", { className: "player-info", children: [
        /* @__PURE__ */ jsxDEV("img", { src: entry.avatar_url, alt: entry.username }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 212,
          columnNumber: 29
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "player-name", children: entry.username }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 213,
          columnNumber: 29
        }, this)
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 211,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("span", { className: "leaderboard-wins", children: [
        entry.wins,
        " wins"
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 215,
        columnNumber: 25
      }, this)
    ] }, entry.user_id, true, {
      fileName: "<stdin>",
      lineNumber: 210,
      columnNumber: 21
    }, this)) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 208,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 206,
    columnNumber: 9
  }, this);
}
function PimplePopperGame({ roomState }) {
  const gameAreaRef = useRef(null);
  const gameInstance = useRef(null);
  useEffect(() => {
    if (!gameAreaRef.current) return;
    gameInstance.current = new GameEngine(gameAreaRef.current);
    return () => {
      gameInstance.current.destroy();
    };
  }, []);
  useEffect(() => {
    if (gameInstance.current) {
      gameInstance.current.updateGameState(roomState);
    }
  }, [roomState]);
  const isLoading = !roomState.gameState;
  const isIntermission = roomState.gameState === "intermission";
  const winnerUsername = roomState.winnerUsername;
  const winnerScore = roomState.winnerScore;
  return /* @__PURE__ */ jsxDEV("div", { id: "game-area", ref: gameAreaRef, children: [
    isLoading && /* @__PURE__ */ jsxDEV("div", { id: "loading-overlay", children: "Loading..." }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 251,
      columnNumber: 27
    }, this),
    isIntermission && /* @__PURE__ */ jsxDEV("div", { id: "intermission-overlay", children: [
      /* @__PURE__ */ jsxDEV("h2", { children: "Round Over!" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 254,
        columnNumber: 21
      }, this),
      winnerUsername ? /* @__PURE__ */ jsxDEV("p", { children: [
        "Winner: ",
        /* @__PURE__ */ jsxDEV("span", { className: "winner-name", children: winnerUsername }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 256,
          columnNumber: 36
        }, this),
        " with ",
        winnerScore,
        " points!"
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 256,
        columnNumber: 25
      }, this) : /* @__PURE__ */ jsxDEV("p", { children: "No winner this round." }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 258,
        columnNumber: 25
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 253,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 250,
    columnNumber: 9
  }, this);
}
class GameEngine {
  constructor(container) {
    this.container = container;
    this.pimples = /* @__PURE__ */ new Map();
    this.ingrownHairs = /* @__PURE__ */ new Map();
    this.currentPluckingAction = null;
    this.init3D();
    this.animate();
    this.initAudio();
  }
  init3D() {
    this.scene = new THREE.Scene();
    this.scene.background = null;
    const rect = this.container.getBoundingClientRect();
    this.camera = new THREE.PerspectiveCamera(75, rect.width / rect.height, 0.1, 1e3);
    this.camera.position.z = 2.5;
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(rect.width, rect.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 4;
    this.controls.target.set(0, -0.2, 0);
    const ambientLight = new THREE.AmbientLight(16777215, 0.6);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(16777215, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.loadFaceModel();
    this.container.addEventListener("pointerdown", this.onPointerDown.bind(this));
    this.container.addEventListener("pointermove", this.onPointerMove.bind(this));
    this.container.addEventListener("pointerup", this.onPointerUp.bind(this));
    this.container.addEventListener("pointerleave", this.onPointerUp.bind(this));
    window.addEventListener("resize", this.onWindowResize.bind(this));
  }
  async initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const popPromise = fetch("pop.mp3").then((res) => res.arrayBuffer()).then((buffer) => this.audioContext.decodeAudioData(buffer));
      const pluckPromise = fetch("pluck.mp3").then((res) => res.arrayBuffer()).then((buffer) => this.audioContext.decodeAudioData(buffer));
      [this.popSoundBuffer, this.pluckSoundBuffer] = await Promise.all([popPromise, pluckPromise]);
      this.audioInitialized = true;
    } catch (e) {
      console.error("Could not init audio", e);
    }
  }
  playSound(buffer) {
    if (!this.audioInitialized || !buffer) return;
    if (this.audioContext.state === "suspended") this.audioContext.resume();
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start(0);
  }
  loadFaceModel() {
    const loader = new GLTFLoader();
    loader.load("https://threejs.org/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb", (gltf) => {
      this.faceMesh = gltf.scene;
      const skinTexture = new THREE.TextureLoader().load("skin.png");
      skinTexture.wrapS = THREE.RepeatWrapping;
      skinTexture.wrapT = THREE.RepeatWrapping;
      skinTexture.repeat.set(4, 4);
      const material = new THREE.MeshStandardMaterial({ map: skinTexture, roughness: 0.6, metalness: 0.1 });
      this.faceMesh.traverse((child) => {
        if (child.isMesh) {
          child.material = material;
          child.userData.isFace = true;
        }
      });
      this.faceMesh.scale.set(0.7, 0.7, 0.7);
      this.faceMesh.position.y = -0.5;
      this.scene.add(this.faceMesh);
    });
  }
  updateGameState(roomState) {
    if (!this.faceMesh) return;
    const newPimples = roomState.pimples || {};
    const newHairs = roomState.ingrownHairs || {};
    this.pimples.forEach((pimpleMesh, id) => {
      if (!newPimples[id]) {
        this.faceMesh.remove(pimpleMesh);
        this.pimples.delete(id);
      }
    });
    Object.values(newPimples).forEach((pimpleData) => {
      if (!this.pimples.has(pimpleData.id)) {
        this.renderPimple(pimpleData);
      }
    });
    this.ingrownHairs.forEach((hairGroup, id) => {
      if (!newHairs[id]) {
        this.faceMesh.remove(hairGroup);
        this.ingrownHairs.delete(id);
      }
    });
    Object.values(newHairs).forEach((hairData) => {
      if (!this.ingrownHairs.has(hairData.id)) {
        this.renderIngrownHair(hairData);
      }
    });
  }
  renderPimple(pimpleData) {
    const geometry = new THREE.SphereGeometry(pimpleData.size, 16, 16);
    const material = new THREE.MeshPhongMaterial({ color: 16739201, shininess: 80 });
    const pimpleMesh = new THREE.Mesh(geometry, material);
    pimpleMesh.position.set(pimpleData.position.x, pimpleData.position.y, pimpleData.position.z);
    pimpleMesh.userData.isPimple = true;
    pimpleMesh.userData.id = pimpleData.id;
    this.faceMesh.add(pimpleMesh);
    this.pimples.set(pimpleData.id, pimpleMesh);
  }
  renderIngrownHair(hairData) {
    const moundGeometry = new THREE.SphereGeometry(0.025, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const moundMaterial = new THREE.MeshStandardMaterial({ color: 14388602, roughness: 0.8 });
    const moundMesh = new THREE.Mesh(moundGeometry, moundMaterial);
    const tipGeometry = new THREE.SphereGeometry(5e-3, 8, 8);
    const tipMaterial = new THREE.MeshBasicMaterial({ color: 2365197 });
    const tipMesh = new THREE.Mesh(tipGeometry, tipMaterial);
    tipMesh.position.y = 1e-3;
    const hairGroup = new THREE.Group();
    hairGroup.add(moundMesh);
    hairGroup.add(tipMesh);
    hairGroup.position.set(hairData.position.x, hairData.position.y, hairData.position.z);
    hairGroup.quaternion.set(hairData.quaternion.x, hairData.quaternion.y, hairData.quaternion.z, hairData.quaternion.w);
    hairGroup.userData.isIngrownHair = true;
    hairGroup.userData.id = hairData.id;
    this.faceMesh.add(hairGroup);
    this.ingrownHairs.set(hairData.id, hairGroup);
  }
  onPointerDown(event) {
    if (!this.audioInitialized) this.initAudio();
    if (this.controls.isDragging) return;
    const intersects = this.getIntersects(event.clientX, event.clientY);
    if (!intersects.length) return;
    for (const intersect of intersects) {
      let object = intersect.object;
      while (object.parent && !object.userData.isIngrownHair) object = object.parent;
      if (object.userData.isIngrownHair) {
        this.controls.enabled = false;
        const hairGeometry = new THREE.CylinderGeometry(3e-3, 3e-3, 1, 6);
        hairGeometry.translate(0, 0.5, 0);
        const hairMaterial = new THREE.MeshBasicMaterial({ color: 2365197 });
        const hairMesh = new THREE.Mesh(hairGeometry, hairMaterial);
        const hairBasePosition = new THREE.Vector3();
        object.getWorldPosition(hairBasePosition);
        hairMesh.position.copy(hairBasePosition);
        hairMesh.scale.set(1, 1e-3, 1);
        this.scene.add(hairMesh);
        const planeNormal = this.camera.position.clone().sub(hairBasePosition).normalize();
        const dragPlane = new THREE.Plane(planeNormal, -hairBasePosition.dot(planeNormal));
        this.currentPluckingAction = {
          hairGroup: object,
          hairMesh,
          dragPlane,
          startScreenPos: new THREE.Vector2(event.clientX, event.clientY)
        };
        return;
      }
    }
  }
  onPointerMove(event) {
    if (!this.currentPluckingAction) return;
    const { hairMesh, dragPlane, hairGroup, startScreenPos } = this.currentPluckingAction;
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = (event.clientX - rect.left) / rect.width * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const cursorPoint3D = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(dragPlane, cursorPoint3D);
    if (cursorPoint3D) {
      const pullVector = cursorPoint3D.clone().sub(hairMesh.position);
      const pullDistance = pullVector.length();
      hairMesh.scale.y = pullDistance;
      hairMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pullVector.normalize());
      const currentScreenPos = new THREE.Vector2(event.clientX, event.clientY);
      const screenDragDistance = currentScreenPos.distanceTo(startScreenPos);
      if (screenDragDistance > PULL_THRESHOLD) {
        this.pluckHair(hairGroup, hairMesh);
        this.currentPluckingAction = null;
      }
    }
  }
  onPointerUp(event) {
    if (this.currentPluckingAction) {
      this.scene.remove(this.currentPluckingAction.hairMesh);
      this.currentPluckingAction = null;
    } else {
      this.controls.enabled = true;
      if (this.controls.isDragging) return;
      const intersects = this.getIntersects(event.clientX, event.clientY);
      for (const intersect of intersects) {
        if (intersect.object.userData.isPimple) {
          this.popPimple(intersect.object);
          break;
        }
      }
    }
  }
  getIntersects(x, y) {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = (x - rect.left) / rect.width * 2 - 1;
    this.mouse.y = -((y - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.intersectObjects(this.scene.children, true);
  }
  popPimple(pimpleMesh) {
    const pimpleId = pimpleMesh.userData.id;
    if (!pimpleId || room.roomState.pimples[pimpleId].popped) return;
    this.playSound(this.popSoundBuffer);
    const currentScores = room.roomState.scores || {};
    const myScore = (currentScores[room.clientId] || 0) + 1;
    room.updateRoomState({
      pimples: { [pimpleId]: null },
      // Remove the pimple
      scores: { ...currentScores, [room.clientId]: myScore }
    });
    const screenPos = this.toScreenPositionForConfetti(pimpleMesh);
    confetti({ particleCount: 50, spread: 70, origin: screenPos, colors: ["#FFFF00", "#FFFACD", "#FAFAD2", "#FFFFFF"] });
  }
  pluckHair(hairGroup, hairMesh) {
    const hairId = hairGroup.userData.id;
    if (!hairId || room.roomState.ingrownHairs[hairId].plucked) return;
    this.playSound(this.pluckSoundBuffer);
    const currentScores = room.roomState.scores || {};
    const myScore = (currentScores[room.clientId] || 0) + 2;
    room.updateRoomState({
      ingrownHairs: { [hairId]: null },
      scores: { ...currentScores, [room.clientId]: myScore }
    });
    const screenPos = this.toScreenPositionForConfetti(hairMesh);
    confetti({ particleCount: 70, spread: 90, origin: screenPos, colors: ["#333333", "#666666", "#FFFFFF"], shapes: ["square"] });
    this.scene.remove(hairMesh);
  }
  toScreenPositionForConfetti(obj) {
    const vector = new THREE.Vector3();
    const rect = this.container.getBoundingClientRect();
    obj.getWorldPosition(vector);
    vector.project(this.camera);
    vector.x = (vector.x * 0.5 + 0.5) * rect.width + rect.left;
    vector.y = (vector.y * -0.5 + 0.5) * rect.height + rect.top;
    return { x: vector.x / window.innerWidth, y: vector.y / window.innerHeight };
  }
  onWindowResize() {
    const rect = this.container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.camera.aspect = rect.width / rect.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(rect.width, rect.height);
    }
  }
  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
  destroy() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener("resize", this.onWindowResize.bind(this));
    if (this.renderer) this.container.removeChild(this.renderer.domElement);
  }
}
const tempFaceGeo = new THREE.SphereGeometry(1, 64, 64);
function createNewPimple() {
  const vertexIndex = Math.floor(Math.random() * tempFaceGeo.attributes.position.count);
  const position = new THREE.Vector3().fromBufferAttribute(tempFaceGeo.attributes.position, vertexIndex);
  return {
    id: `pimple_${Date.now()}_${Math.random()}`,
    position: { x: position.x, y: position.y, z: position.z },
    size: Math.random() * 0.03 + 0.04,
    popped: false
  };
}
function createNewIngrownHair() {
  const vertexIndex = Math.floor(Math.random() * tempFaceGeo.attributes.position.count);
  const position = new THREE.Vector3().fromBufferAttribute(tempFaceGeo.attributes.position, vertexIndex);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), position.clone().normalize());
  return {
    id: `hair_${Date.now()}_${Math.random()}`,
    position: { x: position.x, y: position.y, z: position.z },
    quaternion: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
    plucked: false
  };
}
function spawnPimple() {
  const pimple = createNewPimple();
  room.updateRoomState({ pimples: { [pimple.id]: pimple } });
}
function spawnIngrownHair() {
  const hair = createNewIngrownHair();
  room.updateRoomState({ ingrownHairs: { [hair.id]: hair } });
}
const root = createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
  fileName: "<stdin>",
  lineNumber: 622,
  columnNumber: 13
}));
