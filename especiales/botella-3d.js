import * as T from '../vendor/three.module.js';
import {modelImage} from './catalogo-modelos.js';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const signedPower=(x,p)=>Math.sign(x)*Math.pow(Math.abs(x),p);
let reflections;

// Reflejos de dos ventanas de luz y un contraluz cálido sobre el envase.
function studioReflections() {
  if (reflections) return reflections;
  const w=256,h=128,pixels=new Float32Array(w*h*4);
  const sources=[[-1.05,.25,.12,.62,4.5,[1,.96,.86]],[1.2,.12,.10,.65,3,[.82,.92,1]],[2.65,.45,.32,.35,2.8,[1,.83,.62]],[.05,1.18,.85,.22,1.9,[1,1,.98]]];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    const angle=(x/w-.5)*2*Math.PI,latitude=(y/h-.5)*Math.PI;
    const base=latitude>-.15?.24:.085;
    const color=[base,base*.96,base*.90];
    for (const [a,l,aw,lh,power,tint] of sources) {
      const d=Math.atan2(Math.sin(angle-a),Math.cos(angle-a))/aw;
      const f=power*Math.exp(-Math.pow(d,4)-Math.pow((latitude-l)/lh,4));
      for(let c=0;c<3;c++)color[c]+=f*tint[c];
    }
    pixels.set([...color,1],(y*w+x)*4);
  }
  reflections=new T.DataTexture(pixels,w,h,T.RGBAFormat,T.FloatType);
  reflections.mapping=T.EquirectangularReflectionMapping;
  reflections.needsUpdate=true;
  return reflections;
}

async function readPhoto(path) {
  const image=new Image();image.src=modelImage(path);await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  return ctx.getImageData(0,0,canvas.width,canvas.height);
}

function bottleGeometry(profile,depth,shape) {
  const positions=[],uv=[],indices=[],steps=80;
  for(let i=0;i<profile.length;i++) {
    const [height,radius,offset=0]=profile[i];
    for(let j=0;j<=steps;j++) {
      const u=j/steps,angle=(u-.5)*Math.PI*2;
      positions.push(offset+radius*signedPower(Math.sin(angle),2/shape),height,
        radius*depth*signedPower(Math.cos(angle),2/shape));
      uv.push(u,height);
      if(i && j<steps) {
        const a=(i-1)*(steps+1)+j,b=a+steps+1;
        indices.push(a,a+1,b,b,a+1,b+1);
      }
    }
  }
  // Tapas horizontales con vértices propios para conservar el canto.
  for (const end of [0,profile.length-1]) {
    const [y,,offset=0]=profile[end],start=positions.length/3;
    positions.push(offset,y,0);uv.push(.5,y);
    for(let j=0;j<=steps;j++){
      const n=end*(steps+1)+j;positions.push(...positions.slice(n*3,n*3+3));uv.push(j/steps,y);
      if(j>0)indices.push(start,...(end?[start+j,start+j+1]:[start+j+1,start+j]));
    }
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  // Une las normales de la costura UV para evitar una línea bajo la luz lateral.
  const normal=g.attributes.normal;
  for(let i=0;i<profile.length;i++) {
    const a=i*(steps+1),b=a+steps,v=new T.Vector3().fromBufferAttribute(normal,a).add(new T.Vector3().fromBufferAttribute(normal,b)).normalize();
    normal.setXYZ(a,v.x,v.y,v.z);normal.setXYZ(b,v.x,v.y,v.z);
  }
  return g;
}

function photographicSkin(front,back,item) {
  const h=Math.min(1024,front.height),w=Math.min(2048,Math.max(768,front.width*3));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d'),bitmap=ctx.createImageData(w,h);
  const profile=item.profile;
  const left=Math.min(...profile.map(([y,r,c=0])=>c-r)),right=Math.max(...profile.map(([y,r,c=0])=>c+r));
  const columns=Array.from({length:w},(_,x)=>{
    const a=((x+.5)/w-.5)*Math.PI*2;
    return {s:signedPower(Math.sin(a),2/item.shape),front:Math.cos(a)>=0,cos:Math.abs(Math.cos(a))};
  });
  const bodyTint=[0,1,2].map(i=>parseInt((item.bodyColor||'#898075').slice(1+i*2,3+i*2),16));
  // En la mitad indocumentada, conserva un pigmento por zona. Prolongar el
  // color de cada renglón llevaría letras, dibujos y brillos alrededor del envase.
  function zoneColor(low,high) {
    const channels=[[],[],[]];
    for(let row=Math.floor(front.height*(1-high));row<front.height*(1-low);row+=2) {
      const start=row*front.width*4;
      for(let x=1;x<front.width-1;x+=3) {
        const pixel=start+x*4;
        if(front.data[pixel+3]<200)continue;
        for(let k=0;k<3;k++)channels[k].push(front.data[pixel+k]);
      }
    }
    return channels.map((values,k)=>values.length?values.sort((a,b)=>a-b)[Math.floor(values.length/2)]:bodyTint[k]);
  }
  const widest=Math.max(...profile.map(p=>p[1]));
  const shoulder=profile.find(([y,r])=>y>.48 && r<.62*widest)?.[0]??.76;
  const neck=zoneColor(Math.min(shoulder+.04,.86),.90),cap=zoneColor(.94,.99);
  const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t);};
  let ring=0;
  for(let row=h-1;row>=0;row--) {
    const y=1-(row+.5)/h;
    while(ring+2<profile.length && profile[ring+1][0]<y)ring++;
    const a=profile[ring],b=profile[ring+1],f=clamp((y-a[0])/(b[0]-a[0]||1),0,1);
    const r=a[1]+f*(b[1]-a[1]),c=(a[2]||0)+f*((b[2]||0)-(a[2]||0));
    // Muestrea hacia adentro del contorno para evitar el halo de la máscara.
    function sample(photo,s) {
      let px=clamp(Math.round(((c+r*s*.985-left)/(right-left))*(photo.width-1)),0,photo.width-1);
      const py=clamp(Math.round((1-y)*(photo.height-1)),0,photo.height-1);
      const center=clamp(Math.round((c-left)/(right-left)*(photo.width-1)),0,photo.width-1);
      let idx=(py*photo.width+px)*4;
      while(photo.data[idx+3]<150 && px!==center){px+=Math.sign(center-px);idx=(py*photo.width+px)*4;}
      return idx;
    }
    const li=sample(front,-.84),ri=sample(front,.84);
    const toNeck=smooth((y-shoulder+.045)/.09),toCap=smooth((y-.90)/.04);
    const inferred=bodyTint.map((v,k)=>(v*(1-toNeck)+neck[k]*toNeck)*(1-toCap)+cap[k]*toCap);
    for(let j=0;j<w;j++){
      const col=columns[j],photo=(!col.front && back)?back:front;
      const documented=col.front||Boolean(back);
      const k=documented?sample(photo,col.front?col.s:-col.s):0,out=(row*w+j)*4;
      for(let ch=0;ch<3;ch++) {
        const edgeMix=(col.s+1)/2,edge=front.data[li+ch]*(1-edgeMix)+front.data[ri+ch]*edgeMix;
        const mix=smooth(col.cos/.45);
        const side=back ? edge : inferred[ch];
        const color=documented?side*(1-mix)+photo.data[k+ch]*mix:side;
        bitmap.data[out+ch]=color;
      }
      bitmap.data[out+3]=255;
    }
  }
  ctx.putImageData(bitmap,0,0);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=T.RepeatWrapping;texture.anisotropy=4;
  return texture;
}

