import * as THREE from 'three';

'use strict';
// STAGE 6. Complete single-file arena; all art and audio are generated locally.
// DUSTUP — all six revision stages in one file. No assets, frameworks, or build step.
// Juice: toon diorama + eyes/camera; pooled combat feedback; AI/showcase/countdown;
// gas/magnetic cubes/results/spectate; four attack families + telegraphed supers;
// day/night, adaptive synthesized score/SFX, touch and adaptive quality.
// Performance choices: low-poly prop silhouettes, shared muzzle glow/light, instanced
// projectile/trail/bomb/ring layers, pooled cube particles + low-poly smoke. Orthographic
// lens zoom gives the requested super camera punch without perspective distortion.
// Low: 300 particles, no prop outlines/decals/shadows/cloud shadows. Medium: 500 and
// 1024 shadows. High: 800 and 2048 shadows. Two consecutive sub-24 FPS seconds step down.
// Debug: ?debug=1 — N dummy, R super/ammo, G advance gas, T day/dusk/night.
// All gameplay, map, camera and quality tuning lives here.
const CONFIG = {
 map:{size:44,seed:8241,minConnected:.93,attempts:100,wallHeight:1.15,spawnClearance:2},
 player:{radius:.32,speed:5.2,acceleration:32,braking:40,turnSpeed:16},
 characters:{
  shotgunner:{name:'Rico',role:'Shotgunner',icon:'✹',color:0xff8c37,hp:3200,speed:3.4,reload:1.3,ammo:3,preferred:3.2,description:'Five-pellet cone. Super: a devastating wall-breaking blast.',attack:{type:'pellets',pellets:5,spread:.611,speed:17,range:5.5,damage:260,radius:.075,cooldown:.34,height:.8},super:{type:'blast',name:'BLAST WAVE',charge:5200,range:8,pellets:9,spread:.65,damage:460}},
  sharpshooter:{name:'Vex',role:'Sharpshooter',icon:'⌖',color:0xa967ed,hp:2400,speed:3.6,reload:1.6,ammo:3,preferred:8,description:'Six-shot rifle burst. Super: a piercing rail shot through rivals and walls.',attack:{type:'burst',pellets:1,shots:6,interval:.06,spread:0,speed:25,range:10,damage:180,radius:.065,cooldown:.62,height:.8},super:{type:'rail',name:'PIERCING SHOT',charge:4320,range:15,damage:2400}},
  thrower:{name:'Boomer',role:'Thrower',icon:'●',color:0x84d447,hp:2800,speed:3.3,reload:1.65,ammo:3,preferred:6,description:'Lob fused bombs over cover. Super: a five-bomb barrage over cover.',attack:{type:'bomb',speed:12,range:8,damage:900,radius:2,flight:.65,fuse:.25,arc:3,cooldown:.5,height:.8},super:{type:'bomb',name:'BARRAGE',charge:3600,range:9,damage:900,radius:2,flight:.65,fuse:.25,arc:4}},
  heavyweight:{name:'Bruno',role:'Heavyweight',icon:'◆',color:0xf05b67,hp:6500,speed:2.9,reload:1.1,ammo:3,preferred:1.1,description:'Huge HP and short-range punches. Super: leap over obstacles and slam the ground.',attack:{type:'punch',speed:15,range:1.8,spread:1.5,damage:700,cooldown:.6,height:.8},super:{type:'leap',name:'METEOR LEAP',charge:5600,range:8,damage:2400,radius:2.5,duration:.75,arc:4}}
 },
 abilities:{bombPool:32,ringPool:24,ringLife:.3,chargeFromBoxes:.25,railWidth:.22,heavyScale:1.35,throwerScale:.95},
 gas:{delay:26,startHalf:25,endHalf:4,duration:140,tick:1,baseDamage:350,damageStep:100,escalateEvery:20,exposureStep:75,escapeMargin:2.5,pathCost:35,lookAhead:6},
 cubes:{boxHp:2800,bonus:.10,pickupRadius:.85,searchRange:8,threatRange:5,boxRange:2.6},
 combat:{poolSize:160,recoilDecay:9,hitFlash:.12},
 match:{countdown:3,feedDuration:6,feedLimit:4,revealDuration:1.4,bushDetectRange:2.7},
 bots:{replan:.3,preferredRange:3.2,strafe:.55,waypointRadius:.16,leadLimit:.45,aimError:.6,strafeSwitchChance:.16,rangeTolerance:.35,firingRange:.9,reloadRetreat:1.3,probeDistance:.6,targetStickiness:.8,
  names:['RUST','MESA','FLINT','SAGE','ROOK','DUNE','ASH'],colors:[0xb76e55,0xa08cbe,0x9caa64,0x559c91,0xc19658,0x95776c,0x8b97b5],
  difficulties:{easy:{damage:.65,reaction:.65,aggression:.65,skill:.35},normal:{damage:.85,reaction:.38,aggression:.85,skill:.65},hard:{damage:1,reaction:.18,aggression:1,skill:.9}}},
 camera:{height:23,back:18,viewHeight:18,follow:6,lookAhead:1.5,speedZoom:.06,superPunch:.12,traumaScale:.9},
 effects:{particles:800,numbers:32,life:.6,numberLife:.8,gravity:8,shakeDecay:3,hitFlash:.2},
 audio:{volume:.24,sfxVolume:.8,maxVoices:20,range:24,pitchVariation:.08,musicVolume:.11,tempo:76,dangerTempo:62,tones:{shotgunner:[100,.13,'sawtooth',true],sharpshooter:[360,.07,'square',true],thrower:[260,.14,'sine',false],heavyweight:[80,.12,'triangle',true],hit:[190,.07,'triangle',true],explosion:[65,.28,'sawtooth',true],pickup:[780,.16,'sine',false],super:[220,.24,'sawtooth',true],win:[660,.5,'sine',false],loss:[150,.4,'triangle',false],tick:[540,.09,'sine',true],ready:[880,.22,'sine',false],step:[55,.045,'triangle',true],rustle:[340,.08,'triangle',true],ui:[620,.045,'sine',false],gas:[42,.28,'sine',true]}},
 lighting:{nightAt:120,dusk:.4,daySun:.85,nightSun:.45,dayAmbient:.45,nightAmbient:.42},
 touch:{deadZone:7,stickRadius:42},
 quality:{default:'high',low:{pixelRatio:1,shadows:false,shadowSize:512,particles:300},medium:{pixelRatio:1.25,shadows:true,shadowSize:1024,particles:500},high:{pixelRatio:1.75,shadows:true,shadowSize:2048,particles:800},dropFps:24,sampleSeconds:1,warmup:5},
 timing:{step:1/120,maxFrame:.05},
 palette:{swatch_064b47:0x064b47,fogNight:0x28344b,swatch_32203d:0x32203d,swatch_346343:0x346343,swatch_354755:0x354755,swatch_364454:0x364454,swatch_385b0b:0x385b0b,gunMetal:0x39495c,groundNight:0x3e465f,swatch_40245b:0x40245b,swatch_443457:0x443457,swatch_48554d:0x48554d,swatch_53605a:0x53605a,swatch_53664b:0x53664b,swatch_566982:0x566982,swatch_57497b:0x57497b,swatch_583044:0x583044,swatch_58b96c:0x58b96c,swatch_645074:0x645074,swatch_698da0:0x698da0,swatch_718467:0x718467,goggleGlass:0x71f6f2,bushDark:0x72c944,playerRing:0x80ffdb,hatBand:0x81402f,swatch_8effdf:0x8effdf,skyNight:0x959dcc,swatch_95dd68:0x95dd68,swatch_96e762:0x96e762,sunNight:0x9baaff,bushLight:0xb0eb4b,swatch_b6c65d:0xb6c65d,swatch_b8f58a:0xb8f58a,swatch_baff74:0xbaff74,swatch_c19a5f:0xc19a5f,swatch_c584ee:0xc584ee,smoke:0xc5a6c9,groundDay:0xc69781,shoreFoam:0xc6ffeb,swatch_c8ee77:0xc8ee77,swatch_c9ec66:0xc9ec66,swatch_cadd7c:0xcadd7c,swatch_d8a362:0xd8a362,swatch_d8ff84:0xd8ff84,swatch_d8ffbd:0xd8ffbd,swatch_dbb0ff:0xdbb0ff,swatch_ec956b:0xec956b,swatch_efffbf:0xefffbf,swatch_f49d85:0xf49d85,swatch_f9f3d8:0xf9f3d8,enemyWarning:0xff4c69,scarf:0xff5d97,enemyRing:0xff718b,cactusFlower:0xff7398,swatch_ff937b:0xff937b,hatCrown:0xffa647,swatch_ffad55:0xffad55,lampGlow:0xffb14b,swatch_ffc15b:0xffc15b,swatch_ffc647:0xffc647,swatch_ffc784:0xffc784,skin:0xffc796,swatch_ffcf5c:0xffcf5c,swatch_ffd781:0xffd781,swatch_ffd85a:0xffd85a,swatch_ffd99c:0xffd99c,swatch_ffda55:0xffda55,sunDay:0xffdfac,swatch_ffe0a0:0xffe0a0,swatch_ffe2a0:0xffe2a0,swatch_ffe36d:0xffe36d,swatch_ffe5ab:0xffe5ab,swatch_ffe7b7:0xffe7b7,skyDay:0xffe9d7,swatch_ffeaa8:0xffeaa8,swatch_ffebbf:0xffebbf,swatch_ffed93:0xffed93,swatch_ffed9c:0xffed9c,swatch_ffedab:0xffedab,swatch_fff5cf:0xfff5cf,white:0xffffff},
 art:{outline:0x252139,characterOutline:1.045,propOutline:1.025,eyeRate:.08,bushSway:.06,dustInterval:.15},
 juice:{heavyStop:.04,killStop:.09,heavyDamage:650,flash:.1,knockback:2,killSlow:.6,slowScale:.25,muzzleTime:.06,decalLife:4,decalPool:40,numberOvershoot:.4,magnetRange:2,magnetSpeed:6,telegraphTime:.45,punchAnticipation:.08,punchGap:.16},
 colors:{sand:0xffd695,edge:0xffc981,stone:0xf48a4b,bush:0x91d943,water:0x28c6c3,cream:0xffedb1,ink:0x252139,rose:0xf76588}
};
const suppliedSeed=new URLSearchParams(location.search).get('seed');if(suppliedSeed!==null&&/^\d{1,10}$/.test(suppliedSeed))CONFIG.map.seed=Number(suppliedSeed)>>>0;
const TILE={EMPTY:0,WALL:1,BUSH:2,WATER:3};
function rng(seed){return()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function approach(current,target,max){return current+Math.max(-max,Math.min(max,target-current));}

// The only dependency is r128. Geometry, textures and sounds are generated here.
const toonRamp=new THREE.DataTexture(new Uint8Array([65,160,255]),3,1,THREE.LuminanceFormat);
toonRamp.minFilter=toonRamp.magFilter=THREE.NearestFilter;toonRamp.needsUpdate=true;
// r128 MeshToonMaterial with the game's toon gradient ramp + sRGB fix.
// (The original file monkey-patched the global THREE object; as an ES module
// we subclass instead.)
class ToonMaterial extends THREE.MeshToonMaterial {
  constructor(options: any = {}) {
    const { roughness, metalness, ...rest } = options;
    super({ ...rest, gradientMap: toonRamp } as any);
    this.color.convertSRGBToLinear();
  }
}
function mergeParts(parts){const positions=[],normals=[],colors=[],tags=[];for(const part of parts){let g=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...(part.p||[0,0,0])),new THREE.Quaternion().setFromEuler(new THREE.Euler(...(part.r||[0,0,0]))),new THREE.Vector3(...(part.s||[1,1,1])));g.applyMatrix4(matrix);const c=new THREE.Color(part.color).convertSRGBToLinear(),a=g.attributes.position,n=g.attributes.normal;for(let i=0;i<a.count;i++){positions.push(a.getX(i),a.getY(i),a.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));colors.push(c.r,c.g,c.b);tags.push(part.tag||0);}g.dispose();}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('partTag',new THREE.Float32BufferAttribute(tags,1));return g;}
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#fff');g.addColorStop(.2,'#ffffffbc');g.addColorStop(1,'#ffffff00');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);}
const GLOW=glowTexture();
function outline(mesh,scale=CONFIG.art.propOutline){const m=new THREE.Mesh(mesh.geometry,new THREE.MeshBasicMaterial({color:CONFIG.art.outline,side:THREE.BackSide}));m.scale.setScalar(scale);mesh.add(m);m.userData.propOutline=true;return m;}
class Camera{
  // ---- injected field declarations (ported from JS) ----
  game!: any;
  punch!: any;
  target!: any;
 constructor(game){this.game=game;this.punch=0;this.target=new THREE.Vector3();}
 update(dt){const g=this.game,b=g.spectating?g.brawlers.find(b=>b.alive)||g.player:g.player;this.target.copy(b.position);if(['menu','select'].includes(g.state)){if(innerWidth>650)this.target.x+=4.5;else this.target.z+=3;}if(!['menu','select'].includes(g.state)){this.target.x+=Math.sin(b.aimAngle)*CONFIG.camera.lookAhead;this.target.z+=Math.cos(b.aimAngle)*CONFIG.camera.lookAhead;}g.focus.lerp(this.target,1-Math.exp(-CONFIG.camera.follow*dt));const trauma=g.reduceShake?0:Math.min(1,(g.effects?.shake||0)*3),shake=trauma*trauma*CONFIG.camera.traumaScale;this.punch=Math.max(0,this.punch-dt);const zoom=['menu','select'].includes(g.state)?1.7:1-b.velocity.length()/4*CONFIG.camera.speedZoom+this.punch+(g.finalSlow>0?.15:0);g.camera.zoom=zoom;g.camera.updateProjectionMatrix();g.camera.position.set(g.focus.x+Math.sin(g.visualTime*87)*shake,(['menu','select'].includes(g.state)?12:CONFIG.camera.height),g.focus.z+CONFIG.camera.back+Math.cos(g.visualTime*73)*shake);g.camera.lookAt(g.focus);g.camera.updateMatrixWorld();}
}

