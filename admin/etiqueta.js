const assets=new URL('../vendor/etiqueta/',import.meta.url);
const results=new WeakMap();
async function recognize(source) {
  await import(new URL('tesseract.min.js',assets).href);
  let worker,expired=false,timer;
  const task=async()=>{
    worker=await globalThis.Tesseract.createWorker('eng',1,{
      workerPath:new URL('worker.min.js',assets).href,
      corePath:new URL('tesseract-core-lstm.wasm.js',assets).href,
      langPath:assets.href,workerBlobURL:false,errorHandler:()=>{}
    });
    if (expired) {await worker.terminate();return '';}
    await worker.setParameters({tessedit_pageseg_mode:'11'});
    const {data}=await worker.recognize(source);
    const codes=new Set(Array.from(data.text.matchAll(/\bN[. ]*O[. ]*M[\s.:#-]*(\d{4})\b/gi),match=>match[1]));
    return codes.size===1?[...codes][0]:'';
  };
  try {
    return await Promise.race([task(),new Promise(resolve=>{timer=setTimeout(()=>{expired=true;resolve('');},20000);})]);
  } finally {clearTimeout(timer);if(worker) await worker.terminate();}
}
export function readLabel(file,source) {
  if(!results.has(file))results.set(file,recognize(source).catch(()=>''));
  return results.get(file);
}
