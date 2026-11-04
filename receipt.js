/* Receipt parsing is intentionally conservative. OCR runs locally in the browser. */
(() => {
 'use strict';
 const decimal=s=>Number(s.replace(/\s/g,'').replace(',','.'));
 function parseReceipt(text){
  const lines=String(text).replace(/\u00a0/g,' ').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const totals=[],fuelCosts=[],volumes=[];
  const numbers=s=>[...s.matchAll(/\b\d{1,6}(?:[ \t]\d{3})*[,.]\d{2}\b/g)].map(m=>decimal(m[0])).filter(n=>n>0&&n<1000000);
  for(let i=0;i<lines.length;i++){
   const line=lines[i].toUpperCase().replace(/[Ł]/g,'L'),prev=lines[i-1]?.toUpperCase()||'';
   if(/(?:SUMA\s*(?:PLN|ZL|SPRZEDA[ŻZ]Y|BRUTTO)|RAZEM\s*(?:PLN|ZL|DO\s*ZAPLATY)?|DO\s*ZAPLATY|TOTAL|KWOTA\s*DO)/.test(line)&&!/(?:PTU|PODATEK|VAT|RABAT)/.test(line)){
    const found=numbers(line);if(!found.length&&lines[i+1]&&!/(VAT|PTU|NIP)/i.test(lines[i+1]))found.push(...numbers(lines[i+1]));
    if(found.length)totals.push(found.at(-1));
   }
   // An explicit litre unit is mandatory: never mistake the unit price or VAT for volume.
   const units=[...line.matchAll(/\b(\d{1,4}(?:[,.]\d{1,3})?)\s*(?:L(?:ITR(?:Y|OW|ÓW)?)?|LTR)\b(?!\s*\/)/g)];
   for(const match of units){const n=decimal(match[1]);if(n>0&&n<=2000&&!/(CENA|PLN\s*\/|ZL\s*\/)/.test(line.slice(0,match.index)))volumes.push(n);}
   const isFuel=/(?:\bON\b|DIESEL|VERVA|EFECTA|BENZYNA|EUROSUPER|\bPB\s*9[58]\b|\bE\s*9[58]\b|\bLPG\b|PALIWO|FUEL)/.test(line+' '+prev);
   if(isFuel&&units.length){const amounts=[...line.matchAll(/\b\d{1,6}[,.]\d{2}(?=[A-Z]?(?:\s|$))/g)];const last=amounts.at(-1);const lastUnit=units.at(-1);if(last&&last.index>lastUnit.index+lastUnit[0].length&&/\s[X×*]\s*\d|\d\s*[X×*]\s*\d/.test(line)){const n=decimal(last[0]);if(n>0)fuelCosts.push(n);}}
  }
  const unique=a=>[...new Set(a.map(n=>Math.round(n*1000)/1000))];
  const liters=unique(volumes),costs=unique(totals.length?totals:fuelCosts);
  const warnings=[];if(costs.length>1)warnings.push('Odczytano kilka różnych kwot końcowych. Wpisz właściwy koszt ręcznie.');
  if(liters.length>1)warnings.push('Odczytano kilka ilości paliwa. Wpisz właściwą liczbę litrów ręcznie.');
  if(costs.length===1&&fuelCosts.length&&fuelCosts.some(n=>Math.abs(n-costs[0])>.02))warnings.push('Suma paragonu różni się od kwoty paliwa — sprawdź, czy obejmuje inne zakupy.');
  return {cost:costs.length===1?costs[0]:null,liters:liters.length===1?liters[0]:null,warnings};
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={parseReceipt};return;}
 let generation=0,worker=null,loading=null,scanBusy=false;
 const $=id=>document.getElementById(id);
 const message=text=>{$('receiptStatus').textContent=text;};
 function reset(){generation++;scanBusy=false;if(worker){worker.terminate().catch(()=>{});worker=null;}
  $('receiptImage').hidden=true;$('receiptImage').removeAttribute('src');$('receiptResult').hidden=true;$('receiptText').textContent='';
  $('receiptApply').hidden=true;$('receiptCamera').value='';$('receiptFile').value='';$('receiptCancel').hidden=true;message('');
 }
 function loadEngine(){
  if(window.Tesseract)return Promise.resolve(window.Tesseract);
  if(loading)return loading;
  loading=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';script.async=true;
   const timeout=setTimeout(()=>{script.remove();loading=null;reject(Error('Pobieranie OCR trwa zbyt długo. Sprawdź internet i spróbuj ponownie.'));},30000);
   script.onload=()=>{clearTimeout(timeout);if(window.Tesseract)resolve(window.Tesseract);else{loading=null;reject(Error('Nie udało się uruchomić OCR.'));}};
   script.onerror=()=>{clearTimeout(timeout);loading=null;script.remove();reject(Error('Nie można pobrać OCR. Do skanowania potrzebne jest połączenie z internetem.'));};document.head.append(script);
  });return loading;
 }
 async function prepare(file){
  if(file.size>25000000)throw Error('Wybierz zdjęcie mniejsze niż 25 MB.');
  if(!file.type.startsWith('image/'))throw Error('Wybierz zdjęcie paragonu.');
  const url=URL.createObjectURL(file);
  try{
   const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Nie można otworzyć zdjęcia. Spróbuj zrobić zdjęcie ponownie lub wybierz JPG/PNG.'));img.src=url;});
   const scale=Math.min(1,2200/Math.max(image.naturalWidth,image.naturalHeight));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);return canvas;
  }finally{URL.revokeObjectURL(url);}
 }
 async function scan(event){
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  reset();const token=generation;scanBusy=true;$('receiptCancel').hidden=false;
  const before={cost:$('cost').value,liters:$('liters').value,kind:$('kind').value};let activeWorker=null,timeout=null,abandoned=false;
  try{
   message('Przygotowywanie zdjęcia…');const canvas=await prepare(file);if(token!==generation)return;
   $('receiptImage').src=canvas.toDataURL('image/jpeg',.85);$('receiptImage').hidden=false;
   message('Pobieranie silnika OCR…');const engine=await loadEngine();if(token!==generation)return;
   const job=(async()=>{
    activeWorker=await engine.createWorker(['pol','eng'],1,{
     workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',
     corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',
     langPath:'https://tessdata.projectnaptha.com/4.0.0',
     logger:event=>{if(token===generation&&!abandoned)message(event.status==='recognizing text'?'Odczytywanie paragonu: '+Math.round(event.progress*100)+'%':'Przygotowywanie OCR…');}
    });
    if(token!==generation||abandoned){await activeWorker.terminate();return null;}
    worker=activeWorker;return activeWorker.recognize(canvas);
   })();
   const output=await Promise.race([job,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Odczyt trwa zbyt długo. Zrób wyraźniejsze zdjęcie i spróbuj ponownie.')),120000);})]);
   if(token!==generation||!output)return;
   const parsed=parseReceipt(output.data.text);$('receiptText').textContent=output.data.text;$('receiptResult').hidden=false;
   const fill=()=>{
    if(parsed.cost!==null)$('cost').value=parsed.cost.toFixed(2);
    if(parsed.liters!==null){$('kind').value='fuel';$('liters').value=String(parsed.liters);$('kind').dispatchEvent(new Event('change',{bubbles:true}));}
    $('cost').dispatchEvent(new Event('input',{bubbles:true}));$('liters').dispatchEvent(new Event('input',{bubbles:true}));$('receiptApply').hidden=true;
   };
   const found=parsed.cost!==null||parsed.liters!==null;
   if(found){
    if($('cost').value===before.cost&&$('liters').value===before.liters&&$('kind').value===before.kind)fill();
    else{$('receiptApply').hidden=false;$('receiptApply').onclick=fill;}
   }
   const summary=[parsed.cost!==null?'Koszt: '+parsed.cost.toFixed(2)+' zł':'Nie rozpoznano jednoznacznie kosztu',parsed.liters!==null?'Paliwo: '+parsed.liters+' l':'Nie rozpoznano jednoznacznie liczby litrów'];
   message(summary.join('. ')+'. '+parsed.warnings.join(' ')+' Sprawdź pola przed zapisaniem. Przebieg i tankowanie do pełna uzupełnij samodzielnie.');
  }catch(error){abandoned=true;if(token===generation)message(error.message||'Nie udało się odczytać paragonu. Uzupełnij dane ręcznie.');}
  finally{clearTimeout(timeout);if(activeWorker)await activeWorker.terminate().catch(()=>{});if(worker===activeWorker)worker=null;if(token===generation){scanBusy=false;$('receiptCancel').hidden=true;}}
 }
 window.receiptScanner=Object.freeze({reset,parseReceipt});
 $('receiptCamera').addEventListener('change',scan);$('receiptFile').addEventListener('change',scan);
 $('receiptCancel').onclick=reset;
 $('entryDialog').addEventListener('close',reset);
})();
