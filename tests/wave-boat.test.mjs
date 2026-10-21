import assert from 'node:assert/strict';
import {boatPose} from '../public/glass/boat-motion.mjs';
import {sampleWave,waves} from '../public/glass/waves.mjs';
const amplitude=waves.reduce((sum,w)=>sum+w.amplitude,0);
for(const span of [12,30,50])for(const index of [0,1]){
  let previous=boatPose(0,span,index);
  for(let frame=1;frame<=145*60;frame++){
    const current=boatPose(frame/60,span,index),surface=sampleWave(current.x,current.z,frame/60);
    assert.ok(Object.values(current).every(Number.isFinite));
    assert.ok(current.x>=-span/2-4&&current.x<=span/2+4);
    assert.equal(current.height,surface.height,'Hull must stay on the rendered wave field');
    assert.equal(current.slopeX,surface.slopeX);assert.equal(current.slopeZ,surface.slopeZ);
    assert.ok(Math.abs(current.height)<=amplitude);
    if(Math.abs(current.x-previous.x)>1)assert.ok(previous.x>span/2&&current.x<-span/2,'Wrapping is outside the visible water');
    else assert.ok(Math.abs(current.height-previous.height)<.07,'Buoyancy cannot jump between frames');
    previous=current;
  }
}
for(const [x,z,t] of [[0,0,0],[-12,-18,4],[17,-42,15]]){
  const epsilon=.0001,sample=sampleWave(x,z,t);
  const dx=(sampleWave(x+epsilon,z,t).height-sampleWave(x-epsilon,z,t).height)/(2*epsilon);
  const dz=(sampleWave(x,z+epsilon,t).height-sampleWave(x,z-epsilon,t).height)/(2*epsilon);
  assert.ok(Math.abs(dx-sample.slopeX)<1e-7&&Math.abs(dz-sample.slopeZ)<1e-7,'Hull normal must match the water gradient');
}
console.log('Wave/boat checks passed: shared surface, buoyancy continuity, analytic normals, and offscreen wrapping.');
