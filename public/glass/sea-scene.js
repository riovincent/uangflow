import * as THREE from './vendor/three.module.js';
import {waveGLSL} from './waves.mjs';
import {boatPose,tracks} from './boat-motion.mjs';

function rod(from,to,radius,material){
  const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),delta=b.clone().sub(a);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),8),material);
  mesh.position.copy(a.add(b).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;
}

function sail(top,left,right,material){
  const points=[],indices=[],n=14;
  for(let row=0;row<=n;row++)for(let col=0;col<=n;col++){
    const v=row/n,u=col/n;
    points.push(top[0]*(1-v)+(left[0]*(1-u)+right[0]*u)*v,top[1]*(1-v)+(left[1]*(1-u)+right[1]*u)*v,.20*Math.sin(Math.PI*u)*Math.sin(Math.PI*v));
  }
  for(let row=0;row<n;row++)for(let col=0;col<n;col++){const i=row*(n+1)+col;indices.push(i,i+n+1,i+1,i+1,i+n+1,i+n+2);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  return new THREE.Mesh(geometry,material);
}

export function createSailboat(){
  const boat=new THREE.Group();boat.name='Three-dimensional wooden sailboat';
  const orange=new THREE.MeshStandardMaterial({color:0xd88442,roughness:.32,metalness:.08});
  const wood=new THREE.MeshStandardMaterial({color:0xa95c2c,roughness:.45});
  const white=new THREE.MeshStandardMaterial({color:0xe9edef,roughness:.36});
  const cloth=new THREE.MeshPhysicalMaterial({color:0xfff7e8,roughness:.65,side:THREE.DoubleSide,sheen:.7,sheenColor:new THREE.Color(0xffffff)});
  const rope=new THREE.MeshStandardMaterial({color:0xc0c5c4,roughness:.7});
  const hull=new THREE.Mesh(new THREE.SphereGeometry(1,40,18,0,Math.PI*2,Math.PI/2,Math.PI/2),white);hull.scale.set(1.8,.57,.66);hull.position.y=.25;hull.name='Solid rounded white hull';boat.add(hull);
  const band=new THREE.Mesh(new THREE.SphereGeometry(1,40,12,0,Math.PI*2,Math.PI/2,Math.PI/2),orange);band.scale.set(1.81,.28,.67);band.position.y=.33;boat.add(band);
  const deck=new THREE.Mesh(new THREE.CircleGeometry(1,48),orange);deck.rotation.x=-Math.PI/2;deck.scale.set(1.76,.62,1);deck.position.y=.33;boat.add(deck);
  const lip=new THREE.Mesh(new THREE.TorusGeometry(1,.042,8,64),orange);lip.scale.set(1.76,.62,1);lip.rotation.x=Math.PI/2;lip.position.y=.35;boat.add(lip);
  const cockpit=new THREE.Mesh(new THREE.CircleGeometry(1,32),wood);cockpit.rotation.x=-Math.PI/2;cockpit.scale.set(.52,.35,1);cockpit.position.set(.5,.34,0);boat.add(cockpit);
  for(const x of [.18,.86]){const bench=new THREE.Mesh(new THREE.BoxGeometry(.12,.10,.88),orange);bench.position.set(x,.40,0);boat.add(bench);}
  boat.add(rod([-.28,.34,0],[-.28,3.85,0],.035,wood));
  const cap=new THREE.Mesh(new THREE.SphereGeometry(.065,12,8),white);cap.position.set(-.28,3.87,0);boat.add(cap);
  const mainTop=[-.35,3.66],mainLeft=[-1.55,.77],mainRight=[-.35,.88];
  boat.add(sail(mainTop,mainLeft,mainRight,cloth));
  boat.add(sail([-.18,3.42],[-.18,1.03],[1.52,.94],cloth));
  boat.add(rod([-.32,.77,0],[-1.58,.66,0],.025,orange));
  boat.add(rod([-.21,.94,0],[1.53,.82,0],.025,orange));
  boat.add(rod([-.28,3.75,0],[1.63,.35,0],.008,rope));
  boat.add(rod([-.28,3.75,0],[-1.63,.35,0],.008,rope));
  return boat;
}

export function createSeaScene(shared){
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.1,1800);
  camera.position.set(0,5.5,16);
  const waterUniforms={...shared,uEye:{value:camera.position},uResolution:{value:new THREE.Vector2(1,1)}};
  const waterGeometry=new THREE.PlaneGeometry(2,2,180,220);waterGeometry.rotateX(-Math.PI/2);
  const positions=waterGeometry.attributes.position;
  for(let i=0;i<positions.count;i++){
    const t=(positions.getZ(i)+1)/2,distance=t*t*950;
    positions.setXYZ(i,positions.getX(i)*(45+distance*.9),0,18-distance);
  }
  const waterMaterial=new THREE.ShaderMaterial({uniforms:waterUniforms,vertexShader:`
    uniform float uTime;varying vec3 vWorld;varying vec3 vNormal;
    ${waveGLSL}
    void main(){vec3 p=position;vec3 wave=waveSample(p.xz,uTime);p.y=wave.x;vWorld=p;vNormal=normalize(vec3(-wave.y,1.,-wave.z));gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}
  `,fragmentShader:`
    uniform float uTime;uniform vec3 uEye;uniform vec2 uResolution;uniform float uAspect;uniform vec4 uContacts[6];
    varying vec3 vWorld;varying vec3 vNormal;
    void main(){
      vec3 n=normalize(vNormal),view=normalize(uEye-vWorld);
      float fresnel=pow(1.-max(dot(n,view),0.),3.);
      vec3 color=mix(vec3(.027,.12,.19),vec3(.21,.40,.48),fresnel*.85);
      vec3 light=normalize(vec3(-.35,.72,-.55));
      float spec=pow(max(dot(reflect(-light,n),view),0.),48.);
      color+=vec3(.38,.59,.66)*spec*1.6;
      color+=vec3(.06,.13,.15)*smoothstep(.20,.39,vWorld.y);
      float pillar=exp(-vWorld.x*vWorld.x*.025)*(.4+.6*max(n.z,0.));
      color+=vec3(.07,.18,.23)*pillar;
      vec2 uv=gl_FragCoord.xy/uResolution;
      float ripple=0.;
      for(int i=0;i<6;i++){float age=uTime-uContacts[i].z;vec2 d=vec2((uv.x-uContacts[i].x)*uAspect,(uv.y-uContacts[i].y)*2.9);float front=length(d)-age*.13;ripple+=sin(front*115.)*exp(-abs(front)*22.)*exp(-age*1.2)*uContacts[i].w;}
      color=mix(color,vec3(.38,.65,.72),clamp(ripple,0.,1.)*.5);color*=1.+min(ripple,0.)*.15;
      float fog=smoothstep(60.,420.,-vWorld.z);color=mix(color,vec3(.25,.43,.53),fog);
      gl_FragColor=vec4(color,1.);
    }
  `,side:THREE.DoubleSide});
  const water=new THREE.Mesh(waterGeometry,waterMaterial);water.frustumCulled=false;scene.add(water);
  scene.add(new THREE.HemisphereLight(0xd9f4ff,0x2c6075,2.8));
  const key=new THREE.DirectionalLight(0xffefd6,3.6);key.position.set(-8,14,12);scene.add(key);
  const rim=new THREE.DirectionalLight(0xa1dfff,2);rim.position.set(8,5,-8);scene.add(rim);
  const boats=tracks.map((track,index)=>{const boat=createSailboat();boat.scale.setScalar(index===0?1.45:1.3);scene.add(boat);return boat;});
  const up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3(),yaw=new THREE.Quaternion();
  const wakes=tracks.map(()=>{
    const geometry=new THREE.PlaneGeometry(8,3,30,10);geometry.rotateX(-Math.PI/2);geometry.translate(-3,0,0);
    const material=new THREE.ShaderMaterial({uniforms:shared,transparent:true,depthWrite:false,vertexShader:`uniform float uTime;varying vec2 vUv;${waveGLSL}void main(){vUv=uv;vec3 p=(modelMatrix*vec4(position,1.)).xyz;p.y=waveSample(p.xz,uTime).x+.025;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,fragmentShader:'varying vec2 vUv;void main(){float edge=abs(abs((vUv.y-.5)*2.)-(1.-vUv.x)*.75);float foam=exp(-edge*25.)*smoothstep(0.,.25,vUv.x)*(1.-vUv.x)*.32;gl_FragColor=vec4(.7,.89,.94,foam);}',side:THREE.DoubleSide});
    const wake=new THREE.Mesh(geometry,material);wake.frustumCulled=false;scene.add(wake);return wake;
  });
  return {
    dispose(){const resources=new Set();scene.traverse(object=>{if(object.geometry)resources.add(object.geometry);for(const material of [object.material].flat())if(material)resources.add(material);});for(const resource of resources)resource.dispose();},
    resize(width,height,horizon,pixelRatio){
      camera.aspect=width/height;
      const pitch=Math.atan((.5-horizon)*2*Math.tan(Math.PI/8));
      camera.lookAt(0,5.5+Math.tan(pitch)*40,-24);camera.updateProjectionMatrix();
      waterUniforms.uResolution.value.set(width*pixelRatio,height*pixelRatio);
    },
    render(renderer,seconds){
      boats.forEach((boat,index)=>{
        const span=2*(16-tracks[index].z)*Math.tan(Math.PI/8)*camera.aspect;
        const pose=boatPose(seconds,span,index);
        boat.position.set(pose.x,pose.height,pose.z);
        normal.set(-pose.slopeX,1,-pose.slopeZ).normalize();
        boat.quaternion.setFromUnitVectors(up,normal);yaw.setFromAxisAngle(up,-.30);boat.quaternion.multiply(yaw);
        wakes[index].position.set(pose.x,0,pose.z);
      });
      renderer.clearDepth();renderer.render(scene,camera);
    },
  };
}