class World {
  // ---- injected field declarations (ported from JS) ----
  boxes!: any;
  combat!: any;
  effects!: any;
  audio!: any;
  scene!: any;
  size!: any;
  half!: any;
  spawns!: any;
  seed!: any;
  tiles!: any;
  connected!: any;
  reachable!: any;
  backdrop!: any;
  wallInstances!: any;
  wallMeshes!: any;
  wallKinds!: any;
  originalTiles!: any;
  mapRevision!: any;
  bushes!: any;
  bushData!: any;
  bushPulse!: any;
  dummy!: any;
  waterTexture!: any;
  originalReachable!: any;
  wallMatrices!: any;
 constructor(scene){this.scene=scene;this.size=CONFIG.map.size;this.half=this.size/2;this.spawns=[[22,36],[22,7],[7,22],[36,22],[8,8],[35,8],[8,35],[35,35]];this.generate();this.build();this.saveWalls();}
 index(x,z){return z*this.size+x;}
 tile(x,z){return x<0||z<0||x>=this.size||z>=this.size?TILE.WALL:this.tiles[this.index(x,z)];}
 blocked(x,z){const t=this.tile(x,z);return t===TILE.WALL||t===TILE.WATER||!!this.boxes?.some(box=>box.alive&&box.tx===x&&box.tz===z);}
 canOccupy(x,z,r=CONFIG.player.radius){
  for(let tz=Math.floor(z-r+this.half);tz<=Math.floor(z+r+this.half);tz++)for(let tx=Math.floor(x-r+this.half);tx<=Math.floor(x+r+this.half);tx++)if(this.blocked(tx,tz)){const dx=x-Math.max(tx-this.half,Math.min(tx-this.half+1,x)),dz=z-Math.max(tz-this.half,Math.min(tz-this.half+1,z));if(dx*dx+dz*dz<r*r)return false;}return true;
 }
 lineClear(a,b,walking=false){const dx=b.x-a.x,dz=b.z-a.z,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.18));for(let i=0;i<=steps;i++){const x=a.x+dx*i/steps,z=a.z+dz*i/steps;if(walking?!this.canOccupy(x,z):this.tile(Math.floor(x+this.half),Math.floor(z+this.half))===TILE.WALL)return false;}return true;}
 visibleTo(subject,observer){return subject.alive&&(subject===observer||subject.revealed>0||this.tile(Math.floor(subject.position.x+this.half),Math.floor(subject.position.z+this.half))!==TILE.BUSH||subject.position.distanceToSquared(observer.position)<CONFIG.match.bushDetectRange**2);}
 generate(){
  for(let attempt=0;attempt<CONFIG.map.attempts;attempt++){
   this.seed=CONFIG.map.seed+attempt;const random=rng(this.seed);this.tiles=new Uint8Array(this.size*this.size);
   const mirror=(x,z,t)=>{for(const a of [x,this.size-1-x])for(const b of [z,this.size-1-z])this.tiles[this.index(a,b)]=t;};
   for(let i=0;i<49;i++){const x=2+Math.floor(random()*19),z=2+Math.floor(random()*19);const type=i<25?TILE.WALL:i<42?TILE.BUSH:TILE.WATER;const w=1+Math.floor(random()*3),h=1+Math.floor(random()*2);for(let a=x;a<Math.min(22,x+w);a++)for(let b=z;b<Math.min(22,z+h);b++)mirror(a,b,type);}
   for(let a=0;a<this.size;a++){mirror(a,0,TILE.WALL);mirror(0,a,TILE.WALL);}
   for(const [x,z]of this.spawns)for(let a=-CONFIG.map.spawnClearance;a<=CONFIG.map.spawnClearance;a++)for(let b=-CONFIG.map.spawnClearance;b<=CONFIG.map.spawnClearance;b++)mirror(x+a,z+b,TILE.EMPTY);
   const seen=new Uint8Array(this.tiles.length),queue=[this.index(this.spawns[0][0],this.spawns[0][1])];seen[queue[0]]=1;let count=0;
   for(let head=0;head<queue.length;head++){const i=queue[head],x=i%this.size,z=Math.floor(i/this.size);count++;for(const [a,b]of [[x-1,z],[x+1,z],[x,z-1],[x,z+1]])if(!this.blocked(a,b)&&!seen[this.index(a,b)]){seen[this.index(a,b)]=1;queue.push(this.index(a,b));}}
   const total=this.tiles.reduce((n,t)=>n+(t===TILE.EMPTY||t===TILE.BUSH?1:0),0);this.connected=count/total;
   if(this.connected>=CONFIG.map.minConnected&&this.spawns.every(([x,z])=>seen[this.index(x,z)])){this.reachable=seen;return;}
  }
  throw new Error('Could not generate a connected arena.');
 }
 build(){
  const random=rng(this.seed+1000),canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d'),tile=1024/this.size;
  ctx.fillStyle='#ffd695';ctx.fillRect(0,0,1024,1024);
  for(let z=0;z<this.size;z++)for(let x=0;x<this.size;x++){ctx.fillStyle=(x+z)%2?'#ffe0a8':'#ffda9d';ctx.fillRect(x*tile,z*tile,tile,tile);if(this.tile(x,z)===TILE.WALL){const grad=ctx.createRadialGradient((x+.5)*tile,(z+.5)*tile,tile*.35,(x+.5)*tile,(z+.5)*tile,tile);grad.addColorStop(0,'#bd652575');grad.addColorStop(1,'#bd652500');ctx.fillStyle=grad;ctx.fillRect((x-.5)*tile,(z-.5)*tile,tile*2,tile*2);}}
  for(let i=0;i<4800;i++){const x=random()*1024,y=random()*1024;ctx.fillStyle=i%2?'#fff1c1':'#dba55d';ctx.beginPath();ctx.ellipse(x,y,1+random()*2,.5+random(),random()*3,0,7);ctx.fill();if(i%20===0){ctx.strokeStyle='#d39b5440';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+4,y+3);ctx.lineTo(x+3,y+7);ctx.stroke();}}
  const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
  const ground=new THREE.Mesh(new THREE.BoxGeometry(44,.5,44),new ToonMaterial({map:texture}));ground.position.y=-.27;ground.receiveShadow=true;this.scene.add(ground);
  this.backdrop=new THREE.Mesh(new THREE.PlaneGeometry(250,250),new THREE.MeshBasicMaterial({color:CONFIG.colors.edge}));this.backdrop.rotation.x=-Math.PI/2;this.backdrop.position.y=-.54;this.scene.add(this.backdrop);
  const count=this.tiles.reduce((n,t)=>n+(t===TILE.WALL),0),dummy=new THREE.Object3D(),color=new THREE.Color();this.wallInstances=new Map();this.wallMeshes=[];this.wallKinds=new Map();this.originalTiles=this.tiles.slice();this.mapRevision=0;
  const box=(x,y,z)=>new THREE.BoxGeometry(x,y,z),sphere=r=>new THREE.SphereGeometry(r,8,6),cylinder=(r,h)=>new THREE.CylinderGeometry(r,r,h,10);
  const variants=[
   [{geometry:new THREE.IcosahedronGeometry(.66,1),s:[.83,1,.83],color:CONFIG.colors.stone},{geometry:box(.78,.12,.78),p:[0,.45,0],color:CONFIG.palette.swatch_c9ec66}],
   [{geometry:box(.87,.94,.87),color:CONFIG.colors.cream},...[-.31,0,.31].map(x=>({geometry:box(.025,.82,.9),p:[x,0,0],color:CONFIG.palette.swatch_d8a362})),...[-.39,.39].map(y=>({geometry:box(.94,.09,.94),p:[0,y,0],color:CONFIG.palette.swatch_698da0}))],
   [{geometry:cylinder(.42,.94),color:CONFIG.palette.swatch_ffad55},...[-.32,.32].map(y=>({geometry:cylinder(.44,.09),p:[0,y,0],color:CONFIG.palette.swatch_566982}))],
   [{geometry:cylinder(.21,.95),color:CONFIG.palette.swatch_58b96c},{geometry:sphere(.21),p:[0,.48,0],color:CONFIG.palette.swatch_96e762},...[-1,1].flatMap(side=>[{geometry:box(.34,.18,.18),p:[side*.22,side*.12,0],color:CONFIG.palette.swatch_58b96c},{geometry:cylinder(.12,.4),p:[side*.36,.15+side*.12,0],color:CONFIG.palette.swatch_96e762}]),{geometry:sphere(.12),p:[0,.7,0],s:[1,.5,1],color:CONFIG.palette.cactusFlower}]
  ];
  const kindAt=(x,z)=>x===0||z===0||x===43||z===43?0:(Math.min(x,43-x)*7+Math.min(z,43-z)*3)%4;const kindCounts=[0,0,0,0];for(let z=0;z<this.size;z++)for(let x=0;x<this.size;x++)if(this.tile(x,z)===TILE.WALL)kindCounts[kindAt(x,z)]++;for(let k=0;k<4;k++){const parts=variants[k],geometry=mergeParts(parts),mesh=new THREE.InstancedMesh(geometry,new ToonMaterial({vertexColors:true}),kindCounts[k]),ink=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({color:CONFIG.art.outline,side:THREE.BackSide}),kindCounts[k]);mesh.castShadow=mesh.receiveShadow=true;ink.userData.propOutline=true;this.wallMeshes.push(mesh,ink);this.scene.add(mesh,ink);}
  const next=[0,0,0,0];for(let z=0;z<this.size;z++)for(let x=0;x<this.size;x++)if(this.tile(x,z)===TILE.WALL){const edge=x===0||z===0||x===43||z===43,kind=kindAt(x,z),h=edge?2.6:CONFIG.map.wallHeight,slot=next[kind]++;this.wallInstances.set(this.index(x,z),{kind,slot});this.wallKinds.set(this.index(x,z),kind);for(let j=0;j<2;j++){dummy.position.set(x-this.half+.5,h/2,z-this.half+.5);dummy.rotation.set(0,0,0);dummy.scale.set(1,h,1).multiplyScalar(j?CONFIG.art.propOutline:1);dummy.updateMatrix();this.wallMeshes[kind*2+j].setMatrixAt(slot,dummy.matrix);}}
  const bushesCount=this.tiles.reduce((n,t)=>n+(t===TILE.BUSH),0)*4;this.bushes=new THREE.InstancedMesh(new THREE.SphereGeometry(.39,7,5),new ToonMaterial({color:CONFIG.palette.white}),bushesCount);this.bushes.receiveShadow=true;this.bushData=[];this.bushPulse=new Map();let bi=0;
  for(let z=0;z<this.size;z++)for(let x=0;x<this.size;x++)if(this.tile(x,z)===TILE.BUSH)for(let j=0;j<4;j++){const data={x:x-this.half+.5+(j%2-.5)*.42,z:z-this.half+.5+(Math.floor(j/2)-.5)*.42,y:.3+random()*.15,tile:this.index(x,z),phase:random()*6};this.bushData.push(data);dummy.position.set(data.x,data.y,data.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1.1,1);dummy.updateMatrix();this.bushes.setMatrixAt(bi,dummy.matrix);this.bushes.setColorAt(bi++,color.setHex(j%2?CONFIG.palette.bushDark:CONFIG.palette.bushLight).convertSRGBToLinear());}this.scene.add(this.bushes);this.dummy=dummy;
  const wc=document.createElement('canvas');wc.width=wc.height=128;const wx=wc.getContext('2d');wx.fillStyle='#29bebb';wx.fillRect(0,0,128,128);wx.strokeStyle='#bcffe5';wx.lineWidth=2;for(let i=0;i<10;i++){wx.beginPath();wx.ellipse(random()*128,random()*128,5+random()*15,2,0,0,Math.PI);wx.stroke();}this.waterTexture=new THREE.CanvasTexture(wc);this.waterTexture.wrapS=this.waterTexture.wrapT=THREE.RepeatWrapping;
  const water=new THREE.InstancedMesh(box(.98,.07,.98),new ToonMaterial({map:this.waterTexture,emissive:CONFIG.palette.swatch_064b47,emissiveIntensity:.3}),this.tiles.reduce((n,t)=>n+(t===TILE.WATER),0));let ai=0;for(let z=0;z<this.size;z++)for(let x=0;x<this.size;x++)if(this.tile(x,z)===TILE.WATER){dummy.position.set(x-this.half+.5,.015,z-this.half+.5);dummy.scale.set(1,1,1);dummy.updateMatrix();water.setMatrixAt(ai++,dummy.matrix);}this.scene.add(water);const shore=[];for(let z=0;z<this.size;z++)for(let x=0;x<this.size;x++)if(this.tile(x,z)===TILE.WATER)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]])if(this.tile(x+dx,z+dz)!==TILE.WATER)shore.push({x:x-this.half+.5+dx*.47,z:z-this.half+.5+dz*.47,vertical:!!dx});const foam=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,.05),new THREE.MeshBasicMaterial({color:CONFIG.palette.shoreFoam,transparent:true,opacity:.7,depthWrite:false}),shore.length);shore.forEach((p,i)=>{dummy.position.set(p.x,.058,p.z);dummy.rotation.set(-Math.PI/2,0,p.vertical?Math.PI/2:0);dummy.scale.set(1,1,1);dummy.updateMatrix();foam.setMatrixAt(i,dummy.matrix);});this.scene.add(foam);
  const grass=new THREE.InstancedMesh(mergeParts([{geometry:new THREE.ConeGeometry(.09,.22,3),color:CONFIG.palette.swatch_b6c65d},{geometry:new THREE.ConeGeometry(.08,.18,3),p:[.08,0,0],color:CONFIG.palette.swatch_cadd7c}]),new ToonMaterial({vertexColors:true}),180);for(let i=0;i<180;i++){dummy.position.set((random()-.5)*42,.05,(random()-.5)*42);dummy.scale.setScalar(.6+random());dummy.rotation.set(0,random()*6,0);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}this.scene.add(grass);
 }
 update(time,dt){this.waterTexture.offset.set(time*.035,time*.016);for(const [key,value]of this.bushPulse){if(value<=dt)this.bushPulse.delete(key);else this.bushPulse.set(key,value-dt);}for(let i=0;i<this.bushData.length;i++){const b=this.bushData[i],pulse=this.bushPulse.get(b.tile)||0;this.dummy.position.set(b.x+Math.sin(time*2+b.phase)*CONFIG.art.bushSway,b.y,b.z);this.dummy.rotation.set(0,0,Math.sin(time*2+b.phase)*.04);this.dummy.scale.set(1+pulse*.4,1.1-pulse*.7,1+pulse*.4);this.dummy.updateMatrix();this.bushes.setMatrixAt(i,this.dummy.matrix);}this.bushes.instanceMatrix.needsUpdate=true;}
 rustle(x,z){const key=this.index(Math.floor(x+this.half),Math.floor(z+this.half));if(this.tiles[key]!==TILE.BUSH||this.bushPulse.has(key))return;this.bushPulse.set(key,.35);this.effects?.burst(x,.5,z,CONFIG.colors.bush,5,.45);this.audio?.play('rustle',{x,z});}
 breakWalls(x,z,radius,cratesOnly=false){let changed=false;const zero=new THREE.Matrix4().makeScale(0,0,0);for(let tz=Math.floor(z-radius+this.half);tz<=Math.floor(z+radius+this.half);tz++)for(let tx=Math.floor(x-radius+this.half);tx<=Math.floor(x+radius+this.half);tx++){if(tx<=0||tz<=0||tx>=this.size-1||tz>=this.size-1||this.tile(tx,tz)!==TILE.WALL||Math.hypot(tx-this.half+.5-x,tz-this.half+.5-z)>radius+.5)continue;const index=this.index(tx,tz);if(cratesOnly&&this.wallKinds.get(index)!==1)continue;const instance=this.wallInstances.get(index);this.tiles[index]=TILE.EMPTY;this.reachable[index]=1;for(const mesh of this.wallMeshes.slice(instance.kind*2,instance.kind*2+2)){mesh.setMatrixAt(instance.slot,zero);mesh.instanceMatrix.needsUpdate=true;}changed=true;}if(changed)this.mapRevision++;}
 saveWalls(){this.originalReachable=this.reachable.slice();this.wallMatrices=this.wallMeshes.map(mesh=>mesh.instanceMatrix.array.slice());}
 resetWalls(){if(!this.mapRevision)return;this.tiles.set(this.originalTiles);this.reachable.set(this.originalReachable);this.wallMeshes.forEach((mesh,i)=>{mesh.instanceMatrix.array.set(this.wallMatrices[i]);mesh.instanceMatrix.needsUpdate=true;});this.mapRevision++;}
 move(position,dx,dz,radius){
  // Axis-separated swept movement; bisection keeps tight corners penetration-free.
  const clear=()=>{
   for(let z=Math.floor(position.z-radius+this.half);z<=Math.floor(position.z+radius+this.half);z++)
    for(let x=Math.floor(position.x-radius+this.half);x<=Math.floor(position.x+radius+this.half);x++)if(this.blocked(x,z)){
     const ax=position.x-Math.max(x-this.half,Math.min(x-this.half+1,position.x));
     const az=position.z-Math.max(z-this.half,Math.min(z-this.half+1,position.z));
     if(ax*ax+az*az<radius*radius)return false;
    }
   return true;
  };
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/(radius*.5)));
  for(let step=0;step<steps;step++)for(const axis of ['x','z']){
   const start=position[axis],delta=(axis==='x'?dx:dz)/steps;
   position[axis]=start+delta;
   if(!clear()){
    let low=0,high=1;
    for(let iteration=0;iteration<14;iteration++){
     const middle=(low+high)/2;position[axis]=start+delta*middle;
     if(clear())low=middle;else high=middle;
    }
    position[axis]=start+delta*low;
   }
  }
 }
}

class Brawler {
  // ---- injected field declarations (ported from JS) ----
  knockZ!: any;
  id!: any;
  name!: any;
  world!: any;
  position!: any;
  velocity!: any;
  group!: any;
  body!: any;
  phase!: any;
  classKey!: any;
  variants!: any;
  details!: any;
  legs!: any;
  arms!: any;
  gloves!: any;
  weapon!: any;
  flashMaterial!: any;
  figure!: any;
  ink!: any;
  faceCanvas!: any;
  faceTexture!: any;
  face!: any;
  blinkAt!: any;
  eyeClock!: any;
  marker!: any;
  shaders!: any;
  data!: any;
  superCharge!: any;
  pendingSuper!: any;
  firstPunchTimer!: any;
  comboTimer!: any;
  deathTime!: any;
  burst!: any;
  leap!: any;
  aimDistance!: any;
  punchTime!: any;
  knockX!: any;
  lastBush!: any;
  isDummy!: any;
  maxHp!: any;
  hp!: any;
  cubes!: any;
  eliminatedBy!: any;
  alive!: any;
  kills!: any;
  damageDealt!: any;
  ammo!: any;
  cooldown!: any;
  reloadProgress!: any;
  ammoTimers!: any;
  recoil!: any;
  flash!: any;
  revealed!: any;
  damageScale!: any;
  aimAngle!: any;
  dustClock!: any;
 constructor(scene,world,id=0){this.id=id;this.name=id===0?'YOU':CONFIG.bots.names[id-1];this.world=world;this.position=new THREE.Vector3();this.velocity=new THREE.Vector2();this.group=new THREE.Group();this.body=new THREE.Group();this.group.add(this.body);scene.add(this.group);this.phase=0;this.classKey=Object.keys(CONFIG.characters)[id%4];this.variants={};this.details={};this.legs=[];this.arms=[];this.gloves=[];this.weapon=new THREE.Group();this.body.add(this.weapon);this.flashMaterial=new ToonMaterial({vertexColors:true});this.figure=new THREE.Mesh(new THREE.BufferGeometry(),this.flashMaterial);this.figure.castShadow=true;this.body.add(this.figure);this.ink=outline(this.figure,CONFIG.art.characterOutline);this.ink.userData.propOutline=false;
  this.faceCanvas=document.createElement('canvas');this.faceCanvas.width=128;this.faceCanvas.height=64;this.faceTexture=new THREE.CanvasTexture(this.faceCanvas);this.faceTexture.encoding=THREE.sRGBEncoding;this.face=new THREE.Mesh(new THREE.PlaneGeometry(.61,.31),new THREE.MeshBasicMaterial({map:this.faceTexture,transparent:true,depthWrite:false}));this.face.position.set(0,1.31,.381);this.body.add(this.face);this.blinkAt=performance.now()/1000+1+Math.random()*4;this.eyeClock=0;this.paintEyes(0);
  this.marker=new THREE.Mesh(new THREE.RingGeometry(.39,.48,24),new THREE.MeshBasicMaterial({color:id===0?CONFIG.palette.playerRing:CONFIG.palette.enemyRing,side:THREE.DoubleSide,transparent:true,opacity:.9}));this.marker.rotation.x=-Math.PI/2;this.marker.position.y=.025;this.group.add(this.marker);this.setClass(this.classKey);
 }
 makeFigure(key){const data=CONFIG.characters[key],heavy=key==='heavyweight',parts=[],add=(geometry,color,p=null,s=null,tag=0,r=null)=>parts.push({geometry,color,p,s,tag,r}),sphere=r=>new THREE.SphereGeometry(r,10,7),box=(x,y,z)=>new THREE.BoxGeometry(x,y,z),skin=CONFIG.palette.skin,ink=CONFIG.art.outline;
  add(sphere(.36),data.color,[0,.72,0],heavy?[1.5,1.3,1.15]:[.85,1,.75]);add(sphere(heavy?.25:.4),skin,[0,1.31,0],[1,.95,1]);
  for(const side of [-1,1]){add(sphere(.17),ink,[side*.18,.16,.08],[1,1,1.45],side);add(sphere(heavy?.26:.18),heavy?data.color:skin,[side*(heavy?.49:.34),.7,.17],[1,1,1],side*2);}
  if(key==='shotgunner'){add(new THREE.CylinderGeometry(.55,.55,.07,12),CONFIG.palette.hatBand,[0,1.65,0]);add(new THREE.CylinderGeometry(.29,.34,.24,10),CONFIG.palette.hatCrown,[0,1.78,0]);add(box(.24,.2,.65),CONFIG.palette.gunMetal,[.3,.8,.5]);add(box(.27,.12,.3),CONFIG.palette.swatch_ffe2a0,[.3,.7,.3]);}
  if(key==='sharpshooter'){add(box(.72,.12,.2),CONFIG.palette.swatch_40245b,[0,1.49,.31]);for(const side of [-1,1])add(sphere(.15),CONFIG.palette.goggleGlass,[side*.18,1.5,.37],[1,.55,.4]);add(new THREE.TorusGeometry(.26,.1,5,12),CONFIG.palette.scarf,[0,1.01,0],null,0,[Math.PI/2,0,0]);add(box(.19,.17,1.08),CONFIG.palette.swatch_443457,[.31,.78,.6]);add(box(.13,.08,.35),CONFIG.palette.swatch_efffbf,[.31,.88,.84]);}
  if(key==='thrower'){add(box(.61,.63,.31),CONFIG.palette.swatch_ffc647,[0,.82,-.34]);add(new THREE.CylinderGeometry(.075,.075,.7,6),CONFIG.palette.swatch_d8ffbd,[-.2,1.12,-.33]);add(sphere(.22),CONFIG.palette.swatch_354755,[.38,.8,.26]);add(box(.04,.12,.04),CONFIG.palette.swatch_ffed93,[.38,1.07,.26]);add(new THREE.CylinderGeometry(.4,.4,.09,10),data.color,[0,1.64,0]);}
  if(heavy)for(const side of [-1,1]){add(sphere(.24),CONFIG.palette.swatch_364454,[side*.45,.98,0],[1,.65,1]);add(new THREE.ConeGeometry(.09,.24,5),CONFIG.palette.swatch_ffe7b7,[side*.47,1.2,0]);}
  this.figure.geometry.dispose();this.figure.geometry=mergeParts(parts);this.ink.geometry=this.figure.geometry;this.face.scale.setScalar(heavy?.62:1);this.face.position.z=heavy?.243:.381;
  const animate=shader=>{shader.uniforms.walk={value:0};shader.uniforms.stride={value:0};shader.uniforms.punch={value:0};this.shaders??=[];this.shaders.push(shader);shader.vertexShader='attribute float partTag; uniform float walk; uniform float stride; uniform float punch;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.z += sin(walk + (partTag < 0.0 ? 3.14159 : 0.0)) * min(abs(partTag),1.0) * stride * .14; transformed.z += abs(partTag)>1.5 ? sin(punch*15.7)*.28 : 0.0;');};this.shaders=[];this.flashMaterial.onBeforeCompile=animate;this.ink.material.onBeforeCompile=animate;this.flashMaterial.needsUpdate=this.ink.material.needsUpdate=true;
 }
 paintEyes(time){const ctx=this.faceCanvas.getContext('2d');ctx.clearRect(0,0,128,64);const blink=time>this.blinkAt&&time<this.blinkAt+.12;if(time>this.blinkAt+.12)this.blinkAt=time+2+Math.random()*4;for(const x of [36,92]){ctx.fillStyle='#252139';ctx.beginPath();ctx.ellipse(x,31,25,blink?3:27,0,0,7);ctx.fill();if(!blink){ctx.fillStyle='#fff9e9';ctx.beginPath();ctx.ellipse(x,29,20,this.flash>0?11:23,0,0,7);ctx.fill();ctx.fillStyle='#282139';ctx.beginPath();ctx.ellipse(x+Math.sin(this.aimAngle||0)*5,30,this.hp<this.maxHp*.3?5:8,12,0,0,7);ctx.fill();ctx.fillStyle='white';ctx.fillRect(x-3,21,5,5);}}this.faceTexture.needsUpdate=true;}
 setClass(key){this.classKey=key;this.data=CONFIG.characters[key];this.makeFigure(key);this.reset();}
 reset(){const [x,z]=this.world.spawns[this.id];this.position.set(x-this.world.half+.5,0,z-this.world.half+.5);this.group.position.copy(this.position);this.group.visible=true;this.body.scale.setScalar(this.classKey==='heavyweight'?CONFIG.abilities.heavyScale:this.classKey==='thrower'?CONFIG.abilities.throwerScale:1);this.weapon.position.z=0;this.velocity.set(0,0);this.superCharge=0;this.pendingSuper=null;this.firstPunchTimer=0;this.comboTimer=0;this.deathTime=0;this.burst=null;this.leap=null;this.aimDistance=this.data.attack.range;this.punchTime=0;this.group.position.y=0;this.knockX=this.knockZ=0;this.lastBush=null;this.isDummy=false;this.maxHp=this.data.hp;this.hp=this.maxHp;this.cubes=0;this.eliminatedBy=null;this.alive=true;this.kills=0;this.damageDealt=0;this.ammo=this.data.ammo;this.cooldown=0;this.reloadProgress=0;this.ammoTimers=Array(this.data.ammo).fill(0);this.recoil=0;this.flash=0;this.revealed=0;this.damageScale=1;this.aimAngle=Math.PI;this.body.rotation.y=this.aimAngle;this.flashMaterial.emissive.setHex(0);}
 collectCube(){if(!this.alive)return;this.cubes++;const oldMax=this.maxHp;this.maxHp=Math.round(this.data.hp*(1+this.cubes*CONFIG.cubes.bonus));this.hp=Math.min(this.maxHp,this.hp+this.maxHp-oldMax);}
 updateWeapon(dt){this.cooldown=Math.max(0,this.cooldown-dt);for(let i=0;i<this.ammoTimers.length;i++)this.ammoTimers[i]=Math.max(0,this.ammoTimers[i]-dt);this.ammo=this.ammoTimers.filter(t=>t<=0).length;const pending=this.ammoTimers.filter(t=>t>0);this.reloadProgress=pending.length?this.data.reload-Math.min(...pending):0;this.recoil=Math.max(0,this.recoil-dt*CONFIG.combat.recoilDecay);this.weapon.position.z=-this.recoil*.16;this.punchTime=Math.max(0,this.punchTime-dt);}
 update(dt,input){if(!this.alive)return;this.flash=Math.max(0,this.flash-dt);this.revealed=Math.max(0,this.revealed-dt);this.flashMaterial.emissive.setHex(this.flash>0?CONFIG.palette.white:0);this.updateWeapon(dt);if(this.leap)return;const direction=input.direction();const moving=direction.lengthSq()>0;const rate=moving?CONFIG.player.acceleration:CONFIG.player.braking;this.velocity.x=approach(this.velocity.x,direction.x*this.data.speed,rate*dt);this.velocity.y=approach(this.velocity.y,direction.y*this.data.speed,rate*dt);this.world.move(this.position,(this.velocity.x+(this.knockX||0))*dt,(this.velocity.y+(this.knockZ||0))*dt,CONFIG.player.radius);this.knockX*=Math.exp(-12*dt);this.knockZ*=Math.exp(-12*dt);this.group.position.copy(this.position);
  const speed=this.velocity.length();
  if(input.hasAim)this.body.rotation.y=this.aimAngle;
  else if(speed>.1){const angle=Math.atan2(this.velocity.x,this.velocity.y),delta=Math.atan2(Math.sin(angle-this.body.rotation.y),Math.cos(angle-this.body.rotation.y));this.body.rotation.y+=delta*(1-Math.exp(-CONFIG.player.turnSpeed*dt));this.aimAngle=this.body.rotation.y;}
  this.eyeClock+=dt;if(this.eyeClock>=CONFIG.art.eyeRate){this.eyeClock=0;this.paintEyes(performance.now()/1000);}this.dustClock=(this.dustClock||0)+dt;if(speed>1&&this.dustClock>CONFIG.art.dustInterval){this.dustClock=0;this.world.effects?.burst(this.position.x,.08,this.position.z,CONFIG.colors.cream,2,.2);this.world.audio?.play('step',this.position);this.world.effects?.decal(this.position.x,this.position.z,.19);const tx=Math.floor(this.position.x+this.world.half),tz=Math.floor(this.position.z+this.world.half);if([[tx-1,tz],[tx+1,tz],[tx,tz-1],[tx,tz+1]].some(([x,z])=>this.world.tile(x,z)===TILE.WATER))this.world.combat?.ring(this.position.x,this.position.z,.4);}
  const tile=this.world.tile(Math.floor(this.position.x+this.world.half),Math.floor(this.position.z+this.world.half));const bushKey=tile===TILE.BUSH?this.world.index(Math.floor(this.position.x+this.world.half),Math.floor(this.position.z+this.world.half)):null;if(bushKey!==this.lastBush){if(this.lastBush!==null)this.world.rustle(this.lastBush%this.world.size-this.world.half+.5,Math.floor(this.lastBush/this.world.size)-this.world.half+.5);if(bushKey!==null)this.world.rustle(this.position.x,this.position.z);this.lastBush=bushKey;}this.flashMaterial.transparent=this.id===0&&tile===TILE.BUSH;this.flashMaterial.opacity=this.flashMaterial.transparent?.55:1;
  this.phase+=dt*speed*2.8;for(const shader of this.shaders||[]){shader.uniforms.punch.value=this.punchTime;shader.uniforms.walk.value=this.phase;shader.uniforms.stride.value=Math.min(1,speed/this.data.speed);}const stride=Math.min(1,speed/this.data.speed);this.body.position.y=Math.abs(Math.sin(this.phase))*.075*stride+Math.sin(performance.now()/700)*.014;this.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(this.phase+i*Math.PI)*.65*stride);this.arms.forEach(arm=>arm.rotation.x=-.65);const size=this.classKey==='heavyweight'?CONFIG.abilities.heavyScale:this.classKey==='thrower'?CONFIG.abilities.throwerScale:1;this.body.scale.set(size*(1+this.recoil*.035),size*(1-this.recoil*.04),size*(1+this.recoil*.035));if(this.classKey==='heavyweight')this.gloves.forEach((glove,i)=>glove.position.z=.28+(i===0?1:.6)*Math.sin(this.punchTime/.2*Math.PI)*.38);
 }
}


