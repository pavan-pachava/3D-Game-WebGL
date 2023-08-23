import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createTrack, findDistanceFromTrack } from './racetrack';
import Stats from 'stats.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import Car from './car';
import { updateCans } from './fuel';

const clock = new THREE.Clock();
const eps = 1e-6;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  7000
);
camera.position.y = 3000;

let mapRatio = 5;
const mapCamera = new THREE.OrthographicCamera(
  window.innerWidth / -4,
  window.innerWidth / 4,
  window.innerHeight / 4,
  window.innerHeight / -4,
  0.1,
  1000
);
mapCamera.up = new THREE.Vector3(0, 1, 0);
mapCamera.position.y = 100;

const mapRenderer = new THREE.WebGLRenderer({ antialias: true });
mapRenderer.setSize(window.innerWidth / mapRatio, window.innerHeight / mapRatio);
let mapContainer = document.getElementById('map');
mapContainer.appendChild(mapRenderer.domElement);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
let container = document.getElementById('ThreeJS');
container.appendChild(renderer.domElement);

let cameraOffset = new THREE.Vector3(-60, 40, 0),
  cameraOffset2 = new THREE.Vector3(8, 10, 0),
  handlingCoeff = Math.PI / 3.5,
  collisionHealthReduction = 3,
  friction = 0.2,
  allMovementStop = true,
  fps = false,
  gameStarted = false,
  gameOver = false,
  numberOfLaps = 3;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const loader = new GLTFLoader();
loader.load(
  'adyansh.glb',
  (gltf) => {
    gltf.scene.rotation.y = -Math.PI/2;
    gltf.scene.scale.set(22, 22, 22);
    gltf.scene.position.set(1450, 360, 480);
    scene.add(gltf.scene);
  },
  (event) => {
    console.log((event.loaded / event.total) * 100 + "% loaded");
  },
  (error) => {
    console.error(error);
  }
);

const controls = new OrbitControls(camera, renderer.domElement);

// CARS

const playerCar = new Car(
  'Lightning Mcqueen',
  new THREE.Vector3(0, 10, 55),
  'mcqueen/scene.gltf',
  12,
  0,
  3.7
);
scene.add(playerCar.car);
playerCar.maxVelocity = 15;

let opponentCars = [];
opponentCars.push(
  new Car(
    'Strip Weathers',
    new THREE.Vector3(100, 10, -55),
    'strip_weathers/scene.gltf',
    25,
    -Math.PI,
    0.006
  )
);
// opponentCars[0].CarVelocity = 0.00056;
opponentCars[0].pathCompleted = 0.013;

opponentCars.push(
  new Car(
    'Chick Hicks',
    new THREE.Vector3(0, 15, -55),
    'chick_hicks/scene.gltf',
    23,
    -Math.PI,
    0.005
  )
);
// opponentCars[1].CarVelocity = 0.00054;
opponentCars[1].pathCompleted = 0.001;

opponentCars.push(
  new Car(
    'Doc Hudson',
    new THREE.Vector3(100, 1, 55),
    'hudson/scene.gltf',
    17,
    -Math.PI / 2,
    0.006
  )
);
// opponentCars[2].CarVelocity = 0.00061;
opponentCars[2].pathCompleted = 0.013;

opponentCars.forEach((car) => {
  scene.add(car.car);
});

const { track, opponentTrack } = createTrack();
scene.add(track);

scene.add(new THREE.DirectionalLight(0xffffff, 1));

const stats = new Stats();
stats.dom.style.position = 'absolute';
stats.dom.style.top = `${window.innerHeight - 50}px`;
container.appendChild(stats.dom);

// const light = new THREE.PointLight(0xffffff, 1, 2000);
// light.position.set(0, 1000, 0);
// scene.add(light);

let canModel,
  cans,
  fuelBox = [];

