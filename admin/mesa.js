export function tableJournal({api,records}) {
  const $=id=>document.getElementById(id);
  const form=$('visit-form');
  let draftId, generation=0, chosen=new Set();
  const text=(tag,value)=>Object.assign(document.createElement(tag),{textContent:value});
  const name=r=>[r.brand,r.model].filter((v,i,a)=>v && a.indexOf(v)===i).join(' · ') || r.id;
  function options() {
    const list=$('visit-bottles');
    list.replaceChildren(...records().map(r=>new Option(name(r),r.id+' · '+name(r))));
  }
  function selection() {
    const list=$('visit-selection');list.replaceChildren();
    for (const id of chosen) {
      const row=records().find(r=>r.id===id);
      const item=text('li',name(row)+' · '),remove=text('button','Quitar');
      remove.type='button';remove.className='inline-link';remove.onclick=()=>{chosen.delete(id);selection();};
      item.append(remove);list.append(item);
    }
  }
  function reset() {
    form.reset();form.elements.date.value=new Date().toLocaleDateString('sv-SE');
    draftId=crypto.randomUUID();chosen.clear();selection();
  }
  function clear() {
    generation++;reset();$('visit-bottles').replaceChildren();$('visit-history').replaceChildren();$('visit-status').textContent='';
  }
  function add() {
    const value=$('visit-bottle').value.trim();
    const row=records().find(r=>r.id===value.split(' · ')[0]);
    if (!row) {$('visit-status').textContent='Elige un folio de la lista.';return false;}
    chosen.add(row.id);selection();$('visit-bottle').value='';$('visit-status').textContent='';return true;
  }
  $('visit-add').onclick=add;
  async function load() {
    const token=++generation;
    if (!draftId) reset();
    try {
      const {memories}=await api('/api/admin/mesa');
      if (token!==generation) return;
      const history=$('visit-history');history.replaceChildren();
      for (const visit of memories) {
        const item=document.createElement('article');
        item.append(text('h3',visit.date+(visit.guests?' · '+visit.guests:'')));
        const labels=visit.bottles.map(id=>{const r=records().find(r=>r.id===id);return r?name(r)+' ('+id+')':id;});
        if (labels.length) item.append(text('p',labels.join(' · ')));
        if (visit.note) item.append(text('p',visit.note));
        history.append(item);
      }
      if (!memories.length) history.append(text('p','El cuaderno espera su primera visita.'));
      if (location.hash==='#memorias') $('memorias').scrollIntoView();
    } catch(e) {if(token===generation) $('visit-status').textContent=e.message;}
  }
  form.onsubmit=async event=>{
    event.preventDefault();
    if ($('visit-bottle').value.trim() && !add()) return;
    const generationAtSave=generation;
    form.inert=true;
    try {
      await api('/api/admin/mesa','POST',{id:draftId,date:form.elements.date.value,guests:form.elements.guests.value,note:form.elements.note.value,bottles:[...chosen]});
      if (generationAtSave!==generation) return;
      reset();$('visit-status').textContent='Visita guardada en el cuaderno privado.';await load();
    } catch(e) {if(generationAtSave===generation) $('visit-status').textContent=e.message;}
    finally {form.inert=false;}
  };
  return {options,load,clear};
}
