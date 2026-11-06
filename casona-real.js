import {createStoneWalls} from './muros-casona.js';
import {createStoneFloor,createBarStone} from './piedra-natural.js';
import {createPhotoWall} from './muro-fotografico.js';
import * as T from './vendor/three.module.js';

// Maqueta visual basada en el video del usuario. Unidades relativas, no medidas del inmueble.
// Las formas de botella son representativas; no constituyen un inventario de piezas reales.
export function createCasona(scene,renderer,pieces,video){
 const selectables=[],obstacles=[],markerPoints=[];let seed=6125,bottleCount=0;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 function tex(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
 const mat=(color,r=.65,m=0)=>new T.MeshStandardMaterial({color,roughness:r,metalness:m});
 const cube=new T.BoxGeometry(1,1,1);
 function mesh(geo,m,x=0,y=0,z=0,parent=scene,shadow=true){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;}
 function box(w,h,d,m,x,y,z,p=scene,shadow=true){const o=mesh(cube,m,x,y,z,p,shadow);o.scale.set(w,h,d);return o;}
 function cyl(r1,r2,h,m,x,y,z,p=scene){return mesh(new T.CylinderGeometry(r1,r2,h,20),m,x,y,z,p);}
 function rounded(w,h,d,m,x,y,z,p=scene){const s=new T.Shape(),r=Math.min(.12,h/3),a=-w/2,b=-h/2;s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);const g=new T.ExtrudeGeometry(s,{depth:d-.08,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.04,bevelThickness:.04,curveSegments:5});g.translate(0,0,-d/2+.04);return mesh(g,m,x,y,z,p);}
 const plaster=mat('#e9e4d7',.96),black=mat('#252723',.45,.35),metal=mat('#9b9e96',.3,.78),copper=mat('#b8744d',.22,.85),green=mat('#59725d',.7),fabric=mat('#bdb6a4',.97),pillow=mat('#d2cbbc',.98),white=mat('#e9e7df',.42),glow=new T.MeshBasicMaterial({color:'#ffe8b2'});
 const linen=tex(128,128,(c,w,h)=>{c.fillStyle='#f2eee8';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=3){c.fillStyle=y%2?'#e3ddd6':'#eae5de';c.fillRect(0,y,w,1);}for(let x=0;x<w;x+=3){c.fillStyle='rgba(164,153,139,.16)';c.fillRect(x,0,1,h);}for(let i=0;i<400;i++){c.fillStyle='rgba(108,98,84,.15)';c.fillRect(rand()*w,rand()*h,2,1);}});linen.wrapS=linen.wrapT=T.RepeatWrapping;linen.repeat.set(4,4);fabric.map=linen;pillow.map=linen;
 const woodTexture=tex(256,512,(c,w,h)=>{c.fillStyle='#8a6740';c.fillRect(0,0,w,h);for(let n=0;n<200;n++){c.strokeStyle=rand()>.5?'#c3995b33':'#271a1630';c.lineWidth=.5+rand()*2;c.beginPath();for(let y=0;y<h;y+=8){const x=n*1.4+Math.sin(y*.018+n)*2;y?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}});
 const wood=new T.MeshStandardMaterial({map:woodTexture,roughness:.62}),darkwood=new T.MeshStandardMaterial({map:woodTexture,color:'#554334',roughness:.6});
 const stoneTexture=tex(768,768,(c,w,h)=>{c.fillStyle='#a99d84';c.fillRect(0,0,w,h);for(let row=0;row<6;row++)for(let col=-1;col<6;col++){const x=col*160+(row%2)*70,y=row*128;const k=rand();c.fillStyle=`hsl(${30+k*9},${15+k*15}%,${44+k*28}%)`;c.beginPath();c.moveTo(x+8+rand()*20,y+6);c.lineTo(x+115+rand()*30,y+rand()*15);c.lineTo(x+150,y+55);c.lineTo(x+132,y+113);c.lineTo(x+22,y+124);c.lineTo(x+rand()*10,y+66);c.closePath();c.fill();c.strokeStyle='#e2d5b766';c.lineWidth=4;c.stroke();for(let n=0;n<90;n++){c.fillStyle=rand()>.5?'#fff4d510':'#382f2412';c.fillRect(x+rand()*148,y+rand()*115,1+rand()*14,1+rand()*3);}}});
 stoneTexture.wrapS=stoneTexture.wrapT=T.RepeatWrapping;stoneTexture.repeat.set(7,1.5);
 const stone=new T.MeshStandardMaterial({map:stoneTexture,bumpMap:stoneTexture,bumpScale:.16,roughness:.95});
 // Noche de casa: luz local, piedra sintética y una base ambiental que conserva el pasillo legible.
 scene.background=new T.Color('#1d2725');scene.fog=new T.Fog('#202b29',32,74);
 const env=new T.Scene();env.background=new T.Color('#8b8273');mesh(new T.BoxGeometry(30,18,40),new T.MeshBasicMaterial({color:'#c5ab86',side:T.BackSide}),0,0,0,env,false);const pm=new T.PMREMGenerator(renderer);scene.environment=pm.fromScene(env,.04).texture;scene.environmentIntensity=.33;pm.dispose();
 const wallsReady = createStoneWalls(scene, renderer);
 const floorMaterial=createStoneFloor(T,renderer),barMaterial=createBarStone(T,renderer);
 box(22,.2,36,floorMaterial,0,-.1,0);
 box(.3,7.3,36,stone,-11,3.65,0);box(22,7.3,.3,plaster,0,3.65,18);box(22,.18,36,plaster,0,7.3,0);
 box(.85,.018,36,green,-9.35,.015,0);box(.16,.02,36,black,-8.83,.02,0);box(.12,.02,36,black,-9.88,.02,0);
 for(let z=-17;z<18;z+=1.55)box(22,.32,.22,darkwood,0,7.04,z);
 // Rieles de luz y conducto visibles en las vistas generales (00:00, 01:35).
 for(const x of [-6.6,5.8]){box(.035,.035,35,black,x,6.95,0);for(let z=-15;z<17;z+=4.5){const spot=cyl(.12,.12,.19,black,x,6.82,z);spot.rotation.z=.28;mesh(new T.CircleGeometry(.095,12),glow,x,6.71,z).rotation.x=-Math.PI/2;}}
 const duct=cyl(.24,.24,34,metal,-9.4,6.8,0);duct.rotation.x=Math.PI/2;
 for(let z=-15;z<17;z+=4){box(.64,.28,.38,metal,-9.4,6.77,z);box(.4,.13,.02,black,-9.06,6.74,z);}
 const shapes=[[[0,0],[.15,0],[.18,.08],[.18,.42],[.11,.55],[.055,.61],[.055,.79],[0,.81]],[[0,0],[.16,0],[.25,.12],[.25,.35],[.16,.47],[.06,.55],[.06,.73],[0,.75]],[[0,0],[.13,0],[.16,.25],[.12,.54],[.06,.64],[.055,.92],[0,.94]],[[0,0],[.18,0],[.2,.1],[.16,.5],[.07,.6],[.07,.7],[0,.72]]];
 const geos=shapes.map(p=>new T.LatheGeometry(p.map(a=>new T.Vector2(...a)),16));
 geos.push(new T.BoxGeometry(.3,.58,.2).translate(0,.29,0));
 const colors=['#d8c486','#ece4c8','#c09a51','#7d4a23','#567761','#32665f','#25352a','#ddd7c7','#35516f','#a8492d'];
 const materials=colors.map((color,i)=>new T.MeshPhysicalMaterial({color,roughness:i===7?.52:.18,metalness:.08,clearcoat:1,envMapIntensity:.65}));
 const capGeo=new T.CylinderGeometry(.064,.064,.1,10),capMat=mat('#bba376',.36,.5),labelGeo=new T.PlaneGeometry(.16,.23);
 const labelTex=tex(64,96,(c,w,h)=>{c.fillStyle='#e1d5b7';c.fillRect(0,0,w,h);c.strokeStyle='#9d8f72';c.strokeRect(4,4,w-8,h-8);c.fillStyle='#756c53';c.fillRect(18,25,28,2);c.fillRect(12,51,40,2);c.fillRect(21,61,22,2);});const labelMat=new T.MeshStandardMaterial({map:labelTex,roughness:.9});
 const batches=new Map(),caps=[],labels=[];const dummy=new T.Object3D();
 function addBottle(x,y,z,type,scale,color,rot=Math.PI/2){const key=type+'-'+color;if(!batches.has(key))batches.set(key,[]);batches.get(key).push({x,y,z,scale,rot});const height=[.81,.75,.94,.72,.58][type];caps.push({x,y:y+height*scale,z,scale,rot});const depth=type===1?.255:type===4?.105:.185;labels.push({x:x+Math.sin(rot)*depth*scale,y:y+.3*scale,z:z+Math.cos(rot)*depth*scale,scale,rot});bottleCount++;}
 // Continuidad de colección al fondo, sólo donde existe evidencia general.
 for(let row=0;row<7;row++){const y=.5+row*.82;box(7,.08,.75,wood,-7.2,y,-17.35);for(let c=0;c<14;c++)addBottle(-10.25+c*.47,y+.04,-17.25,Math.floor(rand()*5),.68,Math.floor(rand()*10),0);}
 for(const x of [-10.7,-7.2,-3.7])box(.12,6.65,.14,black,x,3.3,-16.98);
 for(const y of [4.3,5.12,5.94,6.76]){box(13.5,.08,.7,wood,3.35,y,-17.35);for(let c=0;c<25;c++)addBottle(-3+c*.51,y+.04,-17.25,Math.floor(rand()*4),.62,Math.floor(rand()*10),0);}
 for(const x of [-3.5,0,3.5,7,10.5])box(.1,3.1,.12,black,x,5.42,-17);
 for(const [key,list] of batches){const [type,color]=key.split('-').map(Number);const inst=new T.InstancedMesh(geos[type],materials[color],list.length);list.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.rot,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);});inst.receiveShadow=true;scene.add(inst);}
 for(const [geo,material,list] of [[capGeo,capMat,caps],[labelGeo,labelMat,labels]]){const inst=new T.InstancedMesh(geo,material,list.length);list.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.rot,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);});scene.add(inst);}
 const photoWall=createPhotoWall({THREE:T,scene,renderer,pieces,selectables,markerPoints,obstacles});
 function sofa(x,z,rot,w=5.4){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);rounded(w,.35,1.65,fabric,0,.42,0,g);rounded(w,.9,.34,fabric,0,1.05,.65,g);for(const xx of [-w/2+.12,w/2-.12])rounded(.28,.65,1.65,fabric,xx,.77,0,g);for(let i=0;i<3;i++){rounded((w-.7)/3-.03,.24,1.2,fabric,(i-1)*(w-.7)/3,.73,-.1,g);const p=rounded(.68,.62,.2,pillow,(i-1)*(w-.7)/3,1.13,.4,g);p.rotation.z=(i-1)*.1;}for(const xx of [-w/2+.3,w/2-.3])for(const zz of [-.55,.55])cyl(.055,.055,.25,black,xx,.12,zz,g);}
 sofa(-4.25,7.5,0);sofa(-4.25,-1.3,Math.PI);sofa(.1,-10,0,5);
 obstacles.push([-7.1,-1.4,6.55,8.45],[-7.1,-1.4,-2.25,-.35],[-2.6,2.8,-10.95,-9.05]);
 function coffee(x,z,w,d,h){const s=new T.Shape();s.moveTo(-w/2,-d*.25);s.quadraticCurveTo(-w*.6,d*.4,0,d*.5);s.quadraticCurveTo(w*.65,d*.5,w*.5,-d*.25);s.quadraticCurveTo(w*.25,-d*.55,-w/2,-d*.25);const geo=new T.ExtrudeGeometry(s,{depth:.1,bevelEnabled:true,bevelSegments:2,bevelSize:.035,bevelThickness:.03,steps:1,curveSegments:16});const top=mesh(geo,white,x,h,z);top.rotation.x=-Math.PI/2;for(const dx of [-w*.3,w*.3])for(const dz of [-d*.2,d*.25])cyl(.035,.04,h,black,x+dx,h/2,z+dz);}
 coffee(-4.5,3.1,3.3,2.2,.8);coffee(-3.5,4.4,2.5,1.7,.66);obstacles.push([-6.4,-1.9,1.8,5.35]);
 cyl(.22,.32,.35,white,-4.5,1.05,3);for(let i=0;i<7;i++){const a=i*2.4;const stem=box(.018,.75,.018,green,-4.5+Math.cos(a)*.14,1.5,3+Math.sin(a)*.14);stem.rotation.z=Math.cos(a)*.25;const flower=mesh(new T.SphereGeometry(.13,10,8),white,-4.5+Math.cos(a)*.32,1.82+rand()*.2,3+Math.sin(a)*.32);flower.scale.set(1.3,.6,1);}
 box(.9,.09,.55,mat('#6f8f80'),-3.5,.94,3.1);box(.5,.07,.4,mat('#a56443'),-3.7,1.02,3.1);
 // Mesa rectangular, sillas oscuras y colgantes rectangulares (01:33–01:37).
 box(4.4,.16,6.8,wood,5.3,1.45,6.8);for(const x of [3.5,7.1])for(const z of [4,9.6])box(.18,1.38,.18,darkwood,x,.7,z);
 function chair(x,z,rot){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);rounded(.9,.14,.88,darkwood,0,.72,0,g);rounded(.8,.12,.75,pillow,0,.82,0,g);for(const xx of [-.35,.35])for(const zz of [-.33,.33])box(.06,.7,.06,darkwood,xx,.35,zz,g);for(const xx of [-.35,.35])box(.065,1.25,.065,darkwood,xx,1.23,.36,g);rounded(.8,.2,.12,darkwood,0,1.82,.36,g);for(const xx of [-.2,0,.2])box(.045,.8,.045,darkwood,xx,1.36,.36,g);}
 for(const z of [4.5,6.8,9.1]){chair(2.55,z,-Math.PI/2);chair(8.05,z,Math.PI/2);}chair(5.3,2.7,Math.PI);chair(5.3,10.9,0);obstacles.push([1.95,8.65,2.1,11.5]);
 for(const z of [5.9,6.8,7.7]){const bowl=mesh(new T.SphereGeometry(.36,18,10),mat('#9b9a8e',.6),5.3,1.7,z);bowl.scale.y=.55;}
 const shade=new T.MeshStandardMaterial({color:'#f0dfb6',emissive:'#ffe4ac',emissiveIntensity:.6,roughness:.8});
 for(const z of [4.7,8.7]){box(3.4,.9,1.65,shade,5.3,4.95,z);for(const x of [3.58,7.02])for(const zz of [z-.84,z+.84])box(.055,.95,.055,darkwood,x,4.95,zz);for(const y of [4.48,5.42]){box(3.5,.055,1.7,darkwood,5.3,y,z);}for(const x of [4.5,6.1])cyl(.015,.015,1.83,black,x,6.35,z);const l=new T.PointLight('#ffc982',49,12,2);l.position.set(5.3,4.3,z);scene.add(l);}
 // Barra de superficie clara y columna de piedra, visibles al principio y al final.
 box(9,1.5,1.9,plaster,-3.6,.75,15);box(9.2,.16,2.1,barMaterial,-3.6,1.57,15);obstacles.push([-8.3,1.1,13.8,16.2]);
 // Frente acanalado, latón y servicio frente a la pantalla (extremos opuestos de la casona).
 box(9,1.43,.14,darkwood,-3.6,.75,14.01);
 for(let i=0;i<45;i++)box(.09,1.3,.08,wood,-7.93+i*.196,.77,13.91,scene,false);
 const amber=new T.MeshBasicMaterial({color:'#ffc37a'});box(8.95,.035,.06,amber,-3.6,1.46,13.90,scene,false);
 box(8.65,.045,.07,copper,-3.6,.22,13.81);box(8.65,.055,.07,copper,-3.6,1.48,13.81);
 for(const x of [-5.7,-3.7,-1.7]){const l=new T.PointLight('#ffce95',18,7.7,2);l.position.set(x,3.25,14);scene.add(l);
 cyl(.016,.016,3.4,black,x,5.42,14.55);const hood=cyl(.16,.42,.4,copper,x,3.55,14.55);mesh(new T.CircleGeometry(.33,24),amber,x,3.33,14.55).rotation.x=-Math.PI/2;}
 for(const x of [-5.25,-4.93,-4.61]){cyl(.055,.07,.016,copper,x,1.67,14.5);cyl(.014,.014,.085,metal,x,1.71,14.5);cyl(.080,.036,.12,mat('#d7d2ad',.22,.37),x,1.80,14.5);}
 // Trasbarra interpretativa: paño de madera, sello verificado y franja de luz baja.
 const panel=new T.MeshStandardMaterial({map:woodTexture,color:'#39443c',roughness:.80});
 box(11.3,4.5,.16,panel,-3.35,3,17.75);box(11.35,.055,.17,copper,-3.35,5.25,17.64);
 box(11.35,.055,.17,copper,-3.35,.76,17.64);
 const crest=new T.TextureLoader().load('assets/retana-agave-claro.svg');crest.colorSpace=T.SRGBColorSpace;
 const sign=mesh(new T.PlaneGeometry(1.55,1.7),new T.MeshBasicMaterial({map:crest,transparent:true,toneMapped:false}),-3.4,3.65,17.62,scene,false);sign.rotation.y=Math.PI;
 const word=tex(768,128,(c,w,h)=>{c.fillStyle='#f3dfb0';c.font='52px Georgia';c.textAlign='center';c.fillText('M A D R E C I T A',w/2,74);});const signature=mesh(new T.PlaneGeometry(3.65,.6),new T.MeshBasicMaterial({map:word,transparent:true,toneMapped:false}),-3.4,2.40,17.61,scene,false);signature.rotation.y=Math.PI;
 const pillarTex=stoneTexture.clone();pillarTex.repeat.set(.7,1.6);const pillarStone=new T.MeshStandardMaterial({map:pillarTex,bumpMap:pillarTex,bumpScale:.1,roughness:.96});box(1.5,7.3,1.4,pillarStone,-7.6,3.65,14.9);
 const basin=box(1.2,.02,.8,metal,-2.2,1.65,15);const faucetPath=new T.CatmullRomCurve3([new T.Vector3(-2.5,1.65,15.3),new T.Vector3(-2.5,2.3,15.3),new T.Vector3(-2.1,2.4,15.3),new T.Vector3(-2.1,2.12,15.3)]);mesh(new T.TubeGeometry(faucetPath,20,.035,8,false),metal);
 for(const x of [-5.8,-3.7,-1.6]){chair(x,12.8,0);}
 for(const [x,y,z,r] of [[-7.1,4.6,13.6,.5],[-6.9,3.8,13.8,.35],[-7.5,4.1,13.4,.3]]){mesh(new T.SphereGeometry(r,28,20),copper,x,y,z);cyl(.015,.015,7.1-y,black,x,(7.1+y)/2,z);}
 // Arte: masas cromáticas orientativas, sin inventar atribuciones ni detalles del original.
 const art=tex(512,640,(c,w,h)=>{c.fillStyle='#756a4a';c.fillRect(0,0,w,h);for(let i=0;i<80;i++){c.fillStyle=['#a6864b','#526c64','#a35e40','#d5ba7a','#433c32'][i%5];c.globalAlpha=.4+rand()*.35;c.fillRect(rand()*w,rand()*h,30+rand()*180,30+rand()*200);}});
 box(.1,2.6,3.4,darkwood,10.7,3.2,7);const mural=mesh(new T.PlaneGeometry(3.2,2.4),new T.MeshStandardMaterial({map:art}),10.62,3.2,7);mural.rotation.y=-Math.PI/2;
 const easel=new T.Group();easel.position.set(-9.6,0,11.3);easel.rotation.y=.9;scene.add(easel);for(const x of [-.55,.55])box(.09,3,.1,darkwood,x,1.5,0,easel);box(1.7,2.1,.12,wood,0,2.1,0,easel);mesh(new T.PlaneGeometry(1.5,1.9),new T.MeshStandardMaterial({map:art}),0,2.1,.07,easel);obstacles.push([-10.4,-9,10.8,12]);
 for(const [x,z,r] of [[-9.2,9.4,.32],[-9.1,8.5,.48],[-9.3,7.6,.26]])mesh(new T.SphereGeometry(r,20,16),mat('#b09155',.8),x,r,z);
 // Puerta de fondo y pantalla, sin añadir ventanales ni arcos no documentados.
 box(2.1,3.5,.1,darkwood,6.3,1.75,-17.78);box(1.8,.65,.03,new T.MeshBasicMaterial({color:'#c1d9de'}),6.3,2.98,-17.7);
 box(6,.95,1.2,white,.1,.5,-15.7);box(4.4,2.5,.12,black,.1,2.3,-15.8);
 const poster=new T.TextureLoader().load('assets/portada-viva.png');poster.colorSpace=T.SRGBColorSpace;const screenMat=new T.MeshBasicMaterial({map:poster});const screen=mesh(new T.PlaneGeometry(4.15,2.3),screenMat,.1,2.3,-15.72,scene,false);screen.userData.action='screen';selectables.push(screen);obstacles.push([-3.1,3.3,-16.4,-14.9]);const videoTexture=new T.VideoTexture(video);videoTexture.colorSpace=T.SRGBColorSpace;
 scene.add(new T.HemisphereLight('#a9b6bc','#52473a',.49));
 const sun=new T.DirectionalLight('#ffdfb8',.48);sun.position.set(8,9,13);sun.target.position.set(-7,1,-4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:.1,far:65});sun.shadow.normalBias=.04;scene.add(sun,sun.target);
 for(const z of [-12,-3,7]){const l=new T.PointLight('#ffcc87',47,13,2);l.position.set(-8.8,4,z);scene.add(l);}
 return {selectables,obstacles,markerPoints,screen,stoneReady:Promise.all([floorMaterial.userData.ready,barMaterial.userData.ready,wallsReady]),photoWallReady:photoWall.ready,playScreen:()=>{screenMat.map=videoTexture;screenMat.needsUpdate=true;},bottleCount};
}