// Projectiles use swept segment collisions, so fast pellets cannot tunnel through walls.
class Combat {
  // ---- injected field declarations (ported from JS) ----
  audio!: any;
  effects!: any;
  powerCubes!: any;
  cameraRig!: any;
  world!: any;
  ray!: any;
  plane!: any;
  point!: any;
  projected!: any;
  shots!: any;
  totalDamage!: any;
  bulletInstances!: any;
  trails!: any;
  zeroMatrix!: any;
  renderDummy!: any;
  bulletColor!: any;
  playerBulletMaterial!: any;
  enemyBulletMaterial!: any;
  bullets!: any;
  superMaterial!: any;
  bombs!: any;
  bombInstances!: any;
  markerInstances!: any;
  ringInstances!: any;
  rings!: any;
  beams!: any;
  aimRing!: any;
  arc!: any;
  warningRings!: any;
  brawlers!: any;
  onEliminate!: any;
  fan!: any;
  reticle!: any;
  arrow!: any;
 constructor(scene,world){
  this.world=world;this.ray=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),-CONFIG.characters.shotgunner.attack.height);this.point=new THREE.Vector3();this.projected=new THREE.Vector3();this.shots=0;this.totalDamage=0;
  const geometry=new THREE.SphereGeometry(1,6,4),material=new THREE.MeshBasicMaterial({color:CONFIG.palette.swatch_ffed9c});
  this.bulletInstances=new THREE.InstancedMesh(geometry,material,CONFIG.combat.poolSize);this.bulletInstances.frustumCulled=false;this.trails=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({color:CONFIG.palette.white,transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false}),CONFIG.combat.poolSize);this.trails.frustumCulled=false;scene.add(this.bulletInstances,this.trails);this.zeroMatrix=new THREE.Matrix4().makeScale(0,0,0);this.renderDummy=new THREE.Object3D();this.bulletColor=new THREE.Color();this.playerBulletMaterial=material;this.enemyBulletMaterial=new THREE.MeshBasicMaterial({color:CONFIG.palette.swatch_ff937b});
  this.bullets=Array.from({length:CONFIG.combat.poolSize},()=>{const mesh=new THREE.Mesh(geometry,material);mesh.scale.set(.075,.075,.24);mesh.visible=false;return{mesh,active:false,x:0,z:0,dx:0,dz:0,remaining:0,damage:0};});
  this.superMaterial=new THREE.MeshBasicMaterial({color:CONFIG.palette.swatch_ffcf5c});const bombGeometry=new THREE.SphereGeometry(1,10,8),ringGeometry=new THREE.RingGeometry(.9,1,32),bombMaterial=new ToonMaterial({color:CONFIG.palette.swatch_645074,emissive:CONFIG.palette.swatch_32203d});
  this.bombs=Array.from({length:CONFIG.abilities.bombPool},()=>{const mesh=new THREE.Mesh(bombGeometry,bombMaterial),marker=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:CONFIG.palette.swatch_ec956b,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}));marker.rotation.x=-Math.PI/2;mesh.visible=marker.visible=false;return{mesh,marker,active:false};});
  this.bombInstances=new THREE.InstancedMesh(bombGeometry,bombMaterial,CONFIG.abilities.bombPool);this.markerInstances=new THREE.InstancedMesh(ringGeometry,new THREE.MeshBasicMaterial({color:CONFIG.palette.white,transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}),CONFIG.abilities.bombPool);this.ringInstances=new THREE.InstancedMesh(ringGeometry,new THREE.MeshBasicMaterial({color:CONFIG.palette.swatch_ffd781,transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}),CONFIG.abilities.ringPool);for(const m of [this.bombInstances,this.markerInstances,this.ringInstances]){m.frustumCulled=false;scene.add(m);}
  this.rings=Array.from({length:CONFIG.abilities.ringPool},()=>{const mesh=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:CONFIG.palette.swatch_ffd781,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.visible=false;return{mesh,life:0,radius:1};});
  this.beams=Array.from({length:8},()=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),this.superMaterial);mesh.visible=false;scene.add(mesh);return{mesh,life:0};});
  this.aimRing=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:CONFIG.palette.swatch_ffd85a,transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));this.arc=new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(33*3),3)),new THREE.LineBasicMaterial({color:CONFIG.palette.swatch_ffeaa8,transparent:true,opacity:.75}));this.arc.frustumCulled=false;scene.add(this.arc);this.warningRings=Array.from({length:8},()=>{const m=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:CONFIG.palette.enemyWarning,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.visible=false;scene.add(m);return m;});this.aimRing.rotation.x=-Math.PI/2;this.aimRing.visible=false;scene.add(this.aimRing);
  this.brawlers=[];this.onEliminate=()=>{};
  const spread=CONFIG.characters.shotgunner.attack.spread,range=CONFIG.characters.shotgunner.attack.range,vertices=[];
  for(let i=0;i<24;i++){const a=-spread/2+spread*i/24,b=-spread/2+spread*(i+1)/24;vertices.push(0,.035,0,Math.sin(a)*range,.035,Math.cos(a)*range,Math.sin(b)*range,.035,Math.cos(b)*range);}
  const fanGeometry=new THREE.BufferGeometry();fanGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));this.fan=new THREE.Mesh(fanGeometry,new THREE.MeshBasicMaterial({color:CONFIG.palette.swatch_fff5cf,transparent:true,opacity:.10,depthWrite:false,side:THREE.DoubleSide}));scene.add(this.fan);
  this.reticle=new THREE.Mesh(new THREE.RingGeometry(.16,.20,24),new THREE.MeshBasicMaterial({color:CONFIG.palette.white,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));const arrowGeo=new THREE.BufferGeometry();arrowGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.2,0,-.3,.2,0,-.3,0,0,.2],3));this.arrow=new THREE.Mesh(arrowGeo,new THREE.MeshBasicMaterial({color:CONFIG.palette.swatch_fff5cf,side:THREE.DoubleSide,transparent:true,opacity:.7}));scene.add(this.arrow);this.reticle.rotation.x=-Math.PI/2;scene.add(this.reticle);
 }
 reset(){this.shots=0;this.totalDamage=0;for(const bomb of this.bombs){bomb.active=false;bomb.mesh.visible=bomb.marker.visible=false;}for(const r of [...this.rings,...this.beams]){r.life=0;r.mesh.visible=false;}for(const b of this.bullets){b.active=false;b.mesh.visible=false;b.owner=null;}}
 autoAim(player,superAim=false){const range=superAim?player.data.super.range:player.data.attack.range;let target=null,distance=Infinity;for(const candidate of [...this.brawlers,...(this.world.boxes||[])]){if(candidate===player||!candidate.alive||candidate.leap||!this.world.visibleTo(candidate,player))continue;const d=player.position.distanceToSquared(candidate.position);if(d<distance&&d<=range*range&&(player.classKey==='thrower'||this.world.lineClear(player.position,candidate.position))){target=candidate;distance=d;}}if(target){player.aimAngle=Math.atan2(target.position.x-player.position.x,target.position.z-player.position.z);player.aimDistance=Math.sqrt(distance);}}
 aim(player,input,camera){if(input.touchAutoLocked)return;if(input.touchAimActive){const v=input.touchAim,tilt=CONFIG.camera.height/Math.hypot(CONFIG.camera.height,CONFIG.camera.back);player.aimAngle=Math.atan2(v.x,v.y/tilt);player.aimDistance=Math.min(1,v.length())*(input.superHeld||input.superQueued?player.data.super.range:player.data.attack.range);return;}if(!input.hasAim)return;this.ray.setFromCamera(input.pointer,camera);if(this.ray.ray.intersectPlane(this.plane,this.point)){const dx=this.point.x-player.position.x,dz=this.point.z-player.position.z;player.aimDistance=Math.hypot(dx,dz);if(dx*dx+dz*dz>.01)player.aimAngle=Math.atan2(dx,dz);}}
 multiplier(owner){return owner.damageScale*(1+owner.cubes*CONFIG.cubes.bonus);}
 emit(owner,attack,angle,superPower=false){const bullet=this.bullets.find(b=>!b.active);if(!bullet)return false;Object.assign(bullet,{active:true,x:owner.position.x,z:owner.position.z,dx:Math.sin(angle)*attack.speed,dz:Math.cos(angle)*attack.speed,range:attack.range,remaining:attack.range,damage:Math.round(attack.damage*this.multiplier(owner)),owner,radius:attack.radius||.075,superPower});bullet.mesh.material=superPower?this.superMaterial:owner.id===0?this.playerBulletMaterial:this.enemyBulletMaterial;bullet.mesh.rotation.y=angle;bullet.mesh.position.set(bullet.x,.8,bullet.z);bullet.mesh.visible=true;return true;}
 fire(player){
  if(!player.alive||player.leap||player.burst||player.ammo<1||player.cooldown>0)return false;const attack=player.data.attack;
  if(attack.type==='bomb'&&!this.bombs.some(b=>!b.active))return false;
  if(['pellets','burst'].includes(attack.type)&&this.bullets.filter(b=>!b.active).length<(attack.pellets||1))return false;
  player.ammoTimers[player.ammoTimers.findIndex(t=>t<=0)]=player.data.reload;player.ammo--;player.cooldown=attack.cooldown;player.recoil=1;player.revealed=CONFIG.match.revealDuration;this.shots++;this.audio?.play(player.classKey,player.position);this.effects?.muzzle(player);
  if(attack.type==='pellets'){for(let i=0;i<attack.pellets;i++)this.emit(player,attack,player.aimAngle+attack.spread*(i/(attack.pellets-1)-.5));}
  if(attack.type==='burst'){this.emit(player,attack,player.aimAngle);player.burst={remaining:attack.shots-1,timer:attack.interval,angle:player.aimAngle};}
  if(attack.type==='bomb')this.lob(player,attack,false);
  if(attack.type==='punch'){player.punchTime=.2;player.firstPunchTimer=CONFIG.juice.punchAnticipation;player.comboTimer=CONFIG.juice.punchAnticipation+CONFIG.juice.punchGap;}
  return true;
 }
 hit(target,amount,owner,charge=true){if(target.isBox){const damage=Math.min(target.hp,amount);this.powerCubes.damageBox(target,amount);this.effects?.damage(target,damage);if(charge)this.charge(owner,damage*CONFIG.abilities.chargeFromBoxes);}else this.damage(target,amount,owner,charge);}
 charge(owner,damage){if(!owner?.alive)return;const was=owner.superCharge;owner.superCharge=Math.min(owner.data.super.charge,owner.superCharge+damage);if(was<owner.data.super.charge&&owner.superCharge===owner.data.super.charge){this.audio?.play('ready',owner.position);this.effects?.burst(owner.position.x,1,owner.position.z,CONFIG.palette.swatch_ffe36d,18,.5);}}
 punch(owner){const attack=owner.data.attack;for(const target of [...this.brawlers,...(this.world.boxes||[])]){if(!target.alive||target===owner||target.leap)continue;const dx=target.position.x-owner.position.x,dz=target.position.z-owner.position.z,d=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(angle-owner.aimAngle),Math.cos(angle-owner.aimAngle));if(d<=attack.range+(target.isBox?.4:CONFIG.player.radius)&&Math.abs(delta)<=attack.spread/2&&this.world.lineClear(owner.position,target.position))this.hit(target,Math.round(attack.damage*this.multiplier(owner)),owner);}this.ring(owner.position.x+Math.sin(owner.aimAngle)*.9,owner.position.z+Math.cos(owner.aimAngle)*.9,.7);}
 lob(owner,attack,superPower){const bomb=this.bombs.find(b=>!b.active);if(!bomb)return false;const distance=Math.min(attack.range,Math.max(.4,owner.aimDistance));Object.assign(bomb,{active:true,owner,age:0,sx:owner.position.x,sz:owner.position.z,x:owner.position.x+Math.sin(owner.aimAngle)*distance,z:owner.position.z+Math.cos(owner.aimAngle)*distance,attack,superPower,damage:Math.round(attack.damage*this.multiplier(owner))});bomb.mesh.visible=bomb.marker.visible=true;bomb.mesh.scale.setScalar(superPower?.32:.19);bomb.marker.material.color.setHex(owner.id===0?CONFIG.palette.swatch_8effdf:CONFIG.palette.enemyWarning);bomb.marker.position.set(bomb.x,.06,bomb.z);bomb.marker.scale.setScalar(attack.radius);return true;}
 explode(x,z,radius,damage,owner,breaks=false){this.audio?.play('explosion',{x,z});this.effects?.impact(x,z,true);if(breaks)this.world.breakWalls(x,z,radius);for(const target of [...this.brawlers,...(this.world.boxes||[])])if(target!==owner&&target.alive&&!target.leap&&Math.hypot(target.position.x-x,target.position.z-z)<=radius+(target.isBox?.4:CONFIG.player.radius))this.hit(target,Math.round(damage*Math.max(.35,1-Math.hypot(target.position.x-x,target.position.z-z)/radius*.55)),owner,!breaks);this.ring(x,z,radius);}
 ring(x,z,radius){const ring=this.rings.find(r=>r.life<=0)||this.rings[0];ring.life=CONFIG.abilities.ringLife;ring.radius=radius;ring.mesh.position.set(x,.065,z);ring.mesh.visible=true;}
 landing(owner){const range=owner.data.super.range,d=Math.min(range,Math.max(.5,owner.aimDistance)),x=owner.position.x+Math.sin(owner.aimAngle)*d,z=owner.position.z+Math.cos(owner.aimAngle)*d;let best=null,score=Infinity;for(let tz=Math.floor(z+this.world.half)-2;tz<=Math.floor(z+this.world.half)+2;tz++)for(let tx=Math.floor(x+this.world.half)-2;tx<=Math.floor(x+this.world.half)+2;tx++){const px=tx-this.world.half+.5,pz=tz-this.world.half+.5,dist=(px-x)**2+(pz-z)**2;if(this.world.canOccupy(px,pz)&&Math.hypot(px-owner.position.x,pz-owner.position.z)<=range&&dist<score){score=dist;best={x:px,z:pz};}}return best;}
 useSuper(owner,committed=false){if(!owner.alive||owner.leap||owner.superCharge<owner.data.super.charge)return false;const superData=owner.data.super;if(owner.pendingSuper)return false;if(owner.id!==0&&!committed){owner.pendingSuper={time:CONFIG.juice.telegraphTime};return true;}
  if(superData.type==='leap'){const landing=this.landing(owner);if(!landing)return false;owner.leap={sx:owner.position.x,sz:owner.position.z,x:landing.x,z:landing.z,age:0};owner.velocity.set(0,0);}
  else if(superData.type==='bomb'){if(this.bombs.filter(b=>!b.active).length<5)return false;const angle=owner.aimAngle;for(let i=0;i<5;i++){owner.aimAngle=angle+(i-2)*.2;this.lob(owner,superData,true);}owner.aimAngle=angle;}
  else if(superData.type==='blast'){for(const b of this.bullets){const dx=b.x-owner.position.x,dz=b.z-owner.position.z,angle=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(angle-owner.aimAngle),Math.cos(angle-owner.aimAngle));if(b.active&&b.owner!==owner&&Math.hypot(dx,dz)<superData.range&&Math.abs(delta)<superData.spread){b.active=false;b.mesh.visible=false;}}if(this.bullets.filter(b=>!b.active).length<superData.pellets)return false;for(let i=0;i<superData.pellets;i++)this.emit(owner,{...owner.data.attack,...superData},owner.aimAngle+superData.spread*(i/(superData.pellets-1)-.5),true);}
  else if(superData.type==='rail'){
   const dx=Math.sin(owner.aimAngle)*superData.range,dz=Math.cos(owner.aimAngle)*superData.range;
   this.ring(owner.position.x,owner.position.z,.8);
   for(const target of [...this.brawlers,...(this.world.boxes||[])]){if(!target.alive||target===owner||target.leap)continue;const ox=target.position.x-owner.position.x,oz=target.position.z-owner.position.z,t=(ox*dx+oz*dz)/(superData.range**2);if(t>=0&&t<=1&&Math.hypot(ox-dx*t,oz-dz*t)<=CONFIG.abilities.railWidth+(target.isBox?.45:CONFIG.player.radius))this.hit(target,Math.round(superData.damage*this.multiplier(owner)),owner,false);}
   const beam=this.beams.find(b=>b.life<=0)||this.beams[0];beam.life=.25;beam.mesh.visible=true;beam.mesh.position.set(owner.position.x+dx/2,.1,owner.position.z+dz/2);beam.mesh.rotation.y=owner.aimAngle;beam.mesh.scale.set(.12,.12,superData.range);
  }
  if(owner.id===0&&this.cameraRig)this.cameraRig.punch=CONFIG.camera.superPunch;this.audio?.play('super',owner.position);owner.superCharge=0;owner.burst=null;owner.revealed=CONFIG.match.revealDuration;owner.recoil=1;return true;
 }
 // Earliest collision parameter on a segment against an expanded tile box.
 boxHit(x,z,dx,dz,left,top,radius){
  let near=0,far=1;
  for(const [origin,delta,min,max]of [[x,dx,left-radius,left+1+radius],[z,dz,top-radius,top+1+radius]]){
   if(Math.abs(delta)<1e-10){if(origin<min||origin>max)return Infinity;continue;}
   let a=(min-origin)/delta,b=(max-origin)/delta;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return Infinity;
  }
  return near;
 }
 trace(x,z,dx,dz,radius,owner=null){
  let t=Infinity,target=null;const h=this.world.half;
  for(let gz=Math.floor(Math.min(z,z+dz)-radius+h);gz<=Math.floor(Math.max(z,z+dz)+radius+h);gz++)for(let gx=Math.floor(Math.min(x,x+dx)-radius+h);gx<=Math.floor(Math.max(x,x+dx)+radius+h);gx++)if(this.world.tile(gx,gz)===TILE.WALL)t=Math.min(t,this.boxHit(x,z,dx,dz,gx-h,gz-h,radius));
  for(const box of this.world.boxes||[]){if(!box.alive)continue;const hit=this.boxHit(x,z,dx,dz,box.position.x-.5,box.position.z-.5,radius);if(hit<t){t=hit;target=box;}}
  const a=dx*dx+dz*dz;
  if(a>0)for(const candidate of this.brawlers){if(!candidate.alive||candidate===owner||candidate.leap)continue;const ox=x-candidate.position.x,oz=z-candidate.position.z,b=ox*dx+oz*dz,c=ox*ox+oz*oz-(CONFIG.player.radius+radius)**2,disc=b*b-a*c;if(disc<0)continue;const hit=c<=0?0:(-b-Math.sqrt(disc))/a;if(hit>=0&&hit<=1&&hit<t){t=hit;target=candidate;}}
  return{t,target};
 }
 damage(target,amount,owner=null,charge=true){if(!target.alive)return 0;const damage=Math.min(target.hp,amount);target.hp-=damage;if(damage>=CONFIG.juice.heavyDamage)this.effects.hitstop=Math.max(this.effects.hitstop||0,CONFIG.juice.heavyStop);if(owner){const dx=target.position.x-owner.position.x,dz=target.position.z-owner.position.z,len=Math.hypot(dx,dz)||1;target.knockX=dx/len*CONFIG.juice.knockback;target.knockZ=dz/len*CONFIG.juice.knockback;target.recoil=1;if(target.id===0){this.effects.damageAngle=Math.atan2(-dx,dz);this.effects.directionLife=.7;}}this.effects?.damage(target,damage);this.effects?.burst(target.position.x,1,target.position.z,target.id===0?CONFIG.palette.swatch_f49d85:CONFIG.palette.swatch_ffe0a0,5,.65);this.audio?.play('hit',target.position);if(owner){owner.damageDealt+=damage;if(charge)this.charge(owner,damage);}target.flash=CONFIG.combat.hitFlash;target.revealed=CONFIG.match.revealDuration;if(target.hp<=0){this.effects.hitstop=CONFIG.juice.killStop;this.ring(target.position.x,target.position.z,1.2);target.deathTime=.3;target.alive=false;target.burst=null;target.leap=null;target.group.visible=false;this.effects?.burst(target.position.x,.6,target.position.z,target.data.color,22,1.3);target.velocity.set(0,0);target.eliminatedBy=owner?owner.name:'POISON GAS';if(owner)owner.kills++;this.onEliminate(target,owner);}return damage;}
 update(dt){
  for(const owner of this.brawlers){
   if(owner.firstPunchTimer>0&&owner.alive){owner.firstPunchTimer-=dt;if(owner.firstPunchTimer<=0)this.punch(owner);}if(owner.comboTimer>0&&owner.alive){owner.comboTimer-=dt;if(owner.comboTimer<=0){this.punch(owner);owner.punchTime=.2;}}
   if(owner.pendingSuper){owner.pendingSuper.time-=dt;if(owner.pendingSuper.time<=0){owner.pendingSuper=null;this.useSuper(owner,true);}}
   if(owner.burst&&owner.alive){const burst=owner.burst;burst.timer-=dt;while(burst.timer<=0&&burst.remaining>0){this.emit(owner,owner.data.attack,burst.angle);burst.remaining--;burst.timer+=owner.data.attack.interval;}if(burst.remaining===0)owner.burst=null;}
   if(owner.leap&&owner.alive){const leap=owner.leap,s=owner.data.super;leap.age+=dt;const t=Math.min(1,leap.age/s.duration);owner.position.set(leap.sx+(leap.x-leap.sx)*t,0,leap.sz+(leap.z-leap.sz)*t);owner.group.position.set(owner.position.x,Math.sin(t*Math.PI)*s.arc,owner.position.z);owner.marker.position.y=.025-owner.group.position.y;owner.marker.scale.setScalar(1-Math.sin(t*Math.PI)*.55);if(t===1){owner.marker.position.y=.025;owner.leap=null;this.effects?.crack(leap.x,leap.z);this.explode(leap.x,leap.z,s.radius,Math.round(s.damage*this.multiplier(owner)),owner,true);}}
  }
  for(const bomb of this.bombs){if(!bomb.active)continue;bomb.age+=dt;const attack=bomb.attack,t=Math.min(1,bomb.age/attack.flight);bomb.mesh.position.set(bomb.sx+(bomb.x-bomb.sx)*t,.18+(1-t)*.62+4*t*(1-t)*attack.arc,bomb.sz+(bomb.z-bomb.sz)*t);bomb.marker.material.opacity=.4+.3*Math.sin(bomb.age*20);bomb.marker.scale.setScalar(attack.radius*(1-.8*Math.min(1,bomb.age/(attack.flight+attack.fuse))));if(bomb.age>=attack.flight+attack.fuse){this.explode(bomb.x,bomb.z,attack.radius,bomb.damage,bomb.owner,bomb.superPower);bomb.active=false;bomb.mesh.visible=bomb.marker.visible=false;}}
  for(const r of this.rings){if(r.life<=0)continue;r.life=Math.max(0,r.life-dt);r.mesh.visible=r.life>0;r.mesh.scale.setScalar(r.radius*(1.1-r.life/CONFIG.abilities.ringLife*.25));r.mesh.material.opacity=r.life/CONFIG.abilities.ringLife;}
  for(const b of this.beams){b.life=Math.max(0,b.life-dt);b.mesh.visible=b.life>0;}
  for(const b of this.bullets){if(!b.active)continue;const speed=Math.hypot(b.dx,b.dz),distance=Math.min(b.remaining,speed*dt),dx=b.dx/speed*distance,dz=b.dz/speed*distance;if(b.superPower)this.world.breakWalls(b.x+dx,b.z+dz,.6,true);const hit=this.trace(b.x,b.z,dx,dz,b.radius,b.owner);
   if(hit.t<=1){b.x+=dx*hit.t;b.z+=dz*hit.t;this.effects?.impact(b.x,b.z,false,hit.target?.data?.color||CONFIG.colors.stone);if(hit.target){const falloff=b.owner.classKey==='shotgunner'&&!b.superPower?Math.max(.35,1-Math.max(0,1-b.remaining/b.range-.6)*1.6):1;this.hit(hit.target,Math.round(b.damage*falloff),b.owner,!b.superPower);}b.active=false;}
   else{b.x+=dx;b.z+=dz;b.remaining-=distance;if(b.remaining<=1e-8)b.active=false;}
   this.world.rustle(b.x,b.z);b.mesh.position.x=b.x;b.mesh.position.z=b.z;b.mesh.visible=b.active;
  }
 }
 render(player,camera,hasAim,superAiming=false){
  for(let i=0;i<this.bombs.length;i++){const b=this.bombs[i];b.mesh.updateMatrix();b.marker.updateMatrix();this.bombInstances.setMatrixAt(i,b.active?b.mesh.matrix:this.zeroMatrix);this.markerInstances.setMatrixAt(i,b.active?b.marker.matrix:this.zeroMatrix);this.markerInstances.setColorAt(i,b.marker.material.color);}for(let i=0;i<this.rings.length;i++){const r=this.rings[i];r.mesh.updateMatrix();this.ringInstances.setMatrixAt(i,r.life>0?r.mesh.matrix:this.zeroMatrix);}this.bombInstances.instanceMatrix.needsUpdate=this.markerInstances.instanceMatrix.needsUpdate=this.ringInstances.instanceMatrix.needsUpdate=true;this.markerInstances.instanceColor.needsUpdate=true;
  for(let i=0;i<this.bullets.length;i++){const b=this.bullets[i],d=this.renderDummy;d.position.set(b.x,.8,b.z);d.rotation.set(0,b.mesh.rotation.y,0);d.scale.set(b.active?.065:0,b.active?.065:0,b.active?.24:0);d.updateMatrix();this.bulletInstances.setMatrixAt(i,d.matrix);this.bulletInstances.setColorAt(i,this.bulletColor.setHex(b.owner?.data.color||CONFIG.palette.swatch_ffe5ab));d.position.x-=Math.sin(d.rotation.y)*.18;d.position.z-=Math.cos(d.rotation.y)*.18;d.scale.multiplyScalar(1.7);d.scale.z*=2;d.updateMatrix();this.trails.setMatrixAt(i,d.matrix);this.trails.setColorAt(i,this.bulletColor);}this.bulletInstances.instanceMatrix.needsUpdate=this.trails.instanceMatrix.needsUpdate=true;this.bulletInstances.instanceColor.needsUpdate=this.trails.instanceColor.needsUpdate=true;
  const attack=superAiming?player.data.super:player.data.attack,range=attack.range,area=attack.type==='bomb'||attack.type==='leap';
  this.fan.visible=hasAim&&!area;this.reticle.visible=hasAim;this.aimRing.visible=hasAim&&area;
  const vertices=this.fan.geometry.attributes.position.array,spread=attack.spread||.04;
  for(let i=0;i<24;i++){const a=-spread/2+spread*i/24,b=-spread/2+spread*(i+1)/24,k=i*9;vertices[k+3]=Math.sin(a)*range;vertices[k+5]=Math.cos(a)*range;vertices[k+6]=Math.sin(b)*range;vertices[k+8]=Math.cos(b)*range;}this.fan.geometry.attributes.position.needsUpdate=true;this.fan.geometry.computeBoundingSphere();
  this.fan.position.copy(player.position);this.fan.rotation.y=player.aimAngle;this.fan.material.color.setHex(superAiming?CONFIG.palette.swatch_ffd85a:CONFIG.palette.swatch_fff5cf);this.fan.material.opacity=superAiming?.22:player.ammo>0?.10:.035;
  const d=Math.min(range,Math.max(.4,player.aimDistance));let end={x:player.position.x+Math.sin(player.aimAngle)*d,z:player.position.z+Math.cos(player.aimAngle)*d};if(superAiming&&attack.type==='leap')end=this.landing(player)||end;
  this.arrow.visible=hasAim&&!area;this.arrow.position.set(end.x,.05,end.z);this.arrow.rotation.y=player.aimAngle;this.reticle.position.set(end.x,.045,end.z);this.aimRing.position.set(end.x,.045,end.z);this.aimRing.scale.setScalar(attack.radius||1);this.arc.visible=hasAim&&attack.type==='bomb';if(this.arc.visible){const a=this.arc.geometry.attributes.position;for(let i=0;i<33;i++){const t=i/32;a.setXYZ(i,player.position.x+(end.x-player.position.x)*t,.15+Math.sin(t*Math.PI)*(attack.arc||3),player.position.z+(end.z-player.position.z)*t);}a.needsUpdate=true;}
  for(let i=0;i<this.brawlers.length;i++){const b=this.brawlers[i],m=this.warningRings[i];m.visible=!!b.pendingSuper||!!b.leap;if(!m.visible)continue;const s=b.data.super,l=b.leap||this.landing(b),distance=Math.min(b.aimDistance,s.range);m.position.set(l?.x??b.position.x+Math.sin(b.aimAngle)*distance,.08,l?.z??b.position.z+Math.cos(b.aimAngle)*distance);m.scale.setScalar(s.radius||2);m.material.opacity=.5+Math.sin(performance.now()/70)*.2;}

 }

}


