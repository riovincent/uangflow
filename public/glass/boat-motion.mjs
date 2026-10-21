import {sampleWave} from './waves.mjs';
export const tracks=[{duration:105,phase:.23,direction:1,z:-18},{duration:145,phase:.78,direction:1,z:-42}];
export function boatPose(seconds,span,index){
  const track=tracks[index];
  const progress=((track.phase+seconds/track.duration*track.direction)%1+1)%1;
  const x=-(span/2+4)+(span+8)*progress;
  const z=track.z+.3*Math.sin(seconds*.24+index);
  return {x,z,...sampleWave(x,z,seconds),direction:track.direction};
}
