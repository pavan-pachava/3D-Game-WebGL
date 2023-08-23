import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

class Car {
  constructor(name, position, textureFile, scale, rotation, carAcc) {
    this.name = name;
    this.car = createCar(textureFile, scale, rotation);
    this.elevation = position.y;
    this.car.position.copy(position);
    this.car.rotation.y = Math.PI;
    this.health = 100;
    this.fuel = 100;
    this.CarVelocity = 0;
    this.CarDirection = new THREE.Vector3(1, 0, 0);
    this.closestPoint = 0;
    this.laps = 0;
    this.lastLap = 0;
    this.pathCompleted = 0;
    this.prevPosition = new THREE.Vector3(position.x, position.y, position.z);
    this.distance = 0;
    this.CarAcc = carAcc;
    this.complete = -1;
    this.fuelUsed = 0;
  }

  getCar() {
    return this.car;
  }
}

function createCar(textureFile, scale, rotation) {
  const car = new THREE.Group();
  
  const loader = new GLTFLoader();
  loader.load(
    textureFile,
    (gltf) => {
      gltf.scene.scale.set(scale, scale, scale);
      gltf.scene.rotation.y = rotation;
      car.add(gltf.scene);
    },
    (event) => {
      console.log((event.loaded / event.total) * 100 + "% loaded");
    },
    (error) => {
      console.error(error);
    }
  );

  return car;
}

export default Car;
export { createCar };