loader.load(
  'fuel_can/scene.gltf',
  (gltf) => {
    canModel = gltf.scene;
    canModel.scale.set(10, 10, 10);
    cans = updateCans(opponentTrack, canModel);
    cans.forEach((can, idx) => {
      scene.add(can);
      fuelBox.push(new THREE.Box3().setFromObject(can));
      fuelBox[idx].expandByScalar(-3);
    });
  },
  (event) => {
    console.log((event.loaded / event.total) * 100 + '% loaded can');
  },
  (error) => {
    console.error(error);
  }
);

let keymap = new Array(256);
document.addEventListener('keydown', (e) => {
  keymap[e.key] = true;
  if (e.key == 't') {
    fps = !fps;
  }
  if (e.key == 'Enter' && !gameStarted) {
    document.getElementById('start').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    gameStarted = true;
    startGame();
  }
});
document.addEventListener('keyup', (e) => {
  keymap[e.key] = false;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  (mapCamera.aspect = window.innerWidth / mapRatio), window.innerHeight / mapRatio;
  mapCamera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio * 0.5, 2));

  mapRenderer.setSize(window.innerWidth / mapRatio, window.innerHeight / mapRatio);
  mapRenderer.setPixelRatio(Math.min(window.devicePixelRatio * 0.5, 2));
});

function updateDirection(CarTomove, theta) {
  CarTomove.CarDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), theta);
  CarTomove.CarDirection.normalize();
  cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), theta);
  cameraOffset2.applyAxisAngle(new THREE.Vector3(0, 1, 0), theta);
  CarTomove.car.rotation.y += theta;
}

function finishGame() {
  let ranking = [];
  opponentCars.forEach((car) => {
    if(car.complete != -1)
      ranking.push(car.name);
  });
  ranking.sort((a, b) => {
    return a.complete - b.complete;
  });
  ranking.push(playerCar.name);
  opponentCars.forEach((car) => {
    if(car.complete == -1)
      ranking.push(car.name);
  });
  gameOver = true;
  document.getElementById('game').style.display = 'none';
  document.getElementById('game-over').style.display = 'block';
  document.getElementById('rankings').innerHTML = ranking.join('<br>');
}

function moveCar(trackPos, distance, delta) {
  if (keymap['w']) {
    playerCar.CarVelocity += playerCar.CarAcc * delta;
    playerCar.fuel -= 5 * delta;
    playerCar.fuelUsed += 5 * delta;
  }
  if (keymap['s']) {
    playerCar.CarVelocity -= playerCar.CarAcc * delta;
  }
  if (keymap[' ']) {
    playerCar.CarVelocity -= 7 * playerCar.CarAcc * delta;
    if (playerCar.CarVelocity < 0) playerCar.CarVelocity = 0;
  }
  if (keymap['enter']) {
  }
  if (playerCar.CarVelocity >= eps || playerCar.CarVelocity <= -eps) {
    if (keymap[' '] && keymap['a']) {
      updateDirection(playerCar, 3 * handlingCoeff * delta);
    } else if (keymap['a']) {
      updateDirection(playerCar, handlingCoeff * delta);
    }
    if (keymap[' '] && keymap['d']) {
      updateDirection(playerCar, -3 * handlingCoeff * delta);
    } else if (keymap['d']) {
      updateDirection(playerCar, -handlingCoeff * delta);
    }
  }
  playerCar.CarVelocity -= playerCar.CarVelocity * friction * delta;
  const direction = new THREE.Vector3().subVectors(trackPos, playerCar.car.position);
  if (
    playerCar.car.position.x < -1 &&
    playerCar.CarVelocity < -eps &&
    playerCar.car.position.z < 100 &&
    playerCar.car.position.z > -100
  ) {
    playerCar.CarVelocity = 0;
  }

  const angle = playerCar.CarDirection.angleTo(direction);
  if ((angle > Math.PI / 2 || angle < -Math.PI / 2) && distance > 93) {
    const planeNormal = direction.clone().normalize();
    const newDirection = playerCar.CarDirection.clone().projectOnPlane(planeNormal);

    playerCar.car.position.addScaledVector(newDirection, playerCar.CarVelocity);
    playerCar.CarVelocity = newDirection.length() * playerCar.CarVelocity;

    playerCar.health -= collisionHealthReduction * delta;
    playerCar.distance += playerCar.car.position.distanceTo(playerCar.prevPosition);
    playerCar.prevPosition = playerCar.car.position.clone();
  } else if (distance > 93 && playerCar.CarVelocity < 0) {
    playerCar.CarVelocity = 0;
  } else {
    playerCar.car.position.addScaledVector(
      playerCar.CarDirection,
      playerCar.CarVelocity
    );
    playerCar.distance += playerCar.car.position.distanceTo(playerCar.prevPosition);
    playerCar.prevPosition = playerCar.car.position.clone();
  }
  if (
    playerCar.car.position.x > -80 &&
    playerCar.car.position.x < -70 &&
    playerCar.car.position.z < 100 &&
    playerCar.car.position.z > -100 &&
    playerCar.CarVelocity > 0
  ) {
    if (playerCar.distance - playerCar.lastLap > 9000) {
      playerCar.laps++;
      if(playerCar.laps == numberOfLaps){
        playerCar.complete = Date.now();
        finishGame();
        return;
      }
      playerCar.lastLap = playerCar.distance;
      cans.forEach((can) => {
        scene.remove(can);
      });
      cans = [];
      fuelBox = [];
      cans = updateCans(opponentTrack, canModel);
      cans.forEach((can, idx) => {
        scene.add(can);
        fuelBox.push(new THREE.Box3().setFromObject(can));
        fuelBox[idx].expandByScalar(-3);
      });
      document.getElementById('laps').innerHTML = 'Lap ' + (playerCar.laps + 1);
    }
  }
}