// Four reusable boxes and drops; no new meshes are allocated during a match.
class PowerCubes {
  // ---- injected field declarations (ported from JS) ----
  effects!: any;
  audio!: any;
  world!: any;
  boxes!: any;
 constructor(scene,world){
  this.world=world;let chosen=null,best=Infinity;
  for(let z=world.half+1;z<world.size-3;z++)for(let x=world.half+1;x<world.size-3;x++){
   const mirrors=[[x,z],[world.size-1-x,z],[x,world.size-1-z],[world.size-1-x,world.size-1-z]];
   if(!mirrors.every(([a,b])=>world.tile(a,b)===TILE.EMPTY&&world.reachable[world.index(a,b)]&&[[a-1,b],[a+1,b],[a,b-1],[a,b+1]].every(([nx,nz])=>!world.blocked(nx,nz))&&world.spawns.every(([sx,sz])=>Math.hypot(sx-a,sz-b)>1.5)))continue;
   const score=(x-world.half-3)**2+(z-world.half-5)**2;if(score<best){best=score;chosen=mirrors;}
  }
  if(!chosen)throw new Error('No accessible mirrored supply-box locations.');
  this.boxes=chosen.map(([tx,tz],id)=>{
   const position=new THREE.Vector3(tx-world.half+.5,0,tz-world.half+.5),group=new THREE.Group();group.position.copy(position);scene.add(group);
   const wood=new ToonMaterial({color:CONFIG.colors.cream,roughness:1}),band=new ToonMaterial({color:CONFIG.palette.swatch_53664b,roughness:.8}),green=new ToonMaterial({color:CONFIG.palette.swatch_c8ee77,emissive:CONFIG.palette.swatch_385b0b,roughness:.6});
   const body=new THREE.Mesh(new THREE.BoxGeometry(.9,.9,.9),wood);body.position.y=.45;body.castShadow=true;group.add(body);outline(body);
   for(const y of [.16,.72]){const rim=new THREE.Mesh(new THREE.BoxGeometry(.96,.1,.96),band);rim.position.y=y;rim.castShadow=true;group.add(rim);}
   const badge=new THREE.Mesh(new THREE.BoxGeometry(.30,.09,.30),green);badge.position.y=.96;badge.rotation.y=Math.PI/4;group.add(badge);
   const drop=new THREE.Mesh(new THREE.BoxGeometry(.36,.36,.36),green);drop.position.copy(position);drop.position.y=.45;drop.rotation.set(.2,Math.PI/4,.2);drop.castShadow=true;scene.add(drop);
   return{id,isBox:true,tx,tz,position,velocity:new THREE.Vector2(),group,drop,wood,hp:CONFIG.cubes.boxHp,alive:true,available:false,flash:0};
  });world.boxes=this.boxes;this.reset();
 }
 reset(){for(const box of this.boxes){box.hp=CONFIG.cubes.boxHp;box.alive=true;box.available=false;box.drop.position.copy(box.position);box.flash=0;box.group.visible=true;box.drop.visible=false;box.wood.emissive.setHex(0);}}
 damageBox(box,amount){if(!box.alive)return;box.hp=Math.max(0,box.hp-amount);box.flash=CONFIG.combat.hitFlash;if(box.hp===0){box.alive=false;box.group.visible=false;box.available=true;box.drop.visible=true;this.effects?.burst(box.position.x,.4,box.position.z,CONFIG.palette.swatch_c19a5f,18,1.2);}}
 update(dt,time,brawlers){for(const box of this.boxes){box.flash=Math.max(0,box.flash-dt);box.wood.emissive.setHex(box.flash>0?CONFIG.palette.white:0);if(!box.available)continue;box.drop.rotation.y=time*1.7;box.drop.position.y=.5+Math.sin(time*3+box.id)*.09;let nearest=null,distance=CONFIG.juice.magnetRange**2;for(const b of brawlers){if(!b.alive||b.leap)continue;const d=(b.position.x-box.drop.position.x)**2+(b.position.z-box.drop.position.z)**2;if(d<distance&&this.world.lineClear(b.position,box.drop.position,true)){nearest=b;distance=d;}}box.spark=(box.spark||0)+dt;if(box.spark>.12){box.spark=0;this.effects?.burst(box.drop.position.x,.5,box.drop.position.z,CONFIG.palette.swatch_baff74,2,.2);}if(nearest){const f=Math.min(1,CONFIG.juice.magnetSpeed*dt/Math.max(.1,Math.sqrt(distance)));box.drop.position.x+=(nearest.position.x-box.drop.position.x)*f;box.drop.position.z+=(nearest.position.z-box.drop.position.z)*f;if(distance<.25){const before=nearest.hp;nearest.collectCube();this.effects?.damage(nearest,-(nearest.hp-before));this.effects?.burst(nearest.position.x,.6,nearest.position.z,CONFIG.palette.swatch_d8ff84,18,.8);this.audio?.play('pickup',nearest.position);box.available=false;box.drop.visible=false;}}}}

}