// El vidrio transmite luz en los flancos y el cuerpo posterior. La fotografía
// frontal, la etiqueta y el cierre conservan su opacidad de archivo.
function glassTransmission() {
  const w=96,h=64,pixels=new Uint8Array(w*h*4);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const facing=Math.cos(2*Math.PI*((i+.5)/w-.5)),y=(j+.5)/h;
    const factor=clamp((.28-facing)*2,0,1)*clamp((.89-y)/.10,0,1)*clamp(y/.06,0,1);
    const value=Math.round(255*factor);
    pixels.set([value,value,value,255],(j*w+i)*4);
  }
  const map=new T.DataTexture(pixels,w,h);
  map.magFilter=map.minFilter=T.LinearFilter;map.wrapS=T.RepeatWrapping;map.needsUpdate=true;
  return map;
}
export async function makeBottle(item,{studio=false}={}) {
  const [front,back]=await Promise.all([readPhoto(item.src),item.backSrc?readPhoto(item.backSrc):null]);
  const geometry=bottleGeometry(item.profile,item.depth||.8,item.shape||2);
  const texture=photographicSkin(front,back,{...item,shape:item.shape||2});
  const isMetal=item.material==='metal',isGlass=item.material==='glass';
  const transmission=studio && isGlass && !back ? glassTransmission() : null;
  const mat=new T.MeshPhysicalMaterial({map:texture,roughness:isMetal?.31:isGlass?.26:.35,
    metalness:isMetal?.66:.025,clearcoat:isGlass?.55:.32,clearcoatRoughness:.16,
    transmission:transmission ? .40 : 0,transmissionMap:transmission,
    envMap:studioReflections(),envMapIntensity:isMetal?.98:.55,ior:isGlass?1.51:1.46});
  const mesh=new T.Mesh(geometry,mat);mesh.castShadow=true;mesh.name='Botella · '+(item.name||'Colección Retana');
  return {mesh,dispose(){mesh.removeFromParent();geometry.dispose();texture.dispose();transmission?.dispose();mat.dispose();}};
}
