import assert from 'node:assert/strict';
import * as THREE from '../public/glass/vendor/three.module.js';
import {createSailboat} from '../public/glass/sea-scene.js';
const boat=createSailboat();let meshes=0;
boat.traverse(object=>{if(object.isMesh){meshes++;const position=object.geometry.attributes.position;for(const value of position.array)assert.ok(Number.isFinite(value));}});
const box=new THREE.Box3().setFromObject(boat),size=box.getSize(new THREE.Vector3());
assert.ok(meshes>=12,'Boat requires solid hull, deck, mast, curved sails, and rigging');
assert.ok(size.x>3&&size.y>3&&size.z>1,'The boat must have genuine volume on all three axes');
console.log(`3D model checks passed: ${meshes} meshes, finite vertices, and solid three-axis bounds.`);
