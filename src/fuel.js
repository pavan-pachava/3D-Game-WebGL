import * as THREE from 'three';

function createCan(position, canModel) {
  const can = canModel.clone();
  can.position.copy(position);
  return can;
}

function updateCans(tracks, canModel) {
  let cans = [];
  let number = (Math.random() * 11) + 20;
  for (let i = 0; i < number; i++) {
    let randomTrack = Math.floor(Math.random() * tracks.length);
    let randomPoint = Math.random();
    let randomX = Math.floor(Math.random() * 20) - 10;
    let randomZ = Math.floor(Math.random() * 20) - 10;
    let point = tracks[randomTrack].getPoint(randomPoint);

    // console.log(point.x + randomX, 5, point.y + randomZ);

    let randomPosition = new THREE.Vector3(point.x + randomX, 5, point.y + randomZ);
    let can = createCan(randomPosition, canModel);
    cans.push(can);
  }
  // console.log(cans);
  return cans;
}

export { createCan, updateCans };