class Gas {
  // ---- injected field declarations (ported from JS) ----
  world!: any;
  texture!: any;
  fog!: any;
  edges!: any;
  time!: any;
  half!: any;
  active!: any;
  exposure!: any;
 constructor(scene,world){this.world=world;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#8152ac';x.fillRect(0,0,128,128);for(let i=0;i<18;i++){const g=x.createRadialGradient(i*31%128,i*43%128,1,i*31%128,i*43%128,30);g.addColorStop(0,'#aee579bb');g.addColorStop(1,'#aee57900');x.fillStyle=g;x.fillRect(0,0,128,128);}this.texture=new THREE.CanvasTexture(c);this.texture.wrapS=this.texture.wrapT=THREE.RepeatWrapping;this.texture.repeat.set(5,2);this.fog=[];this.edges=[];const geometry=new THREE.BoxGeometry(1,1,1),fogMaterial=new THREE.MeshBasicMaterial({map:this.texture,color:CONFIG.palette.white,transparent:true,opacity:.4,depthWrite:false}),edgeMaterial=new THREE.MeshBasicMaterial({color:CONFIG.palette.swatch_dbb0ff,transparent:true,opacity:.85,depthWrite:false});for(let i=0;i<4;i++){const fog=new THREE.Mesh(geometry,fogMaterial),edge=new THREE.Mesh(geometry,edgeMaterial);scene.add(fog,edge);this.fog.push(fog);this.edges.push(edge);}this.reset();}
 reset(){this.time=0;this.half=CONFIG.gas.startHalf;this.active=false;this.exposure=new Map();this.render();}
 halfAt(time){const progress=Math.max(0,Math.min(1,(time-CONFIG.gas.delay)/CONFIG.gas.duration));return CONFIG.gas.startHalf+(CONFIG.gas.endHalf-CONFIG.gas.startHalf)*progress;}
 outside(position,margin=0){return Math.max(Math.abs(position.x),Math.abs(position.z))>this.half-margin;}
 dangerous(position){return this.time>=CONFIG.gas.delay-CONFIG.gas.lookAhead&&Math.max(Math.abs(position.x),Math.abs(position.z))>this.halfAt(this.time+CONFIG.gas.lookAhead)-CONFIG.gas.escapeMargin;}
 tileCost(x,z){if(this.time<CONFIG.gas.delay-CONFIG.gas.lookAhead)return 0;const extent=Math.max(Math.abs(x-this.world.half+.5),Math.abs(z-this.world.half+.5)),limit=this.halfAt(this.time+CONFIG.gas.lookAhead);return extent>limit?CONFIG.gas.pathCost+(extent-limit)*2:extent>limit-CONFIG.gas.escapeMargin?3:0;}
 safeGoal(position){for(const margin of [CONFIG.gas.escapeMargin,.5,0]){let goal=null,best=Infinity;const limit=Math.max(.5,this.halfAt(this.time+CONFIG.gas.lookAhead)-margin);for(let z=1;z<this.world.size-1;z++)for(let x=1;x<this.world.size-1;x++){const px=x-this.world.half+.5,pz=z-this.world.half+.5;if(Math.abs(px)>limit||Math.abs(pz)>limit||this.world.blocked(x,z)||!this.world.reachable[this.world.index(x,z)])continue;const distance=(px-position.x)**2+(pz-position.z)**2;if(distance<best){best=distance;goal={x:px,z:pz};}}if(goal)return goal;}return null;}

 update(dt,time,brawlers,combat){this.time=time;this.half=this.halfAt(time);this.active=time>=CONFIG.gas.delay;if(!this.active)return;
  const activeDt=Math.min(dt,Math.max(0,time-CONFIG.gas.delay));
  for(const b of brawlers){if(!b.alive||!this.outside(b.position)){this.exposure.delete(b.id);continue;}let exposure=this.exposure.get(b.id);if(!exposure){exposure={clock:0,ticks:0};this.exposure.set(b.id,exposure);}exposure.clock+=activeDt;while(exposure.clock+1e-9>=CONFIG.gas.tick&&b.alive){exposure.clock-=CONFIG.gas.tick;const damage=CONFIG.gas.baseDamage+Math.floor((time-CONFIG.gas.delay)/CONFIG.gas.escalateEvery)*CONFIG.gas.damageStep+exposure.ticks*CONFIG.gas.exposureStep;exposure.ticks++;combat.damage(b,damage);}}
 }
 render(){this.texture.offset.set(this.time*.02,this.time*.008);const h=this.half,extent=60,width=extent-h;
  const rectangles=[[-(extent+h)/2,0,width,extent*2],[(extent+h)/2,0,width,extent*2],[0,-(extent+h)/2,h*2,width],[0,(extent+h)/2,h*2,width]];
  for(let i=0;i<4;i++){const [x,z,w,d]=rectangles[i],fog=this.fog[i];fog.visible=this.active;fog.position.set(x,1.1,z);fog.scale.set(w,2.2,d);const edge=this.edges[i];edge.visible=this.active;if(i<2){edge.position.set(i===0?-h:h,.08,0);edge.scale.set(.065,.14,h*2);}else{edge.position.set(0,.08,i===2?-h:h);edge.scale.set(h*2,.14,.065);}}
 }
}

// Each brain owns its reaction clock, seeded aim error, and a cardinal A* route.
class BotBrain {
  // ---- injected field declarations (ported from JS) ----
  gas!: any;
  powerCubes!: any;
  brawler!: any;
  world!: any;
  brawlers!: any;
  random!: any;
  vector!: any;
  hasAim!: any;
  settings!: any;
  target!: any;
  escaping!: any;
  looting!: any;
  path!: any;
  planTimer!: any;
  reaction!: any;
  fireTimer!: any;
  error!: any;
  strafe!: any;
  windup!: any;
 constructor(brawler,world,brawlers,difficulty,gas=null,powerCubes=null){this.gas=gas;this.powerCubes=powerCubes;this.brawler=brawler;this.world=world;this.brawlers=brawlers;this.random=rng(world.seed+brawler.id*997);this.vector=new THREE.Vector2();this.hasAim=true;this.reset(difficulty);}
 reset(difficulty){this.settings=CONFIG.bots.difficulties[difficulty];this.brawler.damageScale=this.settings.damage;this.target=null;this.escaping=false;this.looting=false;this.path=[];this.planTimer=this.brawler.id*.035;this.reaction=this.settings.reaction;this.fireTimer=0;this.error=0;this.strafe=this.random()>.5?1:-1;this.vector.set(0,0);}
 direction(){return this.vector;}
 // A* adds the predicted gas exposure cost to every tile.
 static findPath(world,start,goal,tileCost: (x: number, z: number) => number =()=>0){
  const size=world.size,sx=Math.floor(start.x+world.half),sz=Math.floor(start.z+world.half),gx=Math.floor(goal.x+world.half),gz=Math.floor(goal.z+world.half);
  if(world.blocked(sx,sz)||world.blocked(gx,gz))return[];
  const first=world.index(sx,sz),last=world.index(gx,gz),scores=new Float32Array(size*size).fill(Infinity),parents=new Int32Array(size*size).fill(-1),closed=new Uint8Array(size*size),heap=[];
  const heuristic=i=>Math.abs(i%size-gx)+Math.abs(Math.floor(i/size)-gz);
  const push=(i,f)=>{const node={i,f};let at=heap.length;heap.push(node);while(at>0){const parent=(at-1)>>1;if(heap[parent].f<=f)break;heap[at]=heap[parent];at=parent;}heap[at]=node;};
  const pop=()=>{const top=heap[0],end=heap.pop();if(heap.length){let at=0;while(at*2+1<heap.length){let child=at*2+1;if(child+1<heap.length&&heap[child+1].f<heap[child].f)child++;if(heap[child].f>=end.f)break;heap[at]=heap[child];at=child;}heap[at]=end;}return top.i;};
  scores[first]=0;push(first,heuristic(first));
  while(heap.length){const current=pop();if(closed[current])continue;if(current===last){const path=[];for(let i=last;i!==first;i=parents[i])path.push({x:i%size-world.half+.5,z:Math.floor(i/size)-world.half+.5});return path.reverse();}closed[current]=1;const x=current%size,z=Math.floor(current/size);
   for(const [nx,nz]of [[x-1,z],[x+1,z],[x,z-1],[x,z+1]]){if(world.blocked(nx,nz))continue;const next=world.index(nx,nz),cost=scores[current]+1+Math.max(0,tileCost(nx,nz));if(closed[next]||cost>=scores[next])continue;scores[next]=cost;parents[next]=current;push(next,cost+heuristic(next));}
  }
  return[];
 }
 plan(){
  const self=this.brawler,previousTarget=this.target;let nearest=null,best=Infinity;
  for(const other of this.brawlers){if(other===self||!this.world.visibleTo(other,self))continue;const distance=self.position.distanceToSquared(other.position)*(other===this.target?CONFIG.bots.targetStickiness:1);if(distance<best){nearest=other;best=distance;}}
  this.target=nearest;
  this.error=(this.random()-.5)*CONFIG.bots.aimError*(1-this.settings.skill);if(this.random()<CONFIG.bots.strafeSwitchChance)this.strafe*=-1;
  this.escaping=!!this.gas?.dangerous(self.position);this.looting=false;
  let goal=this.target?.position;
  if(this.escaping){goal=this.gas.safeGoal(self.position);this.target=null;}
  else if(this.powerCubes){
   const safe=box=>!this.gas?.dangerous(box.position),distance=box=>self.position.distanceToSquared(box.position);
   const drop=this.powerCubes.boxes.filter(box=>box.available&&safe(box)&&distance(box)<CONFIG.cubes.searchRange**2).sort((a,b)=>distance(a)-distance(b))[0];
   if(drop&&best>CONFIG.cubes.threatRange**2){goal=drop.position;this.looting=true;this.target=null;}
   else{const box=this.powerCubes.boxes.filter(box=>box.alive&&safe(box)&&distance(box)<Math.min(best,CONFIG.cubes.searchRange**2)).sort((a,b)=>distance(a)-distance(b))[0];if(box&&best>CONFIG.cubes.threatRange**2){this.target=box;goal=box.position;}}
  }
  if(goal&&this.gas?.dangerous(goal)&&!this.escaping){goal=this.gas.safeGoal(self.position);this.target=null;this.escaping=true;}
  if(this.target?.isBox){const box=this.target,neighbors=[[box.tx-1,box.tz],[box.tx+1,box.tz],[box.tx,box.tz-1],[box.tx,box.tz+1]].filter(([x,z])=>!this.world.blocked(x,z)).map(([x,z])=>({x:x-this.world.half+.5,z:z-this.world.half+.5}));neighbors.sort((a,b)=>(a.x-self.position.x)**2+(a.z-self.position.z)**2-((b.x-self.position.x)**2+(b.z-self.position.z)**2));goal=neighbors[0];}
  if(this.target!==previousTarget)this.reaction=this.settings.reaction;
  if(!goal){if(this.path.length&&!this.escaping)return;for(let attempt=0;attempt<40;attempt++){const x=1+Math.floor(this.random()*(this.world.size-2)),z=1+Math.floor(this.random()*(this.world.size-2)),candidate={x:x-this.world.half+.5,z:z-this.world.half+.5};if(!this.world.blocked(x,z)&&!this.gas?.dangerous(candidate)){goal=candidate;break;}}}
  if(goal){this.path=BotBrain.findPath(this.world,self.position,goal,(x,z)=>this.gas?.tileCost(x,z)||0);if(this.path.length&&!this.world.lineClear(self.position,this.path[0],true))this.path.unshift({x:Math.floor(self.position.x+this.world.half)-this.world.half+.5,z:Math.floor(self.position.z+this.world.half)-this.world.half+.5});}

 }
 update(dt,combat){
  const self=this.brawler;if(!self.alive)return;this.planTimer-=dt;this.reaction-=dt;this.fireTimer-=dt;if(this.planTimer<=0){this.planTimer=CONFIG.bots.replan;this.plan();}
  this.vector.set(0,0);const target=this.target;
  let fighting=false;
  if(!this.escaping&&!this.looting&&target&&this.world.visibleTo(target,self)){
   const dx=target.position.x-self.position.x,dz=target.position.z-self.position.z,distance=Math.hypot(dx,dz),los=self.classKey==='thrower'||this.world.lineClear(self.position,target.position),lead=(self.classKey==='thrower'?self.data.attack.flight:Math.min(CONFIG.bots.leadLimit,distance/self.data.attack.speed))*this.settings.skill;
   self.aimAngle=Math.atan2(dx+target.velocity.x*lead,dz+target.velocity.y*lead)+this.error;self.aimDistance=Math.hypot(dx+target.velocity.x*lead,dz+target.velocity.y*lead);
   if(!target.isBox&&this.reaction<=0&&self.superCharge>=self.data.super.charge&&distance<self.data.super.range&&(self.classKey==='heavyweight'||los)){const landing=self.classKey==='heavyweight'?combat.landing(self):null;if(self.classKey!=='heavyweight'||landing&&!this.gas?.dangerous(landing))combat.useSuper(self);}
   if(los&&distance<self.data.attack.range*CONFIG.bots.firingRange){
    fighting=true;const preferred=Math.min(self.data.attack.range*.75,target.isBox?CONFIG.cubes.boxRange:self.data.preferred/this.settings.aggression)+(self.ammo===0||self.hp<self.maxHp*.3?CONFIG.bots.reloadRetreat:0),radial=distance>preferred+CONFIG.bots.rangeTolerance?1:distance<preferred-CONFIG.bots.rangeTolerance?-1:0;
    this.vector.set(dx*radial-dz*CONFIG.bots.strafe*this.strafe,dz*radial+dx*CONFIG.bots.strafe*this.strafe).normalize();
    const probe={x:self.position.x+this.vector.x*CONFIG.bots.probeDistance,z:self.position.z+this.vector.y*CONFIG.bots.probeDistance};if(!this.world.lineClear(self.position,probe,true)||this.gas?.dangerous(probe)){this.strafe*=-1;fighting=false;}
    if(this.reaction<=0&&this.fireTimer<=0&&self.ammo>0&&self.cooldown<=0){if(this.windup===undefined)this.windup=this.settings.reaction*.45;this.vector.set(0,0);this.windup-=dt;self.body.scale.y*=.97;if(this.windup<=0){if(combat.fire(self))this.fireTimer=self.data.attack.cooldown/this.settings.aggression;this.windup=undefined;}}else this.windup=undefined;
   }
  }
  if(!fighting){while(this.path.length&&Math.hypot(this.path[0].x-self.position.x,this.path[0].z-self.position.z)<CONFIG.bots.waypointRadius)this.path.shift();if(this.path.length){const next=this.path[0];this.vector.set(next.x-self.position.x,next.z-self.position.z).normalize();}else this.vector.set(0,0);}
  if(self.pendingSuper)this.vector.set(0,0);self.update(dt,this);
 }
}

class Effects {
  // ---- injected field declarations (ported from JS) ----
  listener!: any;
  damageAngle!: any;
  limit!: any;
  dummy!: any;
  mesh!: any;
  smoke!: any;
  color!: any;
  particles!: any;
  projected!: any;
  numbers!: any;
  decalMesh!: any;
  decals!: any;
  cracks!: any;
  muzzleSprite!: any;
  hitstop!: any;
  muzzleLife!: any;
  shake!: any;
  flash!: any;
  directionLife!: any;
 constructor(scene){this.limit=CONFIG.effects.particles;this.dummy=new THREE.Object3D();this.mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.09,.09,.09),new THREE.MeshBasicMaterial({color:CONFIG.palette.white}),CONFIG.effects.particles);this.mesh.frustumCulled=false;this.smoke=new THREE.InstancedMesh(new THREE.SphereGeometry(.16,6,4),new THREE.MeshBasicMaterial({color:CONFIG.palette.white,transparent:true,opacity:.3,depthWrite:false}),CONFIG.effects.particles);this.smoke.frustumCulled=false;scene.add(this.mesh,this.smoke);this.color=new THREE.Color();this.particles=Array.from({length:CONFIG.effects.particles},()=>({life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0}));this.projected=new THREE.Vector3();this.numbers=Array.from({length:CONFIG.effects.numbers},()=>{const element=document.createElement('div');element.className='damage-number';document.getElementById('ui').appendChild(element);return{element,life:0,age:0,key:null,amount:0,x:0,y:0,z:0};});this.decalMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:GLOW,color:CONFIG.palette.swatch_583044,transparent:true,opacity:.32,depthWrite:false}),CONFIG.juice.decalPool);this.decalMesh.frustumCulled=false;scene.add(this.decalMesh);this.decals=Array.from({length:CONFIG.juice.decalPool},()=>({life:0,x:0,z:0,size:1}));const crackCanvas=document.createElement('canvas');crackCanvas.width=crackCanvas.height=128;const cx=crackCanvas.getContext('2d');cx.strokeStyle='#4e3447';cx.lineWidth=3;for(let i=0;i<8;i++){const angle=i*Math.PI/4;cx.beginPath();cx.moveTo(64,64);cx.lineTo(64+Math.sin(angle+.2)*24,64+Math.cos(angle+.2)*24);cx.lineTo(64+Math.sin(angle)*53,64+Math.cos(angle)*53);cx.stroke();}this.cracks=Array.from({length:4},()=>{const mesh=new THREE.Mesh(new THREE.PlaneGeometry(3,3),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(crackCanvas),transparent:true,opacity:.7,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.visible=false;scene.add(mesh);return{mesh,life:0};});this.muzzleSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:CONFIG.palette.swatch_ffe0a0,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));this.muzzleSprite.visible=false;scene.add(this.muzzleSprite);this.reset();}
 reset(){this.hitstop=0;for(const c of this.cracks)c.life=0;this.muzzleLife=0;this.shake=0;this.flash=0;this.directionLife=0;for(const d of this.decals)d.life=0;for(const p of this.particles)p.life=0;for(const n of this.numbers){n.life=0;n.element.style.display='none';}this.update(0);}
 crack(x,z){const c=this.cracks.find(c=>c.life<=0)||this.cracks[0];c.life=CONFIG.juice.decalLife;c.mesh.position.set(x,.029,z);c.mesh.visible=true;}
 decal(x,z,size=1){const d=this.decals.find(d=>d.life<=0)||this.decals[0];Object.assign(d,{x,z,size,life:CONFIG.juice.decalLife});}
 muzzle(owner){this.muzzleLife=CONFIG.juice.muzzleTime;this.muzzleSprite.position.set(owner.position.x+Math.sin(owner.aimAngle)*.6,.9,owner.position.z+Math.cos(owner.aimAngle)*.6);this.muzzleSprite.material.color.setHex(owner.data.color);this.muzzleSprite.scale.setScalar(.9);this.muzzleSprite.visible=true;this.burst(this.muzzleSprite.position.x,.9,this.muzzleSprite.position.z,CONFIG.palette.swatch_ffedab,5,.4);}
 burst(x,y,z,color,count=10,power=1,kind=0){let left=Math.round(count*this.limit/CONFIG.effects.particles);for(let i=0;i<this.limit&&left>0;i++){const p=this.particles[i];if(p.life>0)continue;Object.assign(p,{kind,color,life:CONFIG.effects.life*(kind===1?2:.5+Math.random()*.5),x,y,z,vx:(Math.random()-.5)*5*power,vy:(1+Math.random()*3)*power,vz:(Math.random()-.5)*5*power});this.mesh.setColorAt(i,this.color.setHex(color));left--;}if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;}
 damage(target,amount){let n=this.numbers.find(n=>n.life>0&&n.key===target&&n.age<.13)||this.numbers.find(n=>n.life<=0);if(!n)return;const merge=n.life>0&&n.key===target;n.amount=merge?n.amount+amount:amount;n.key=target;if(n.amount>=CONFIG.juice.heavyDamage)this.hitstop=Math.max(this.hitstop||0,CONFIG.juice.heavyStop);n.life=CONFIG.effects.numberLife;if(!merge)n.age=0;n.x=target.position.x;n.y=target.isBox?1.25:2;n.z=target.position.z;n.element.textContent=n.amount<0?'+'+Math.round(-n.amount):Math.round(n.amount);n.element.style.color=amount<0?'#99ff92':target.id===0&&!target.isBox?'#ff867c':n.amount>=CONFIG.juice.heavyDamage?'#ffdf5a':'#ffffff';n.element.style.display='block';if(target.id===0&&!target.isBox&&amount>0){this.shake=Math.max(this.shake,.16);this.flash=CONFIG.effects.hitFlash;}}
 impact(x,z,strong=false,color=CONFIG.colors.stone){this.decal(x,z,strong?2.5:.6);this.burst(x,.4,z,strong?CONFIG.palette.swatch_ffc15b:color,strong?24:5,strong?1.5:.65);if(strong){const d=this.listener?Math.hypot(x-this.listener.x,z-this.listener.z):0;this.shake=Math.max(this.shake,.5/(1+d*.18));this.muzzleLife=CONFIG.juice.muzzleTime;this.muzzleSprite.position.set(x,.5,z);this.muzzleSprite.scale.setScalar(3);this.muzzleSprite.material.color.setHex(CONFIG.palette.white);this.burst(x,.8,z,CONFIG.palette.smoke,12,.4,1);}}
 update(dt){for(const c of this.cracks){c.life=Math.max(0,c.life-dt);c.mesh.visible=c.life>0&&this.decalMesh.visible;c.mesh.material.opacity=Math.min(.7,c.life*.3);}this.directionLife=Math.max(0,(this.directionLife||0)-dt);this.muzzleLife=Math.max(0,this.muzzleLife-dt);this.muzzleSprite.visible=this.muzzleLife>0;for(let i=0;i<this.decals.length;i++){const d=this.decals[i];d.life=Math.max(0,d.life-dt);this.dummy.position.set(d.x,.023,d.z);this.dummy.rotation.set(-Math.PI/2,0,0);this.dummy.scale.setScalar(d.life>0?d.size*Math.min(1,d.life):0);this.dummy.updateMatrix();this.decalMesh.setMatrixAt(i,this.dummy.matrix);}this.decalMesh.instanceMatrix.needsUpdate=true;this.dummy.rotation.set(0,0,0);this.shake=Math.max(0,this.shake-dt*CONFIG.effects.shakeDecay);this.flash=Math.max(0,this.flash-dt);let solid=0,smoke=0;for(let i=0;i<this.particles.length;i++){const p=this.particles[i];p.life=Math.max(0,p.life-dt);if(i>=this.limit)p.life=0;if(p.life<=0)continue;p.vy-=(p.kind===1?-1:CONFIG.effects.gravity)*dt;p.x+=p.vx*dt;p.y=Math.max(.03,p.y+p.vy*dt);p.z+=p.vz*dt;this.dummy.position.set(p.x,p.y,p.z);this.dummy.rotation.set(p.life*3,p.life*2,p.life);this.dummy.scale.setScalar(p.kind===1?(2-p.life)*1.6:Math.min(1,p.life*5));this.dummy.updateMatrix();const mesh=p.kind===1?this.smoke:this.mesh,index=p.kind===1?smoke++:solid++;mesh.setMatrixAt(index,this.dummy.matrix);mesh.setColorAt(index,this.color.setHex(p.color));}this.mesh.count=solid;this.smoke.count=smoke;this.mesh.instanceMatrix.needsUpdate=this.smoke.instanceMatrix.needsUpdate=true;if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;if(this.smoke.instanceColor)this.smoke.instanceColor.needsUpdate=true;for(const n of this.numbers){n.life=Math.max(0,n.life-dt);n.age+=dt;if(n.life===0)n.element.style.display='none';}}
 render(camera){const direction=document.getElementById('damage-direction');direction.style.opacity=String(this.directionLife||0);direction.style.transform=`rotate(${this.damageAngle||0}rad) translateY(-140px)`;document.getElementById('hit-flash').style.opacity=String(this.flash/CONFIG.effects.hitFlash*.65);for(const n of this.numbers){if(n.life<=0)continue;this.projected.set(n.x,n.y+n.age*.9,n.z).project(camera);n.element.style.left=((this.projected.x*.5+.5)*innerWidth)+'px';n.element.style.top=((-this.projected.y*.5+.5)*innerHeight)+'px';n.element.style.opacity=Math.min(1,n.life*4);n.element.style.transform=`translate(-50%,-100%) scale(${1+Math.sin(Math.min(1,n.age/.2)*Math.PI)*CONFIG.juice.numberOvershoot+(n.amount>=CONFIG.juice.heavyDamage?.2:0)})`;}}
 dispose(){
  for (const n of this.numbers || []) if (n.element.parentElement) n.element.remove();
 }
}

