// U²-Net compact, Xuebin Qin et al. Inference runs on the device.
let engine;
async function loadEngine() {
  const base=new URL('../vendor/estudio/',import.meta.url);
  const ort=await import(new URL('ort.wasm.min.mjs',base));
  ort.env.wasm.numThreads=1;
  ort.env.wasm.wasmPaths=base.href;
  const session=await ort.InferenceSession.create(new URL('u2netp.onnx',base).href,{executionProviders:['wasm']});
  return {ort,session};
}
function canvas(w,h) {
  const c=document.createElement('canvas');c.width=w;c.height=h;return c;
}
export async function studioPhoto(source) {
  engine ??=loadEngine().catch(e=>{engine=undefined;throw e;});
  const {ort,session}=await engine;
  const image=new Image();image.src=source;await image.decode();
  const size=320,n=size*size,small=canvas(size,size);
  const ctx=small.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,0,size,size);
  const rgba=ctx.getImageData(0,0,size,size);
  const input=new Float32Array(n*3);
  const mean=[.485,.456,.406],std=[.229,.224,.225];
  for (let i=0;i<n;i++) for (let c=0;c<3;c++) input[c*n+i]=(rgba.data[i*4+c]/255-mean[c])/std[c];
  const tensor=new ort.Tensor('float32',input,[1,3,size,size]);
  let output;
  try {
    output=await session.run({[session.inputNames[0]]:tensor},[session.outputNames[0]]);
    const mask=output[session.outputNames[0]].data;
    let min=Infinity,max=-Infinity;
    for (const a of mask) {min=Math.min(min,a);max=Math.max(max,a);}
    if (!(max-min>.05)) throw Error('Silueta indeterminada');
    let left=size,top=size,right=-1,bottom=-1;
    for (let i=0;i<n;i++) {
      const a=Math.round(255*(mask[i]-min)/(max-min));rgba.data[4*i+3]=a;
      if (a>36) {const x=i%size,y=Math.floor(i/size);left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
    }
    if (right-left<8 || bottom-top<8) throw Error('Silueta demasiado pequeña');
    ctx.putImageData(rgba,0,0);
    const cut=canvas(image.width,image.height),cc=cut.getContext('2d');
    cc.drawImage(image,0,0);cc.globalCompositeOperation='destination-in';cc.drawImage(small,0,0,cut.width,cut.height);
    const sx=Math.max(0,left-2)*cut.width/size,sy=Math.max(0,top-2)*cut.height/size;
    const w=Math.min(cut.width-sx,(right-left+5)*cut.width/size),h=Math.min(cut.height-sy,(bottom-top+5)*cut.height/size);
    const plate=canvas(720,900),scale=Math.min(630/w,810/h),pw=w*scale,ph=h*scale;
    plate.getContext('2d').drawImage(cut,sx,sy,w,h,(720-pw)/2,(900-ph)/2,pw,ph);
    for (const quality of [.88,.72,.55]) {
      const url=plate.toDataURL('image/webp',quality);
      if (url.startsWith('data:image/webp;') && url.length<650000) return url;
    }
    throw Error('Imagen demasiado grande');
  } finally {tensor.dispose();if(output) Object.values(output).forEach(t=>t.dispose());}
}