let maxvelocity = [0.037, 0.034, 0.04];

function MoveOpponentCars(delta) {
  opponentCars.forEach((car, idx) => {
    const point = opponentTrack[idx].getPoint(car.pathCompleted);
    const tangent = opponentTrack[idx].getTangent(car.pathCompleted);
    car.car.rotation.y = Math.atan2(tangent.x, tangent.y) + Math.PI / 2;
    car.car.position.set(point.x, car.elevation, point.y);
    car.CarVelocity += car.CarAcc * delta;
    if (car.CarVelocity > maxvelocity[idx]) {
      car.CarVelocity = maxvelocity[idx];
    }
    car.pathCompleted += car.CarVelocity * delta;
    if (car.pathCompleted > 1) {
      car.pathCompleted = 0.005;
      car.laps++;
      if(car.laps == numberOfLaps){
        car.complete = Date.now();
        scene.remove(car.car);
      }
    }
  });
}

let collided = [
  [false, false, false],
  [false, false, false],
  [false, false, false],
  [false, false, false],
];

function checkCollision() {
  let playerBox = new THREE.Box3().setFromObject(playerCar.car);
  let carBox = [];
  playerBox.expandByScalar(-3);
  opponentCars.forEach((car, idx) => {
    carBox.push(new THREE.Box3().setFromObject(car.car));
    carBox[idx].expandByScalar(-3);
  });
  opponentCars.forEach((car, idx) => {
    let collision = playerBox.intersectsBox(carBox[idx]);
    if (collision) {
      playerCar.CarVelocity = Math.min(playerCar.CarVelocity, 3);
      car.CarVelocity = 0.01;
      collided[idx][0] = true;
      playerCar.health -= 0.1;
    } else if (collided[idx][0] && !collision) {
      // car.CarVelocity = velocity[idx];
      collided[idx][0] = false;
    }
  });

  opponentCars.forEach((car, idx) => {
    for (let idx2 = idx + 1; idx2 < opponentCars.length; idx2++) {
      let car2 = opponentCars[idx2];
      let collision = carBox[idx].intersectsBox(carBox[idx2]);
      if (collision) {
        car.CarVelocity = 0.01;
        car2.CarVelocity = 0.01;
        collided[idx][idx2] = true;
      } else if (collided[idx][idx2] && !collision) {
        // car.CarVelocity = velocity[idx];
        // car2.CarVelocity = velocity[idx2];
        collided[idx][idx2] = false;
      }
    }
  });
}