// Oscillators and a reusable filtered-noise buffer; no audio files or autoplay.
class Audio {
  // ---- injected field declarations (ported from JS) ----
  sfxVolume!: any;
  ctx!: any;
  muted!: any;
  paused!: any;
  voices!: any;
  last!: any;
  listener!: any;
  master!: any;
  noise!: any;
  musicClock!: any;
  gasClock!: any;
  beat!: any;
 constructor(){this.ctx=null;this.muted=false;this.paused=false;this.voices=0;this.last=new Map();this.listener=null;}
 start(){try{if(!this.ctx){const Context=window.AudioContext||(window as any).webkitAudioContext;if(!Context)return;this.ctx=new Context();this.master=this.ctx.createGain();this.master.gain.value=this.muted||this.paused?0:CONFIG.audio.volume;this.master.connect(this.ctx.destination);this.noise=this.ctx.createBuffer(1,Math.floor(this.ctx.sampleRate*.3),this.ctx.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});}catch{this.ctx=null;}}
 setMuted(value){this.muted=value;this.sync();document.getElementById('mute').textContent=value?'SFX OFF':'SFX ON';document.getElementById('mute').setAttribute('aria-pressed',String(value));document.getElementById('mute').setAttribute('aria-label',value?'Unmute audio':'Mute audio');}
 sync(){if(this.ctx)this.master.gain.setTargetAtTime(this.muted||this.paused?0:CONFIG.audio.volume,this.ctx.currentTime,.02);}
 setPaused(value){this.paused=value;this.sync();}
 play(kind,position=null){if(!this.ctx||this.ctx.state!=='running'||this.muted||this.paused||this.voices>=CONFIG.audio.maxVoices)return;const now=this.ctx.currentTime;if(now-(this.last.get(kind)??-1)<.035)return;let volume=1;if(position&&this.listener){const d=Math.hypot(position.x-this.listener.x,position.z-this.listener.z);if(d>CONFIG.audio.range)return;volume=1/(1+(d/8)**2);}this.last.set(kind,now);
  const [baseFrequency,duration,type,noisy]=CONFIG.audio.tones[kind]||CONFIG.audio.tones.hit,frequency=baseFrequency*(1+(Math.random()*2-1)*CONFIG.audio.pitchVariation);const oscillator=this.ctx.createOscillator(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,now);if(['pickup','ready','win'].includes(kind)){for(let i=1;i<=3;i++)oscillator.frequency.setValueAtTime(frequency*[1,1.25,1.5,2][i],now+duration*i/4);}else oscillator.frequency.exponentialRampToValueAtTime(frequency*.35,now+duration);filter.type='lowpass';filter.frequency.value=noisy?1400:4500;gain.gain.setValueAtTime(.001,now);gain.gain.linearRampToValueAtTime(volume*.3*(this.sfxVolume??CONFIG.audio.sfxVolume),now+.008);gain.gain.exponentialRampToValueAtTime(.001,now+duration);oscillator.connect(filter);filter.connect(gain);const pan=this.ctx.createStereoPanner();pan.pan.value=position&&this.listener?Math.max(-1,Math.min(1,(position.x-this.listener.x)/12)):0;gain.connect(pan);pan.connect(this.master);let noise=null;if(noisy){noise=this.ctx.createBufferSource();noise.buffer=this.noise;noise.connect(filter);noise.start(now);noise.stop(now+duration);}this.voices++;oscillator.onended=()=>{this.voices--;oscillator.disconnect();noise?.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();};oscillator.start(now);oscillator.stop(now+duration+.01);
 }
 update(dt,alive,active,gas){if(!this.ctx||this.muted||this.paused||!active)return;this.musicClock=(this.musicClock||0)-dt;this.gasClock=(this.gasClock||0)-dt;if(gas&&this.gasClock<=0){this.gasClock=.65;this.play('gas');}if(this.musicClock>0||this.voices>=CONFIG.audio.maxVoices)return;const intensity=(8-alive)/7;this.musicClock=60/(CONFIG.audio.tempo+intensity*CONFIG.audio.dangerTempo)/2;this.beat=(this.beat||0)+1;const notes=[130.81,155.56,196,233.08,196,155.56,174.61,146.83],now=this.ctx.currentTime,osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type=this.beat%4===0?'triangle':'sine';osc.frequency.value=notes[this.beat%notes.length]*(this.beat%4===0?.5:1);gain.gain.setValueAtTime(CONFIG.audio.musicVolume*(.5+intensity*.5),now);gain.gain.exponentialRampToValueAtTime(.001,now+.24);osc.connect(gain);gain.connect(this.master);this.voices++;osc.onended=()=>{this.voices--;osc.disconnect();gain.disconnect();};osc.start(now);osc.stop(now+.25);}

}

class Input {
  // ---- injected field declarations (ported from JS) ----

