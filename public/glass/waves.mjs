export const waves=[
  {amplitude:.24,length:7.2,x:.94,z:.342,speed:1.1},
  {amplitude:.12,length:4.1,x:-.4,z:.9165,speed:1.45},
  {amplitude:.055,length:2.15,x:.7,z:-.7141,speed:1.9},
];
export function sampleWave(x,z,seconds){
  let height=0,slopeX=0,slopeZ=0;
  for(const wave of waves){
    const k=2*Math.PI/wave.length;
    const phase=k*(wave.x*x+wave.z*z)-wave.speed*seconds;
    height+=wave.amplitude*Math.sin(phase);
    slopeX+=wave.amplitude*k*wave.x*Math.cos(phase);
    slopeZ+=wave.amplitude*k*wave.z*Math.cos(phase);
  }
  return {height,slopeX,slopeZ};
}
// Generate the GPU field from the CPU coefficients so boats cannot drift out of phase.
const gl=value=>Number(value).toFixed(9);
export const waveGLSL=`vec3 waveSample(vec2 p,float t){vec3 s=vec3(0.);
${waves.map(w=>{const k=2*Math.PI/w.length;return `{float phase=${gl(k)}*dot(p,vec2(${gl(w.x)},${gl(w.z)}))-${gl(w.speed)}*t;s.x+=${gl(w.amplitude)}*sin(phase);s.yz+=${gl(w.amplitude*k)}*vec2(${gl(w.x)},${gl(w.z)})*cos(phase);}`;}).join('\n')}
return s;}`;