function checkFuelCollision() {
  let playerBox = new THREE.Box3().setFromObject(playerCar.car);
  playerBox.expandByScalar(-3);
  fuelBox.forEach((box, idx) => {
    let collision = playerBox.intersectsBox(box);
    if (collision && cans[idx].visible) {
      playerCar.fuel += 10;
      cans[idx].visible = false;
      cans[idx].position.set(0, 0, 0);
    }
  });
}

clock.getDelta();

function updateHud() {
  document.getElementById('health').innerHTML =
    'Health: ' + Math.floor(playerCar.health);

  document.getElementById('score').innerHTML =
    'Score: ' + Math.floor(playerCar.distance / 20);

  document.getElementById('fuel').innerHTML = 'Fuel: ' + Math.floor(playerCar.fuel);
  if(cans){
    
    let minDist = 1000000, minIdx = -1;
    cans.forEach((can, idx) => {
      if (can.visible && playerCar.car.position.distanceTo(can.position) < minDist) {
        minDist = playerCar.car.position.distanceTo(can.position);
        minIdx = idx;
      }
    });
    if (minIdx != -1) {
      let distance = Math.floor(playerCar.car.position.distanceTo(cans[minIdx].position) / 20);
      document.getElementById('fuel-distance').innerHTML = 'Nearest Fuel Can: ' + distance + 'm';
    }
  }
  
  document.getElementById('mileage').innerHTML = 'Mileage: ' + Math.floor(playerCar.distance / playerCar.fuelUsed);
}

function animate() {
  if(gameOver)
    return;

  requestAnimationFrame(animate);
  let delta = clock.getDelta();

  controls.update();
  checkCollision();
  checkFuelCollision();
  if (!allMovementStop) {
    let { distance, trackPos } = findDistanceFromTrack(playerCar);
    moveCar(trackPos, distance, delta);
    MoveOpponentCars(delta);
  }
  updateHud();
  if (playerCar.health <= 0) {
    allMovementStop = true;
    document.getElementById('game').style.display = 'none';
    document.getElementById('health-over').style.display = 'block';
    return;
  }
  if (playerCar.fuel <= 0) {
    allMovementStop = true;
    document.getElementById('game').style.display = 'none';
    document.getElementById('fuel-over').style.display = 'block';
    return;
  }

  if (fps) {
    let look = playerCar.car.position.clone();
    look.add(
      new THREE.Vector3(
        playerCar.CarDirection.x * 10,
        10,
        playerCar.CarDirection.z * 10
      )
    );
    camera.lookAt(look);
    camera.position.copy(playerCar.car.position).add(cameraOffset2);
  } else {
    camera.lookAt(playerCar.car.position);
    camera.position.copy(playerCar.car.position).add(cameraOffset);
  }

  mapCamera.lookAt(playerCar.car.position);
  mapCamera.position.set(
    playerCar.car.position.x,
    playerCar.car.position.y + 100,
    playerCar.car.position.z
  );

  renderer.render(scene, camera);
  mapRenderer.render(scene, mapCamera);

  stats.update();
}
animate();

function startGame() {
  let sec = 2,
    time = 1;
  let num = setInterval(() => {
    if (sec == 0) {
      document.getElementById('timer').style.display = 'none';
      allMovementStop = false;
      setInterval(() => {
        document.getElementById('time').innerHTML = 'Time: ' + time;
        time++;
      }, 1000);
      clearInterval(num);
    } else {
      document.getElementById('timer').innerHTML = sec;
      sec--;
    }
  }, 1000);
}