  private _listeners: Array<{ target: EventTarget; type: string; handler: (e: any) => void; options?: any }> = [];
  private _listen(target: EventTarget, type: string, handler: (e: any) => void, options?: any) {
    target.addEventListener(type, handler as EventListener, options);
    this._listeners.push({ target, type, handler, options });
  }
  private _unlistenAll() {
    for (const l of this._listeners) l.target.removeEventListener(l.type, l.handler as EventListener, l.options);
    this._listeners = [];
  }
  moveTouch!: any;
  touchAim!: any;
  touchAimActive!: any;
  touchAutoLocked!: any;
  autoAim!: any;
  touchBindings!: any;
  pointer!: any;
  hasAim!: any;
  firing!: any;
  shotQueued!: any;
  superKeys!: any;
  superHeld!: any;
  superQueued!: any;
  keys!: any;
  vector!: any;
 constructor(toggle,canvas,onMute=()=>{}){this.moveTouch=new THREE.Vector2();this.touchAim=new THREE.Vector2(0,-1);this.touchAimActive=false;this.touchAutoLocked=false;this.autoAim=false;this.touchBindings=[];this.pointer=new THREE.Vector2();this.hasAim=false;this.firing=false;this.shotQueued=false;this.superKeys=new Set();this.superHeld=false;this.superQueued=false;this.keys=new Set();this.vector=new THREE.Vector2();this._listen(window,'keydown',e=>{if(/INPUT|SELECT/.test((e.target as HTMLElement).tagName))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyP','Space'].includes(e.code))e.preventDefault();if(e.code==='KeyP'&&!e.repeat)toggle();if(e.code==='KeyM'&&!e.repeat)onMute();if(e.code==='Space'){this.superKeys.add('space');this.superHeld=true;}this.keys.add(e.code);});this._listen(window,'keyup',e=>{this.keys.delete(e.code);if(e.code==='Space')this.releaseSuper('space');});this._listen(window,'blur',()=>this.clear());
  const point=e=>{if(e.pointerType==='touch')return;this.touchAutoLocked=false;this.touchAimActive=false;const r=canvas.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.hasAim=true;};
  this._listen(canvas,'contextmenu',e=>e.preventDefault());this._listen(canvas,'pointerdown',e=>{if(e.button===2){e.preventDefault();point(e);this.superKeys.add('mouse');this.superHeld=true;}});this._listen(canvas,'pointermove',point);this._listen(canvas,'pointerdown',e=>{if(e.button!==0||e.pointerType==='touch')return;point(e);this.firing=true;this.shotQueued=true;});
  this._listen(window,'pointerup',e=>{if(e.button===0)this.firing=false;if(e.button===2)this.releaseSuper('mouse');});this._listen(window,'pointercancel',()=>this.clear());this._listen(canvas,'pointerleave',()=>{this.firing=false;this.shotQueued=false;});
 }

 setupTouch(){const media=window.matchMedia('(any-pointer: coarse)'),apply=()=>document.body.classList.toggle('touch-mode',media.matches||innerWidth<=650);apply();this._listen(media,'change',apply);this._listen(window,'resize',apply);
  for(const [id,kind]of [['move-stick','move'],['aim-stick','aim'],['touch-super','super']]){
   const element=document.getElementById(id),binding={element,kind,pointer:null,dragged:false};this.touchBindings.push(binding);
   const move=e=>{if(binding.pointer!==e.pointerId)return;const r=element.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,length=Math.hypot(dx,dy),scale=Math.min(1,CONFIG.touch.stickRadius/Math.max(1,length));binding.dragged=binding.dragged||length>CONFIG.touch.deadZone;const knob=element.querySelector('span');if(knob)knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;if(kind==='move'){this.moveTouch.set(length<CONFIG.touch.deadZone?0:dx*scale/CONFIG.touch.stickRadius,length<CONFIG.touch.deadZone?0:dy*scale/CONFIG.touch.stickRadius);}else if(length>CONFIG.touch.deadZone){this.touchAutoLocked=false;this.touchAim.set(dx*scale/CONFIG.touch.stickRadius,dy*scale/CONFIG.touch.stickRadius);this.touchAimActive=true;this.hasAim=true;}};
   this._listen(element,'pointerdown',e=>{if(binding.pointer!==null)return;e.preventDefault();binding.pointer=e.pointerId;binding.dragged=false;element.setPointerCapture(e.pointerId);if(kind==='super'){this.superKeys.add('touch');this.superHeld=true;}move(e);});this._listen(element,'pointermove',move);
   this._listen(element,'pointerup',e=>{if(binding.pointer!==e.pointerId)return;e.preventDefault();move(e);binding.pointer=null;const knob=element.querySelector('span');if(knob)knob.style.transform='';if(kind==='move')this.moveTouch.set(0,0);else{this.autoAim=!binding.dragged;if(kind==='super')this.releaseSuper('touch');else this.shotQueued=true;}if(element.hasPointerCapture(e.pointerId))element.releasePointerCapture(e.pointerId);});
   this._listen(element,'pointercancel',()=>this.clear());this._listen(element,'lostpointercapture',()=>{if(binding.pointer!==null)this.clear();});
  }
 }
 releaseSuper(key){const was=this.superKeys.delete(key);this.superHeld=this.superKeys.size>0;if(was&&!this.superHeld)this.superQueued=true;}
 clear(){this.moveTouch.set(0,0);this.touchAutoLocked=false;this.touchAimActive=false;this.autoAim=false;for(const binding of this.touchBindings){binding.pointer=null;const knob=binding.element.querySelector('span');if(knob)knob.style.transform='';}this.keys.clear();this.firing=false;this.shotQueued=false;this.superKeys.clear();this.superHeld=false;this.superQueued=false;}
 direction(){if(this.moveTouch.lengthSq()>0)return this.vector.copy(this.moveTouch);const has=(a,b)=>this.keys.has(a)||this.keys.has(b);return this.vector.set(Number(has('KeyD','ArrowRight'))-Number(has('KeyA','ArrowLeft')),Number(has('KeyS','ArrowDown'))-Number(has('KeyW','ArrowUp'))).normalize();}

 dispose(){
  this._unlistenAll();
  this.clear();
 }
}
class Hud {
  // ---- injected field declarations (ported from JS) ----
  world!: any;
  map!: any;
  ctx!: any;
  base!: any;
  projected!: any;
  ammoBars!: any;
  ammoStatus!: any;
  feed!: any;
  labels!: any;
  boxLabels!: any;
  mapRevision!: any;
 constructor(world,brawlers){
  this.world=world;this.map=document.getElementById('minimap');this.ctx=this.map.getContext('2d');this.base=document.createElement('canvas');this.base.width=this.base.height=176;const ctx=this.base.getContext('2d');const colors=['#c8b981','#987451','#698750','#76b4a5'];for(let z=0;z<44;z++)for(let x=0;x<44;x++){ctx.fillStyle=colors[world.tile(x,z)];ctx.fillRect(x*4,z*4,4,4);}
  this.projected=new THREE.Vector3();this.ammoBars=[...document.querySelectorAll('#ammo b')];this.ammoStatus=document.getElementById('ammo-status');document.getElementById('seed').textContent=world.seed;this.feed=[];
  this.labels=brawlers.map(b=>{const element=document.createElement('div');element.className='brawler-label'+(b.id===0?' you':'');element.innerHTML=`<span class="cube-count"></span><span class="class-tag"></span>${b.name}<div class="meter"><i class="lag"></i><b></b></div><div class="ammo"><i><b></b></i><i><b></b></i><i><b></b></i></div>`;document.getElementById('ui').appendChild(element);return{element,classTag:element.querySelector('.class-tag'),cubes:element.querySelector('.cube-count'),hp:element.querySelector('.meter b'),lag:element.querySelector('.lag'),lagValue:1,ammo:[...element.querySelectorAll('.ammo b')]};});
 }
 createBoxLabels(boxes){this.boxLabels=boxes.map(box=>{const element=document.createElement('div');element.className='box-label';element.innerHTML='◆ POWER<div class="meter"><b></b></div>';document.getElementById('ui').appendChild(element);return{box,element,hp:element.querySelector('b')};});}
 reset(){this.feed=[];for(const l of this.labels)l.lagValue=1;document.getElementById('kill-feed').replaceChildren();}
 addKill(victim,killer,time){const element=document.createElement('div');element.className='feed-entry';element.textContent=`${killer?killer.name:'POISON GAS'}  ›  ${victim.name}`;document.getElementById('kill-feed').prepend(element);this.feed.push({element,time});while(this.feed.length>CONFIG.match.feedLimit)this.feed.shift().element.remove();}
 fillAmmo(bars,brawler){bars.forEach((bar,slot)=>{const fill=1-(brawler.ammoTimers[slot]||0)/brawler.data.reload;bar.style.transform=`scaleX(${fill})`;});}
 update(game){
  const {player,brawlers,camera,elapsed,state}=game;const observer=game.spectating?(brawlers.find(b=>b.alive)||player):player;document.getElementById('touch-controls').classList.toggle('active',state==='playing'&&!game.paused);document.getElementById('touch-super').classList.toggle('ready',player.superCharge>=player.data.super.charge);
  document.getElementById('player-class').textContent=player.data.name.toUpperCase();(document.querySelector('.portrait') as HTMLElement).style.background='#'+player.data.color.toString(16).padStart(6,'0');const charge=player.superCharge/player.data.super.charge;document.getElementById('super-fill').style.transform=`scaleX(${charge})`;document.getElementById('super-status').textContent=charge>=1?(game.input.superHeld?'RELEASE TO FIRE · ':'READY · ')+player.data.super.name:`${player.data.super.name} · ${Math.floor(charge*100)}%`;
  if(this.mapRevision!==this.world.mapRevision){const ctx=this.base.getContext('2d'),colors=['#c8b981','#987451','#698750','#76b4a5'];for(let z=0;z<this.world.size;z++)for(let x=0;x<this.world.size;x++){ctx.fillStyle=colors[this.world.tile(x,z)];ctx.fillRect(x*4,z*4,4,4);}this.mapRevision=this.world.mapRevision;}
this.fillAmmo(this.ammoBars,player);this.ammoStatus.textContent=!player.alive?'ELIMINATED':player.ammo===0?'RELOADING…':`${player.ammo} / ${player.data.ammo} SHOTS READY`;document.getElementById('player-health').style.transform=`scaleX(${player.hp/player.maxHp})`;
  document.getElementById('cube-counter').textContent=`◆ ${player.cubes} POWER CUBE${player.cubes===1?'':'S'} · +${Math.round(player.cubes*CONFIG.cubes.bonus*100)}%`;
  const gas=game.gas,outside=state==='playing'&&gas.active&&gas.outside(player.position);document.getElementById('gas-warning').style.display=outside?'block':'none';document.getElementById('gas-status').textContent=elapsed<CONFIG.gas.delay?`GAS IN ${Math.ceil(CONFIG.gas.delay-elapsed)}s`:gas.half<=CONFIG.gas.endHalf?'FINAL SAFE ZONE':`GAS CLOSING · ${Math.ceil(CONFIG.gas.delay+CONFIG.gas.duration-elapsed)}s`;
  this.ctx.drawImage(this.base,0,0);
  if(gas.active){const lo=Math.max(0,(this.world.half-gas.half)*4),hi=176-lo;this.ctx.fillStyle='#8c4bb66e';this.ctx.fillRect(0,0,lo,176);this.ctx.fillRect(hi,0,lo,176);this.ctx.fillRect(lo,0,hi-lo,lo);this.ctx.fillRect(lo,hi,hi-lo,lo);this.ctx.strokeStyle='#edc5ff';this.ctx.lineWidth=1.5;this.ctx.strokeRect(lo,lo,hi-lo,hi-lo);}
  for(const label of this.boxLabels){const box=label.box;this.projected.copy(box.position);this.projected.y=1.35;this.projected.project(camera);label.element.style.display=box.alive&&!['menu','select'].includes(state)&&Math.abs(this.projected.x)<1&&Math.abs(this.projected.y)<1?'block':'none';label.element.style.left=((this.projected.x*.5+.5)*innerWidth)+'px';label.element.style.top=((-this.projected.y*.5+.5)*innerHeight)+'px';label.hp.style.transform=`scaleX(${box.hp/CONFIG.cubes.boxHp})`;if(box.alive||box.available){this.ctx.fillStyle=box.alive?'#f3d37b':'#d7ff78';this.ctx.fillRect((box.position.x+this.world.half)*4-1.5,(box.position.z+this.world.half)*4-1.5,3,3);}}

  for(const b of brawlers){const label=this.labels[b.id],visible=this.world.visibleTo(b,observer);b.group.visible=visible;if(b.deathTime>0)b.group.visible=true;if(['menu','select'].includes(state))b.group.visible=b.id===0;
   this.projected.copy(b.position);this.projected.y=1.9;this.projected.project(camera);label.element.style.display=visible&&!['menu','select'].includes(state)&&Math.abs(this.projected.x)<1&&Math.abs(this.projected.y)<1?'block':'none';label.element.style.left=((this.projected.x*.5+.5)*innerWidth)+'px';label.element.style.top=((-this.projected.y*.5+.5)*innerHeight)+'px';label.hp.style.transform=`scaleX(${b.hp/b.maxHp})`;label.lagValue=Math.max(b.hp/b.maxHp,(label.lagValue??1)-.006);label.lag.style.transform=`scaleX(${label.lagValue})`;label.classTag.textContent=b.data.name.toUpperCase();label.cubes.textContent=b.cubes?`◆ ${b.cubes}`:'';this.fillAmmo(label.ammo,b);
   if(visible&&(b.id===0||b.position.distanceToSquared(observer.position)<144)){this.ctx.fillStyle=b.id===0?'#effdb5':'#b84d3d';this.ctx.beginPath();this.ctx.arc((b.position.x+this.world.half)*4,(b.position.z+this.world.half)*4,b.id===0?3:2.2,0,Math.PI*2);this.ctx.fill();}
  }
  while(this.feed.length&&elapsed-this.feed[0].time>CONFIG.match.feedDuration)this.feed.shift().element.remove();
  const alive=brawlers.filter(b=>b.alive).length,clock=`${Math.floor(elapsed/60)}:${String(Math.floor(elapsed%60)).padStart(2,'0')}`;
  document.getElementById('match-status').textContent=['menu','select'].includes(state)?'SOLO SHOWDOWN':`${alive} BRAWLERS LEFT · ${clock}`;document.getElementById('range-report').textContent=['menu','select'].includes(state)?'8 BRAWLERS READY':`${player.kills} KILLS · ${player.damageDealt.toLocaleString()} DAMAGE`;document.getElementById('hint').style.opacity=state==='playing'&&elapsed<10&&game.showHints?'1':'0';document.getElementById('countdown').textContent=state==='countdown'?String(Math.ceil(game.countdown)):'';
 }
 dispose(){
  for (const l of this.labels || []) if (l.element.parentElement) l.element.remove();
  for (const l of this.boxLabels || []) if (l.element.parentElement) l.element.remove();
  const feed = document.getElementById('kill-feed');
  if (feed) feed.replaceChildren();
 }
}

export class Game {
  // ---- injected field declarations (ported from JS) ----
  rafId!: any;

  private _listeners: Array<{ target: EventTarget; type: string; handler: (e: any) => void; options?: any }> = [];
  private _listen(target: EventTarget, type: string, handler: (e: any) => void, options?: any) {
    target.addEventListener(type, handler as EventListener, options);
    this._listeners.push({ target, type, handler, options });
  }
  private _unlistenAll() {
    for (const l of this._listeners) l.target.removeEventListener(l.type, l.handler as EventListener, l.options);
    this._listeners = [];
  }
  scene!: any;
  renderer!: any;
  camera!: any;
  focus!: any;
  quality!: any;
  ambient!: any;
  sun!: any;
  world!: any;
  brawlers!: any;
  player!: any;
  powerCubes!: any;
  gas!: any;
  combat!: any;
  hud!: any;
  audio!: any;
  effects!: any;
  input!: any;
  lowSamples!: any;
  fpsTime!: any;
  frames!: any;
  selectedClass!: any;
  difficulty!: any;
  brains!: any;
  state!: any;
  paused!: any;
  elapsed!: any;
  countdown!: any;
  last!: any;
  accumulator!: any;
  playerRank!: any;
  performanceTime!: any;
  visualTime!: any;
  cameraRig!: any;
  sky!: any;
  clouds!: any;
  cloudDummy!: any;
  lilyData!: any;
  lilies!: any;
  bushInk!: any;
  bushOutlineScale!: any;
  ambientClock!: any;
  hasPlayed!: any;
  resultAge!: any;
  gasAnnounced!: any;
  pedestal!: any;
  showcaseLight!: any;
  spectating!: any;
  reduceShake!: any;
  confetti!: any;
  confettiCanvas!: any;
  debug!: any;
  debugPanel!: any;
  timeOverride!: any;
  lamps!: any;
  lampLights!: any;
  lightColors!: any;
  finalHandled!: any;
  finalSlow!: any;
  showHints!: any;
 constructor(){this.scene=new THREE.Scene();this.scene.background=new THREE.Color(CONFIG.colors.edge);this.scene.fog=new THREE.Fog(CONFIG.colors.edge,65,110);this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.outputEncoding=THREE.sRGBEncoding;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.setClearColor(CONFIG.colors.edge);document.getElementById('viewport').appendChild(this.renderer.domElement);this.camera=new THREE.OrthographicCamera(-15,15,10,-10,.1,150);this.focus=new THREE.Vector3(.5,0,5.5);this.quality=window.matchMedia('(any-pointer: coarse)').matches?'medium':CONFIG.quality.default;this.setQuality(this.quality);
  this.ambient=new THREE.HemisphereLight(CONFIG.palette.swatch_f9f3d8,CONFIG.palette.swatch_718467,2.4);this.scene.add(this.ambient);this.sun=new THREE.DirectionalLight(CONFIG.palette.sunDay,3.1);this.sun.position.set(-15,27,12);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:1,far:80});this.sun.shadow.normalBias=.035;this.sun.shadow.bias=-.0003;this.scene.add(this.sun);
  this.world=new World(this.scene);this.brawlers=Array.from({length:8},(_,id)=>new Brawler(this.scene,this.world,id));this.player=this.brawlers[0];this.powerCubes=new PowerCubes(this.scene,this.world);this.gas=new Gas(this.scene,this.world);this.combat=new Combat(this.scene,this.world);this.combat.brawlers=this.brawlers;this.combat.powerCubes=this.powerCubes;this.combat.onEliminate=(victim,killer)=>this.eliminate(victim,killer);this.hud=new Hud(this.world,this.brawlers);this.hud.createBoxLabels(this.powerCubes.boxes);this.audio=new Audio();this.audio.listener=this.player.position;this.effects=new Effects(this.scene);this.effects.limit=CONFIG.quality[this.quality].particles;this.combat.audio=this.powerCubes.audio=this.audio;this.combat.effects=this.powerCubes.effects=this.effects;this.input=new Input(()=>this.togglePause(),this.renderer.domElement,()=>this.audio.setMuted(!this.audio.muted));this.input.setupTouch();this.buildLamps();this.setQuality(this.quality);
  this._listen(window,'pointerdown',()=>this.audio.start(),{capture:true,passive:true});document.getElementById('mute').onclick=()=>this.audio.setMuted(!this.audio.muted);(document.getElementById('quality') as HTMLSelectElement).value=this.quality;document.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>this.audio.play('ui')));document.getElementById('quality').onchange=e=>{this.lowSamples=0;this.fpsTime=0;this.frames=0;this.setQuality((e.target as HTMLSelectElement).value);};this.selectedClass='shotgunner';this.difficulty='normal';this.brains=this.brawlers.slice(1).map(b=>new BotBrain(b,this.world,this.brawlers,this.difficulty,this.gas,this.powerCubes));this.state='menu';this.paused=false;this.elapsed=0;this.countdown=CONFIG.match.countdown;this.last=0;this.accumulator=0;this.fpsTime=0;this.frames=0;this.lowSamples=0;this.playerRank=null;this.performanceTime=0;
  const roster=document.getElementById('roster');for(const [key,data]of Object.entries(CONFIG.characters)){const button=document.createElement('button');button.dataset.brawler=key;button.innerHTML=`<span class="class-icon" style="--class-color:#${data.color.toString(16).padStart(6,'0')}">${data.icon}</span>${data.name}<small>${data.hp.toLocaleString()} HP</small>`;button.onclick=()=>this.selectClass(key);roster.appendChild(button);}this.selectClass(this.selectedClass);
  document.getElementById('start').onclick=()=>this.startMatch();document.getElementById('again').onclick=()=>this.startMatch();document.getElementById('back-menu').onclick=()=>this.showMenu();
  const descriptions={easy:'Forgiving aim, slower reactions, and less incoming damage.',normal:'Balanced rivals with steady aim and a taste for a fight.',hard:'Sharp aim, quick reactions, full damage, and aggressive pursuit.'};
  for(const button of document.querySelectorAll<HTMLElement>('[data-difficulty]'))button.onclick=()=>{this.difficulty=button.dataset.difficulty;for(const option of document.querySelectorAll<HTMLElement>('[data-difficulty]')){const selected=option===button;option.classList.toggle('selected',selected);option.setAttribute('aria-pressed',String(selected));}document.getElementById('difficulty-description').textContent=descriptions[this.difficulty];};
  document.getElementById('pause').onclick=()=>this.togglePause();document.getElementById('resume').onclick=()=>this.togglePause();this._listen(document,'visibilitychange',()=>{if(document.hidden&&!this.paused)this.togglePause();});this._listen(window,'blur',()=>{if(!this.paused)this.togglePause();});this._listen(window,'resize',()=>this.resize());this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();showError('The graphics context was interrupted. Reload the page to return to the arena.');});this.visualTime=0;this.cameraRig=new Camera(this);this.combat.cameraRig=this.cameraRig;this.world.combat=this.combat;this.world.effects=this.effects;this.world.audio=this.audio;this.effects.listener=this.player.position;this.setupDebug();this.setupPresentation();this.setupAtmosphere();this.resize();this.updateCamera(1);this.rafId=requestAnimationFrame(t=>this.frame(t));
 }
 setupAtmosphere(){const skyCanvas=document.createElement('canvas');skyCanvas.width=16;skyCanvas.height=128;const c=skyCanvas.getContext('2d'),grad=c.createLinearGradient(0,0,0,128);grad.addColorStop(0,'#809bd6');grad.addColorStop(.5,'#eec7d4');grad.addColorStop(1,'#ffdaa5');c.fillStyle=grad;c.fillRect(0,0,16,128);this.sky=new THREE.Mesh(new THREE.SphereGeometry(95,16,12),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(skyCanvas),side:THREE.BackSide,fog:false,depthWrite:false}));this.scene.add(this.sky);
  this.clouds=new THREE.InstancedMesh(new THREE.PlaneGeometry(8,5),new THREE.MeshBasicMaterial({map:GLOW,color:CONFIG.palette.swatch_57497b,transparent:true,opacity:.08,depthWrite:false}),8);this.clouds.frustumCulled=false;this.scene.add(this.clouds);this.cloudDummy=new THREE.Object3D();
  const waterTiles=[];for(let z=0;z<this.world.size;z++)for(let x=0;x<this.world.size;x++)if(this.world.tile(x,z)===TILE.WATER&&((x*7+z)%5===0))waterTiles.push({x:x-this.world.half+.5,z:z-this.world.half+.5});this.lilyData=waterTiles;this.lilies=new THREE.InstancedMesh(new THREE.CircleGeometry(.18,8,0,Math.PI*1.8),new ToonMaterial({color:CONFIG.palette.swatch_95dd68,side:THREE.DoubleSide}),waterTiles.length);this.scene.add(this.lilies);
  this.bushInk=new THREE.InstancedMesh(this.world.bushes.geometry,new THREE.MeshBasicMaterial({color:CONFIG.palette.swatch_346343,side:THREE.BackSide}),this.world.bushData.length);this.bushOutlineScale=new THREE.Vector3(1.025,1.025,1.025);this.bushInk.userData.propOutline=true;this.scene.add(this.bushInk);this.setQuality(this.quality);this.ambientClock=0;
 }
 updateAtmosphere(dt){const d=this.cloudDummy;for(let i=0;i<8;i++){d.position.set(((this.visualTime*.3+i*7)%56)-28,.026,(i*11)%44-22);d.rotation.set(-Math.PI/2,0,.4);d.scale.set(1,1,1);d.updateMatrix();this.clouds.setMatrixAt(i,d.matrix);}this.clouds.instanceMatrix.needsUpdate=true;this.clouds.visible=this.quality!=='low';for(let i=0;i<this.lilyData.length;i++){const p=this.lilyData[i];d.position.set(p.x,.065+Math.sin(this.visualTime*2+i)*.008,p.z);d.rotation.set(-Math.PI/2,0,i);d.scale.setScalar(1);d.updateMatrix();this.lilies.setMatrixAt(i,d.matrix);}this.lilies.instanceMatrix.needsUpdate=true;
  for(let i=0;i<this.world.bushData.length;i++){this.world.bushes.getMatrixAt(i,d.matrix);d.matrix.scale(this.bushOutlineScale);this.bushInk.setMatrixAt(i,d.matrix);}this.bushInk.instanceMatrix.needsUpdate=true;
  this.ambientClock+=dt;if(!this.paused&&this.ambientClock>.25){this.ambientClock=0;const p=this.player.position;this.effects.burst(p.x+(Math.random()-.5)*15,1.5,p.z+(Math.random()-.5)*15,CONFIG.colors.cream,2,.08);if(this.gas.active){const h=this.gas.half;this.effects.burst(Math.max(-h,Math.min(h,p.x+4)),1,p.z,CONFIG.palette.swatch_b8f58a,2,.2);}}
 }
 bounce(element){element.animate([{transform:'scale(.65)',opacity:.5},{transform:'scale(1.18)',opacity:1},{transform:'scale(1)',opacity:1}],{duration:320,easing:'ease-out'});}
 banner(text){const e=document.getElementById('event-banner');e.textContent=text;e.animate([{opacity:0,transform:'translate(-50%,-20px) scale(.7)'},{opacity:1,transform:'translate(-50%,0) scale(1)',offset:.15},{opacity:1,offset:.7},{opacity:0}],{duration:1800});}
 setupPresentation(){this.hasPlayed=false;this.resultAge=0;this.gasAnnounced=false;this.pedestal=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.55,.26,32),new ToonMaterial({color:CONFIG.palette.swatch_c584ee}));this.pedestal.position.copy(this.player.position);this.pedestal.position.y=-.07;this.pedestal.receiveShadow=true;this.scene.add(this.pedestal);outline(this.pedestal);this.showcaseLight=new THREE.SpotLight(CONFIG.palette.swatch_ffebbf,.9,14,Math.PI/6,.7);this.showcaseLight.position.copy(this.player.position).add(new THREE.Vector3(0,6,3));this.showcaseLight.target=this.player.group;this.scene.add(this.showcaseLight);
  document.getElementById('choose').onclick=()=>{this.state='select';document.getElementById('lobby').dataset.step='select';this.audio.play('ui');};(document.getElementById('seed-input') as HTMLInputElement).value=String(this.world.seed);document.getElementById('apply-seed').onclick=()=>{const field=document.getElementById('seed-input') as HTMLInputElement;if(!field.reportValidity())return;const url=new URL(location.href);url.searchParams.set('seed',String(Number(field.value)>>>0));location.href=url.href;};
  document.getElementById('spectate').onclick=()=>{this.state='spectating';this.spectating=true;document.getElementById('result').hidden=true;document.getElementById('watch-end').hidden=false;};document.getElementById('watch-end').onclick=()=>{this.state='result';this.spectating=false;document.getElementById('result').hidden=false;document.getElementById('watch-end').hidden=true;};document.getElementById('reduce-shake').onchange=e=>this.reduceShake=(e.target as HTMLInputElement).checked;document.getElementById('master-volume').oninput=e=>{CONFIG.audio.volume=Number((e.target as HTMLInputElement).value)/100*.4;this.audio.sync();};document.getElementById('sfx-volume').oninput=e=>this.audio.sfxVolume=Number((e.target as HTMLInputElement).value)/100;
  this.confetti=Array.from({length:100},(_,i)=>({x:Math.random(),y:-Math.random(),speed:.1+Math.random()*.2,color:['#ffcc55','#ff7799','#83ead6','#ac83ef'][i%4],angle:Math.random()*6}));this.confettiCanvas=document.getElementById('celebration');this.selectClass(this.selectedClass);
 }
 updatePresentation(dt){const lobby=['menu','select'].includes(this.state);this.pedestal.visible=this.showcaseLight.visible=lobby;document.body.classList.toggle('in-lobby',lobby);if(lobby){this.player.body.rotation.y=Math.sin(this.visualTime*.5)*.5;this.player.body.position.y=.05+Math.sin(this.visualTime*2)*.025;this.player.paintEyes(performance.now()/1000);}
  document.getElementById('big-hp').textContent=this.player.alive?Math.ceil(this.player.hp).toLocaleString()+' HP':'';const low=this.player.alive&&this.player.hp/this.player.maxHp<.3&&!lobby,outside=this.gas.active&&this.gas.outside(this.player.position)&&this.state==='playing';document.getElementById('vignette').style.boxShadow=low||outside?`inset 0 0 ${80+Math.sin(this.visualTime*7)*25}px #ef315f99`:`inset 0 0 130px ${this.elapsed<60?'#ff983c22':'#37306555'}`;const arrow=document.getElementById('safety-arrow');arrow.style.display=outside?'block':'none';arrow.style.transform=`translateX(-50%) rotate(${Math.atan2(-this.player.position.x,this.player.position.z)}rad)`;
  if(this.state==='playing'&&this.elapsed>=CONFIG.gas.delay-4&&!this.gasAnnounced){this.gasAnnounced=true;this.banner('GAS INCOMING');}if(this.elapsed<1)this.gasAnnounced=false;
  const charge=this.player.superCharge/this.player.data.super.charge;document.getElementById('super-hud').style.setProperty('--charge',charge*360+'deg');document.getElementById('super-hud').classList.toggle('ready',charge>=1);document.getElementById('touch-super').style.background=`conic-gradient(#ffdc58 ${charge*360}deg,#423550 0)`;this.player.marker.material.color.setHex(charge>=1?CONFIG.palette.swatch_ffda55:CONFIG.palette.playerRing);if(!this.player.leap)this.player.marker.scale.setScalar(charge>=1?1+Math.sin(this.visualTime*7)*.1:1);
  const c=this.confettiCanvas,ctx=c.getContext('2d');if(c.width!==innerWidth||c.height!==innerHeight){c.width=innerWidth;c.height=innerHeight;}ctx.clearRect(0,0,c.width,c.height);if(this.state==='result'){this.resultAge+=dt;const t=Math.min(1,this.resultAge/1.1),ease=1-(1-t)**3;document.getElementById('result-kills').textContent=String(Math.round(this.player.kills*ease));document.getElementById('result-cubes').textContent=String(Math.round(this.player.cubes*ease));document.getElementById('result-damage').textContent=Math.round(this.player.damageDealt*ease).toLocaleString();if(this.playerRank<=3){for(const p of this.confetti){p.y+=p.speed*dt;if(p.y>1)p.y=-.1;p.angle+=dt;ctx.save();ctx.translate(p.x*c.width,p.y*c.height);ctx.rotate(p.angle);ctx.fillStyle=p.color;ctx.fillRect(-4,-4,8,12);ctx.restore();}}if(this.player.alive){this.player.body.rotation.y=Math.sin(this.visualTime*5)*.6;this.player.body.position.y=Math.abs(Math.sin(this.visualTime*6))*.18;}}
  for(const b of this.brawlers){if(b.deathTime>0){b.deathTime=Math.max(0,b.deathTime-dt);b.body.rotation.y+=dt*22;b.body.scale.setScalar(b.deathTime/.3);}}
 }
 setupDebug(){this.debug=new URLSearchParams(location.search).get('debug')==='1';if(!this.debug)return;this.debugPanel=document.createElement('div');this.debugPanel.id='debug';document.body.appendChild(this.debugPanel);this._listen(window,'keydown',e=>{if(e.repeat||/INPUT|SELECT/.test((e.target as HTMLElement).tagName))return;if(e.code==='KeyR'){this.player.superCharge=this.player.data.super.charge;this.player.ammoTimers.fill(0);}if(e.code==='KeyG')this.elapsed=CONFIG.gas.delay+50;if(e.code==='KeyT')this.timeOverride=((this.timeOverride??0)+.5)%1.5;if(e.code==='KeyN'){const target=this.brawlers[1];target.reset();target.name='DUMMY';target.isDummy=true;for(let d=2;d<6;d+=.5){const x=this.player.position.x+Math.sin(this.player.aimAngle)*d,z=this.player.position.z+Math.cos(this.player.aimAngle)*d;if(this.world.canOccupy(x,z)){target.position.set(x,0,z);target.group.position.copy(target.position);break;}}}});}
 setQuality(name){this.quality=name;const preset=CONFIG.quality[name];this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,preset.pixelRatio));this.renderer.shadowMap.enabled=preset.shadows;if(this.effects){this.effects.limit=preset.particles;this.effects.decalMesh.visible=name!=='low';}if(this.lampLights)for(const light of this.lampLights)light.visible=name!=='low';if(this.sun&&this.sun.shadow.mapSize.x!==preset.shadowSize){this.sun.shadow.mapSize.set(preset.shadowSize,preset.shadowSize);this.sun.shadow.map?.dispose();this.sun.shadow.map=null;}(document.getElementById('quality') as HTMLSelectElement).value=name;if(this.world)this.scene.traverse(o=>{if(o.userData.propOutline)o.visible=name!=='low';if(o.material)o.material.needsUpdate=true;});}
 buildLamps(){
  this.lamps=[];const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,205,111,0.5)');gradient.addColorStop(1,'rgba(255,205,111,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
  for(const [desiredX,desiredZ]of [[-10,-10],[10,-10],[-10,10],[10,10],[0,-16],[0,16],[-16,0],[16,0]]){let spot=null,best=Infinity;for(const index of this.world.wallInstances.keys()){const tx=index%44,tz=Math.floor(index/44),x=tx-21.5,z=tz-21.5,dist=(x-desiredX)**2+(z-desiredZ)**2;if(tx>0&&tz>0&&tx<43&&tz<43&&dist<best){spot={x,z,tx,tz};best=dist;}}const {x,z,tx,tz}=spot;const base=CONFIG.map.wallHeight;const pole=new THREE.Mesh(new THREE.CylinderGeometry(.065,.09,1.7,6),new ToonMaterial({color:CONFIG.palette.swatch_53605a}));pole.position.set(x,base+.85,z);pole.castShadow=true;const bulb=new THREE.Mesh(new THREE.BoxGeometry(.26,.32,.26),new ToonMaterial({color:CONFIG.palette.swatch_ffd99c,emissive:CONFIG.palette.lampGlow,emissiveIntensity:0}));bulb.position.set(x,base+1.8,z);const cap=new THREE.Mesh(new THREE.ConeGeometry(.23,.15,4),new ToonMaterial({color:CONFIG.palette.swatch_48554d}));cap.position.set(x,base+2.04,z);const glow=new THREE.Mesh(new THREE.PlaneGeometry(6,6),new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));glow.rotation.x=-Math.PI/2;glow.position.set(x,.04,z);this.scene.add(pole,bulb,cap,glow);this.lamps.push({x,z,tx,tz,pole,cap,bulb,glow,base});}
  this.lampLights=Array.from({length:2},()=>{const light=new THREE.PointLight(CONFIG.palette.swatch_ffc784,0,8,2);this.scene.add(light);return light;});this.lightColors={daySun:new THREE.Color(CONFIG.palette.sunDay),nightSun:new THREE.Color(CONFIG.palette.sunNight),daySky:new THREE.Color(CONFIG.palette.skyDay),nightSky:new THREE.Color(CONFIG.palette.skyNight),dayGround:new THREE.Color(CONFIG.palette.groundDay),nightGround:new THREE.Color(CONFIG.palette.groundNight),dayFog:new THREE.Color(CONFIG.colors.edge),nightFog:new THREE.Color(CONFIG.palette.fogNight)};
 }
 updateLighting(){const t=Math.min(1,this.timeOverride??this.elapsed/CONFIG.lighting.nightAt),c=this.lightColors;this.sun.color.copy(c.daySun).lerp(c.nightSun,t);this.sun.intensity=CONFIG.lighting.daySun+(CONFIG.lighting.nightSun-CONFIG.lighting.daySun)*t;this.sun.position.set(-15+t*12,27-t*10,12-t*20);this.ambient.color.copy(c.daySky).lerp(c.nightSky,t);this.ambient.groundColor.copy(c.dayGround).lerp(c.nightGround,t);this.ambient.intensity=CONFIG.lighting.dayAmbient+(CONFIG.lighting.nightAmbient-CONFIG.lighting.dayAmbient)*t;this.scene.background.copy(c.dayFog).lerp(c.nightFog,t);this.scene.fog.color.copy(this.scene.background);if(this.sky)this.sky.material.color.setHex(CONFIG.palette.white).lerp(c.nightFog,t*.8);this.world.backdrop.material.color.copy(this.scene.background);const glow=Math.max(0,(t-CONFIG.lighting.dusk)/(1-CONFIG.lighting.dusk));for(const lamp of this.lamps){const intact=this.world.tile(lamp.tx,lamp.tz)===TILE.WALL;lamp.pole.visible=lamp.cap.visible=lamp.bulb.visible=lamp.glow.visible=intact;lamp.bulb.material.emissiveIntensity=glow*2;lamp.glow.material.opacity=glow;}
  const nearest=this.lamps.filter(l=>l.bulb.visible).sort((a,b)=>Math.hypot(a.x-this.player.position.x,a.z-this.player.position.z)-Math.hypot(b.x-this.player.position.x,b.z-this.player.position.z));this.lampLights.forEach((light,i)=>{const lamp=nearest[i]||nearest[0];if(!lamp){light.intensity=0;return;}light.position.set(lamp.x,lamp.base+1.6,lamp.z);light.intensity=this.quality==='low'?0:glow*3;if(i===0&&this.effects.muzzleLife>0){light.position.copy(this.effects.muzzleSprite.position);light.color.copy(this.effects.muzzleSprite.material.color);light.intensity=this.quality==='low'?0:4;light.distance=4;}else{light.color.setHex(CONFIG.palette.swatch_ffc784);light.distance=8;}});
 }
 resize(){const aspect=innerWidth/innerHeight,half=CONFIG.camera.viewHeight/2;this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);}
 selectClass(key){this.selectedClass=key;this.player.setClass(key);for(const button of document.querySelectorAll<HTMLElement>('[data-brawler]')){const selected=button.dataset.brawler===key;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));}const data=CONFIG.characters[key];document.getElementById('class-description').textContent=data.role+' · '+data.description;document.getElementById('stat-bars').innerHTML=([['HEALTH',data.hp/6500],['SPEED',data.speed/4],['RANGE',data.attack.range/10],['DAMAGE',data.attack.damage*(data.attack.type==='punch'?2:data.attack.pellets||data.attack.shots||1)/1500]] as [string,number][]).map(([label,value])=>`<label>${label}<span><b style="width:${Math.min(1,value)*100}%;background:#${data.color.toString(16)}"></b></span></label>`).join('');}
 startMatch(){
  this.world.resetWalls();this.player.setClass(this.selectedClass);for(const b of this.brawlers)b.reset();for(const brain of this.brains)brain.reset(this.difficulty);this.combat.reset();this.effects.reset();this.audio.setPaused(false);this.powerCubes.reset();this.gas.reset();this.hud.reset();this.input.clear();this.input.hasAim=false;this.spectating=false;this.finalHandled=false;this.finalSlow=0;this.playerRank=null;this.elapsed=0;this.showHints=!this.hasPlayed;this.hasPlayed=true;this.countdown=CONFIG.match.countdown;this.accumulator=0;this.paused=false;this.state='countdown';this.fpsTime=0;this.frames=0;this.performanceTime=0;this.lowSamples=0;this.focus.copy(this.player.position);this.updateCamera(1);
  document.getElementById('lobby').hidden=true;document.getElementById('result').hidden=true;document.getElementById('modal').classList.remove('visible');document.querySelector('.side').classList.add('match-active');document.getElementById('pause').setAttribute('aria-label','Pause game');
 }
 showMenu(){this.world.resetWalls();this.state='select';document.getElementById('lobby').dataset.step='select';this.paused=false;this.input.clear();this.effects.reset();this.audio.setPaused(false);this.combat.reset();this.powerCubes.reset();this.gas.reset();for(const b of this.brawlers)b.reset();this.hud.reset();this.elapsed=0;document.getElementById('result').hidden=true;document.getElementById('lobby').hidden=false;document.querySelector('.side').classList.remove('match-active');}
 eliminate(victim,killer){this.hud.addKill(victim,killer,this.elapsed);if(killer===this.player)this.banner('KO!');const left=this.brawlers.filter(b=>b.alive).length;if(left===5||left===3)this.banner(left===3?'FINAL 3!':'5 LEFT!');this.bounce(document.getElementById('match-status'));if(victim===this.player)this.playerRank=this.brawlers.filter(b=>b.alive).length+1;}
 checkResult(){const alive=this.brawlers.filter(b=>b.alive);if(this.player.alive&&alive.length>1)return;
  if(this.player.alive&&!this.finalHandled){this.finalHandled=true;this.finalSlow=CONFIG.juice.killSlow;return;}if(this.finalSlow>0)return;this.state='result';this.resultAge=0;this.input.clear();document.getElementById('spectate').hidden=alive.length<=1;const draw=alive.length===0,won=this.player.alive&&alive.length===1;this.playerRank=won?1:this.playerRank;this.audio.play(won?'win':'loss');
  document.getElementById('result-eyebrow').textContent=draw?'NO SURVIVORS':won?'LAST BRAWLER STANDING':'ELIMINATED';document.getElementById('result-title').textContent=won?'The arena is yours.':draw?'A final trade.':'Dust yourself off.';document.getElementById('result-rank').textContent=draw?'DRAW':`#${this.playerRank} / 8`;document.getElementById('result-summary').textContent=`${Math.floor(this.elapsed)}s survived · ${this.difficulty} difficulty`;document.getElementById('result').hidden=false;document.getElementById('result').dataset.outcome=won?'win':'loss';document.getElementById('result-kills').textContent=this.player.kills;document.getElementById('result-cubes').textContent=this.player.cubes;document.getElementById('result-damage').textContent=this.player.damageDealt.toLocaleString();document.getElementById('result-cause').textContent=won?'Every rival down. You held your ground.':draw?'No brawler survived the final exchange.':`Eliminated by ${this.player.eliminatedBy||'a rival'}.`;
 }
 togglePause(){if(!['playing','countdown','menu','select','spectating'].includes(this.state))return;this.paused=!this.paused;this.audio.setPaused(this.paused);this.input.clear();for(const b of this.brawlers)b.velocity.set(0,0);this.accumulator=0;this.fpsTime=0;this.frames=0;document.getElementById('modal').classList.toggle('visible',this.paused);document.getElementById('pause').setAttribute('aria-label',this.paused?'Resume game':'Pause game');}
 step(dt){
  if(this.paused)return;
  if(this.state==='countdown'){const before=Math.ceil(this.countdown);this.countdown=Math.max(0,this.countdown-dt);if(Math.ceil(this.countdown)!==before){this.audio.play('tick');this.bounce(document.getElementById('countdown'));}this.input.clear();if(this.countdown<=1e-8){this.state='playing';this.banner('GO!');}return;}
  if(this.state==='spectating'){this.elapsed+=dt;for(const brain of this.brains)brain.update(dt,this.combat);this.combat.update(dt);this.gas.update(dt,this.elapsed,this.brawlers,this.combat);this.powerCubes.update(dt,this.elapsed,this.brawlers);if(this.brawlers.filter(b=>b.alive).length<=1){this.state='result';this.spectating=false;document.getElementById('result').hidden=false;document.getElementById('watch-end').hidden=true;}return;}if(this.state!=='playing')return;
  this.elapsed+=dt;if(this.input.autoAim){this.combat.autoAim(this.player,this.input.superQueued);this.input.touchAutoLocked=true;this.input.autoAim=false;this.input.touchAimActive=false;}else this.combat.aim(this.player,this.input,this.camera);this.player.update(dt,this.input);if(this.input.superQueued)this.combat.useSuper(this.player);if(!this.input.superHeld&&!this.input.superQueued&&(this.input.firing||this.input.shotQueued))this.combat.fire(this.player);this.input.shotQueued=false;this.input.superQueued=false;
  for(const brain of this.brains){if(brain.brawler?.isDummy)continue;brain.update(dt,this.combat);}this.combat.update(dt);this.gas.update(dt,this.elapsed,this.brawlers,this.combat);this.powerCubes.update(dt,this.elapsed,this.brawlers);this.checkResult();
 }
 updateCamera(dt){this.cameraRig?.update(dt);}
 frame(timestamp){
  this.rafId=requestAnimationFrame(t=>this.frame(t));const raw=this.last?(timestamp-this.last)/1000:0;this.last=timestamp;const dt=Math.min(raw,CONFIG.timing.maxFrame);this.visualTime+=dt;this.world.update(this.visualTime,this.paused?0:dt);
  if(!this.paused){this.effects.update(dt);const frozen=this.effects.hitstop>0;this.effects.hitstop=Math.max(0,this.effects.hitstop-dt);this.finalSlow=Math.max(0,(this.finalSlow||0)-dt);this.accumulator+=frozen?0:dt*(this.finalSlow>0?CONFIG.juice.slowScale:1);while(this.accumulator>=CONFIG.timing.step){this.step(CONFIG.timing.step);this.accumulator-=CONFIG.timing.step;}this.updateCamera(dt);}
  if(!this.paused&&this.state==='playing'){this.frames++;this.fpsTime+=raw;this.performanceTime+=raw;if(this.fpsTime>=CONFIG.quality.sampleSeconds){const fps=Math.round(this.frames/this.fpsTime);document.getElementById('stats').textContent=`${fps} FPS · ${this.quality.toUpperCase()} QUALITY`;if(this.performanceTime>CONFIG.quality.warmup&&fps<CONFIG.quality.dropFps){this.lowSamples++;if(this.lowSamples>=2&&this.quality!=='low'){this.setQuality(this.quality==='high'?'medium':'low');this.lowSamples=0;}}else this.lowSamples=0;this.frames=0;this.fpsTime=0;}}
  this.updateAtmosphere(dt);this.audio.update(dt,this.brawlers.filter(b=>b.alive).length,['playing','spectating'].includes(this.state),this.gas.active);this.updatePresentation(dt);this.combat.render(this.player,this.camera,this.input.hasAim&&this.state==='playing'&&this.player.alive,this.input.superHeld);this.gas.render();this.updateLighting();this.effects.render(this.camera);this.hud.update(this);this.renderer.render(this.scene,this.camera);if(this.debugPanel){const r=this.renderer.info.render;this.debugPanel.textContent=`${Math.round(1/(raw||.016))} FPS · ${r.calls} draws · ${r.triangles.toLocaleString()} tris · ${this.effects.particles.filter(p=>p.life>0).length}/800 particles · ${this.quality} · audio ${this.audio.ctx?.state||'off'}\nN dummy · R refill · G gas · T time`;};
 }

 dispose(){
  cancelAnimationFrame(this.rafId);
  this._unlistenAll();
  try { this.input && this.input.dispose(); } catch {}
  try { this.hud && this.hud.dispose(); } catch {}
  try { this.effects && this.effects.dispose(); } catch {}
  if (this.debugPanel && this.debugPanel.parentElement) this.debugPanel.remove();
  const canvas = this.renderer && this.renderer.domElement;
  if (canvas && canvas.parentElement) canvas.parentElement.removeChild(canvas);
  try { this.renderer && this.renderer.dispose(); } catch {}
  document.body.classList.remove('in-lobby', 'touch-mode');
 }
}

function showError(message: string){document.getElementById('error')!.style.display='block';document.getElementById('error')!.textContent=message;}

export { showError };

/** Create the game and attach it to the page. Returns null on failure. */
export function startGame(): Game | null {
  try {
    return new Game();
  } catch (error) {
    console.error(error);
    showError('Unable to start the arena: ' + (error as Error).message);
    return null;
  }
}
