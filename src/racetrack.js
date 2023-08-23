import * as THREE from "three";
import { randFloat } from "three/src/math/MathUtils";

let trackLine;

function createTrack() {
  const track = new THREE.Group();

  const curvePoints = [
    0, 0, 0, 3000, 0, 0, 3000, 0, 1000, 2500, 0, 1000, 2800, 0, 300, 2300, 0,
    200, 2100, 0, 1000, 1300, 0, 1000, 1300, 0, 300, 700, 0, 300, 300, 0, 1000,
    -300, 0, 1000, -300, 0, 0, 0, 0, 0,
  ];

  const pts = [];

  for (let i = 0; i < curvePoints.length; i += 3) {
    pts.push(
      new THREE.Vector3(curvePoints[i], curvePoints[i + 1], curvePoints[i + 2])
    );
  }

  const ls = 1400; // length segments
  const ws = 5; // width segments
  const lss = ls + 1;
  const wss = ws + 1;

  const curve = new THREE.CatmullRomCurve3(pts);
  const points = curve.getPoints(ls);
  const len = curve.getLength();
  const lenList = curve.getLengths(ls);

  const faceCount = ls * ws * 2;
  const vertexCount = lss * wss;

  const indices = new Uint32Array(faceCount * 3);
  const vertices = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  const g = new THREE.BufferGeometry();
  g.setIndex(new THREE.BufferAttribute(indices, 1));
  g.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

  let idxCount = 0;
  let a, b1, c1, c2;

  for (let j = 0; j < ls; j++) {
    for (let i = 0; i < ws; i++) {
      // 2 faces / segment,  3 vertex indices
      a = wss * j + i;
      b1 = wss * (j + 1) + i; // right-bottom
      c1 = wss * (j + 1) + 1 + i;
      //  b2 = c1							// left-top
      c2 = wss * j + 1 + i;

      indices[idxCount] = a; // right-bottom
      indices[idxCount + 1] = b1;
      indices[idxCount + 2] = c1;

      indices[idxCount + 3] = a; // left-top
      indices[idxCount + 4] = c1; // = b2,
      indices[idxCount + 5] = c2;

      g.addGroup(idxCount, 6, i); // write group for multi material

      idxCount += 6;
    }
  }

  let uvIdxCount = 0;

  for (let j = 0; j < lss; j++) {
    for (let i = 0; i < wss; i++) {
      uvs[uvIdxCount] = lenList[j] / len;
      uvs[uvIdxCount + 1] = i / ws;

      uvIdxCount += 2;
    }
  }

  let x, y, z;
  let posIdx = 0; // position index

  let tangent;
  const normal = new THREE.Vector3();
  const binormal = new THREE.Vector3(0, 1, 0);

  const t = []; // tangents
  const n = []; // normals
  const b = []; // binormals

  for (let j = 0; j < lss; j++) {
    tangent = curve.getTangent(j / ls);
    t.push(tangent.clone());

    normal.crossVectors(tangent, binormal);

    normal.y = 0; // to prevent lateral slope of the road

    normal.normalize();
    n.push(normal.clone());

    binormal.crossVectors(normal, tangent); // new binormal
    b.push(binormal.clone());
  }

  const dw = [-0.36, -0.34, -0.01, 0.01, 0.34, 0.36]; // width from the center line

  for (let j = 0; j < lss; j++) {
    // length

    for (let i = 0; i < wss; i++) {
      // width

      x = points[j].x + dw[i] * 300 * n[j].x;
      y = points[j].y;
      z = points[j].z + dw[i] * 300 * n[j].z;

      vertices[posIdx] = x;
      vertices[posIdx + 1] = y;
      vertices[posIdx + 2] = z;

      posIdx += 3;
    }
  }

  const tex = new THREE.TextureLoader().load("CentralMarking.png");
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(ls / 6);

  const material = [
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
  ];

  const linePoints = [];
  for(let i = 6, j = 0; i < vertices.length; i += 18, j++) {
    linePoints.push(new THREE.Vector3(vertices[i] + 3* n[j].x, vertices[i+1], vertices[i+2] + 3* n[j].z));
  }

  trackLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePoints), new THREE.LineBasicMaterial({color: 0xffffff}));
  // track.add(trackLine);

  const roadMesh = new THREE.Mesh(g, material);
  track.add(roadMesh);

  const finishTex = new THREE.TextureLoader().load("finish.jpg");
  finishTex.wrapS = THREE.RepeatWrapping;
  finishTex.repeat.set(0.1, 1);
  const finishLine = new THREE.Mesh(new THREE.PlaneGeometry(75, 210), new THREE.MeshStandardMaterial({map: finishTex}));
  finishLine.position.set(0, 0.1, 0);
  finishLine.rotation.x = -Math.PI / 2;
  track.add(finishLine);

  let ot1 = new THREE.Path();
  for(let i = 0; i < linePoints.length; i++) {
    ot1.lineTo(linePoints[i].x, linePoints[i].z - 55);
  }
  let ot2 = new THREE.Path();
  for(let i = 0; i < linePoints.length; i++) {
    ot2.lineTo(linePoints[i].x, linePoints[i].z - 10);
  }
  let ot3 = new THREE.Path();
  for(let i = 0; i < linePoints.length; i++) {
    ot3.lineTo(linePoints[i].x, linePoints[i].z + 55);
  }
  let ot4 = new THREE.Path();
  for(let i = 0; i < linePoints.length; i++) {
    ot4.lineTo(linePoints[i].x, linePoints[i].z + randFloat(-60, 60));
  }
  let ot5 = new THREE.Path();
  for(let i = 0; i < linePoints.length; i++) {
    ot5.lineTo(linePoints[i].x, linePoints[i].z + randFloat(-60, 60));
  }

  return {track, opponentTrack: [ot1, ot2, ot3, ot4, ot5]};
}

function findDistanceFromTrack(carObj) {
  const carPos = carObj.car.position;
  const trackPos = trackLine.geometry.attributes.position.array;
  let minDist = 1000000;
  let minIdx = 0;
  for(let i = carObj.minIdx - 12; i < carObj.minIdx + 12; i += 3) {
    let j = i;
    if(i < 0)
      j += trackPos.length;
    const dist = Math.sqrt((carPos.x - trackPos[j % (trackPos.length)])**2 + (carPos.z - trackPos[(j+2) % (trackPos.length)])**2);
    if(dist < minDist) {
      minDist = dist;
      minIdx = j % (trackPos.length);
    }
  }
  carObj.minIdx = minIdx;
  carObj.pathCompleted = minIdx / trackPos.length;
  return {distance: minDist, trackPos: new THREE.Vector3(trackPos[minIdx], trackPos[minIdx+1], trackPos[minIdx+2])};
}

export { createTrack, findDistanceFromTrack };
