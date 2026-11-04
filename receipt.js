/* Receipt parsing is intentionally conservative. OCR runs locally in the browser. */
(() => {
 'use strict';
 const decimal=s=>Number(s.replace(/\s/g,'').replace(',','.'));
 function parseReceipt(text){
  const lines=String(text).replace(/\u00a0/g,' ').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const totals=[],fuelCosts=[],volumes=[],dates=[],odometers=[],tableRows=[],prices=[],derived=[];
  const normalized=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Ł/g,'L').toUpperCase();
  const dateValue=s=>{
   const m=s.match(/\b(\d{4})[-/.](\d{2})[-/.](\d{2})\b/),n=s.match(/\b(\d{2})[./-](\d{2})[./-](\d{4})\b/);
   const value=m?m[1]+'-'+m[2]+'-'+m[3]:n?n[3]+'-'+n[2]+'-'+n[1]:null;
   if(!value)return null;const d=new Date(value+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===value?value:null;
  };
  const numbers=s=>[...s.matchAll(/\b\d{1,6}(?:[ \t]\d{3})*[,.]\d{2}\b/g)].map(m=>decimal(m[0])).filter(n=>n>0&&n<1000000);
  for(let i=0;i<lines.length;i++){
   const line=lines[i].toUpperCase().replace(/[Ł]/g,'L'),prev=lines[i-1]?.toUpperCase()||'';
   if(/(?:\bSUMA\b|RAZEM\s*(?:PLN|ZL|DO\s*ZAPLATY)?|DO\s*ZAPLATY|TOTAL|\bKWOTA\b)/.test(line)&&!/(?:PTU|PODATEK|VAT|RABAT)/.test(line)){
    const found=numbers(line);if(!found.length&&lines[i+1]&&!/(VAT|PTU|NIP)/i.test(lines[i+1]))found.push(...numbers(lines[i+1]));
    if(found.length)totals.push(found.at(-1));
   }
   // An explicit litre unit is mandatory: never mistake the unit price or VAT for volume.
   const units=[...line.matchAll(/\b(\d{1,4}(?:[,.]\d{1,3})?)\s*(?:L(?:ITR(?:Y|OW|ÓW)?)?|LTR)\b(?!\s*\/)/g)];
   for(const match of units){if(lines.slice(Math.max(0,i-6),i).some(header=>/CENA.*JM.*ILOSC.*WARTOSC/.test(normalized(header))))continue;const n=decimal(match[1]);if(n>0&&n<=2000&&!/(CENA|PLN\s*\/|ZL\s*\/)/.test(line.slice(0,match.index)))volumes.push(n);}
   const isFuel=/(?:\bON\b|DIESEL|VERVA|EFECTA|BENZYNA|EUROSUPER|\bPB\s*9[58]\b|\bE\s*9[58]\b|\bLPG\b|PALIWO|FUEL)/.test(line+' '+prev);
   if(isFuel&&units.length){const amounts=[...line.matchAll(/\b\d{1,6}[,.]\d{2}(?=[A-Z]?(?:\s|$))/g)];const last=amounts.at(-1);const lastUnit=units.at(-1);if(last&&last.index>lastUnit.index+lastUnit[0].length&&/\s[X×*]\s*\d|\d\s*[X×*]\s*\d/.test(line)){const n=decimal(last[0]);if(n>0)fuelCosts.push(n);}}
   const clean=normalized(line);
   if(/^WARTOSC\s*[:=]?\s*$/.test(clean)){const found=numbers(lines[i+1]||'');if(found.length===1)fuelCosts.push(found[0]);}
   if(/CENA\s*(?:ZA\s*)?(?:LITR|1\s*L|\/\s*L)/.test(clean)){const found=numbers(line);if(found.length===1&&found[0]>=1&&found[0]<=30)prices.push(found[0]);}
   if(/\bDATA(?:\s*\/\s*CZAS)?\b/.test(clean)){
    const value=dateValue(line)||(/^DATA(?:\s*\/\s*CZAS)?\s*:?$/.test(clean)?dateValue(lines[i+1]||''):null);if(value)dates.push(value);
   }
   if(/\bPRZEBIEG\b/.test(clean)){
    const source=clean.slice(clean.indexOf('PRZEBIEG')+8).trim()||lines[i+1]||'';
    const match=source.match(/^\s*[:=]?\s*(\d{1,3}(?:[ .]\d{3})+|\d{1,8})(?:\s*KM)?(?:\s|$)/);
    if(match){const n=Number(match[1].replace(/[ .]/g,''));if(Number.isFinite(n)&&n>=0&&n<100000000)odometers.push(n);}
   }
   // Read price / quantity / value as separate columns, even when one is damaged.
   if(/ILOSC/.test(clean)&&/WARTOSC/.test(clean)&&clean.indexOf('ILOSC')<clean.indexOf('WARTOSC')){
    for(let j=i+1;j<Math.min(lines.length,i+7);j++){
     const row=normalized(lines[j]);if(/\b(SUMA|RAZEM|POMPA|POTWIERDZENIE|DATA)\b/.test(row))break;
     if(!/(95|98|\bON\b|DIESEL|LPG|BENZYNA|PALIWO)/.test(row))continue;
     const unit=row.match(/(?:^|\s)(?:T?L|LTR)["']?(?=\s|\d|$)/);
     const vals=part=>[...part.matchAll(/\b\d{1,6}[,.]\d{2,3}(?=[A-Z]?(?:\s|$))/g)].map(m=>({n:decimal(m[0]),i:m.index,end:m.index+m[0].length}));
     const left=unit?row.slice(0,unit.index):'',right=unit?row.slice(unit.index+unit[0].length):row;
     const price=vals(left).at(-1)?.n,values=vals(right);let qty=null,amount=null;
     if(values.length>=2){qty=values.at(-2).n;amount=values.at(-1).n;}
     else if(values.length===1){const v=values[0];if(/\?{2,}|NIECZYTEL|BRAK/.test(right.slice(0,v.i)))amount=v.n;else if(/\?{2,}|NIECZYTEL|BRAK/.test(right.slice(v.end)))qty=v.n;else if(totals.includes(v.n))amount=v.n;}
     if(qty>0&&qty<=2000)volumes.push(qty);
     if(amount>0)fuelCosts.push(amount);
     if(price>=1&&price<=30)prices.push(price);
     tableRows.push({price:price>=1&&price<=30?price:null,qty,amount});
    }
   }
   if(/^ILOSC\s*[:=]?\s*(?:\d|$)/.test(clean)&&!/(VAT|WARTOSC|CENA)/.test(clean)){
    const match=(clean.replace(/^ILOSC\s*[:=]?\s*/,'')||lines[i+1]||'').match(/^(\d{1,4}(?:[,.]\d{1,3})?)(?:\s*(?:L|LTR))?\s*$/);
    if(match){const n=decimal(match[1]);if(n>0&&n<=2000)volumes.push(n);}
   }
  }
  const unique=a=>[...new Set(a.map(n=>Math.round(n*1000)/1000))];
  // Use two independently read values to calculate only the missing one.
  const knownTotals=unique(totals),knownPrices=unique(prices);
  for(const row of tableRows){
   const amount=row.amount||(knownTotals.length===1&&tableRows.length===1?knownTotals[0]:null);
   const price=row.price||(knownPrices.length===1?knownPrices[0]:null);
   if(!row.qty&&amount&&price){const qty=Math.round(amount/price*1000)/1000;if(qty>0&&qty<=2000){volumes.push(qty);derived.push('Liczbę litrów obliczono jako wartość / cena za litr.');}}
   if(!amount&&row.qty&&price){fuelCosts.push(Math.round(row.qty*price*100)/100);derived.push('Koszt obliczono jako litry × cena za litr.');}
   if(amount&&row.qty&&price&&Math.abs(amount-row.qty*price)>.05)derived.push('Cena, ilość i wartość z tabeli nie są zgodne — sprawdź odczyt.');
  }
  if(!tableRows.length&&unique(volumes).length===0&&knownTotals.length===1&&knownPrices.length===1){const qty=Math.round(knownTotals[0]/knownPrices[0]*1000)/1000;if(qty>0&&qty<=2000){volumes.push(qty);derived.push('Liczbę litrów obliczono jako kwota / cena za litr.');}}
  const liters=unique(volumes),costs=unique(totals.length?totals:fuelCosts);
  const warnings=[...new Set(derived)];if(costs.length>1)warnings.push('Odczytano kilka różnych kwot końcowych. Wpisz właściwy koszt ręcznie.');
  if(liters.length>1)warnings.push('Odczytano kilka ilości paliwa. Wpisz właściwą liczbę litrów ręcznie.');
  if(costs.length===1&&fuelCosts.length&&fuelCosts.some(n=>Math.abs(n-costs[0])>.02))warnings.push('Suma paragonu różni się od kwoty paliwa — sprawdź, czy obejmuje inne zakupy.');
  const uniqueDates=[...new Set(dates)],uniqueOdometers=unique(odometers);
  if(uniqueDates.length>1)warnings.push('Odczytano różne daty. Wybierz właściwą datę ręcznie.');
  if(uniqueOdometers.length>1)warnings.push('Odczytano różne przebiegi. Wpisz właściwy przebieg ręcznie.');
  return {cost:costs.length===1?costs[0]:null,liters:liters.length===1?liters[0]:null,date:uniqueDates.length===1?uniqueDates[0]:null,km:uniqueOdometers.length===1?uniqueOdometers[0]:null,warnings};
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={parseReceipt};return;}
 let generation=0,worker=null,loading=null,heicLoading=null,scanBusy=false;
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
 function loadHEIC(){
  if(typeof window.HeicTo==='function')return Promise.resolve(window.HeicTo);
  if(heicLoading)return heicLoading;
  const sources=['https://cdn.jsdelivr.net/npm/heic-to@1.6.7/dist/iife/heic-to.js','https://unpkg.com/heic-to@1.6.7/dist/iife/heic-to.js'];
  heicLoading=(async()=>{for(const src of sources){try{return await new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src=src;script.async=true;
   const timeout=setTimeout(()=>{script.remove();reject(Error('Przekroczono czas pobierania konwertera.'));},30000);
   script.onload=()=>{clearTimeout(timeout);if(typeof window.HeicTo==='function')resolve(window.HeicTo);else{script.remove();reject(Error('Nie można uruchomić konwertera HEIC.'));}};
   script.onerror=()=>{clearTimeout(timeout);script.remove();reject(Error('Błąd pobierania konwertera.'));};document.head.append(script);
  });}catch{}}throw Error('Nie można pobrać konwertera HEIC. Sprawdź internet lub blokowanie pobierania plików.');})().catch(error=>{heicLoading=null;throw error;});
  return heicLoading;
 }
 async function decode(blob){
  const url=URL.createObjectURL(blob);
  try{return await new Promise((resolve,reject)=>{const img=new Image();const timeout=setTimeout(()=>{img.src='';reject(Error('Przeglądarka nie otworzyła zdjęcia w wymaganym czasie.'));},12000);img.onload=()=>{clearTimeout(timeout);resolve(img);};img.onerror=()=>{clearTimeout(timeout);reject(Error('Nie można otworzyć zdjęcia.'));};img.src=url;});}
  finally{URL.revokeObjectURL(url);}
 }
 async function prepare(file,token){
  if(file.size>25000000)throw Error('Wybierz zdjęcie mniejsze niż 25 MB.');
  const heic=/\.(heic|heif)$/i.test(file.name||'')||/image\/hei[cf]/i.test(file.type||'');
  if(!(file.type||'').startsWith('image/')&&!heic)throw Error('Wybierz zdjęcie paragonu.');
  let image;
  try{image=await decode(file);}catch(error){
   if(!heic)throw Error('Nie można otworzyć zdjęcia. Wybierz JPG, PNG lub HEIC.');
   if(token!==generation)return null;message('Konwertowanie HEIC na zdjęcie do OCR…');
   const convert=await loadHEIC();if(token!==generation)return null;
   let timeout;try{
    const converted=await Promise.race([convert({blob:file,type:'image/jpeg',quality:.95}),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Konwersja HEIC trwa zbyt długo. Wybierz zdjęcie JPG.')),90000);})]);
    if(token!==generation)return null;image=await decode(Array.isArray(converted)?converted[0]:converted);
   }catch(error){throw Error('Nie udało się odczytać HEIC. '+String(error?.message||error||'Nieobsługiwany wariant pliku.').slice(0,180)+' Możesz wybrać JPG.');}finally{clearTimeout(timeout);}
  }
   const scale=Math.min(1,2200/Math.max(image.naturalWidth,image.naturalHeight));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);return canvas;
 }
 async function scan(event){
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  reset();const token=generation;scanBusy=true;$('receiptCancel').hidden=false;
  const before=Object.fromEntries(['cost','liters','kind','date','km'].map(id=>[id,$(id).value]));let activeWorker=null,timeout=null,abandoned=false;
  try{
   message('Przygotowywanie zdjęcia…');const canvas=await prepare(file,token);if(token!==generation||!canvas)return;
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
    if(parsed.date!==null)$('date').value=parsed.date;
    if(parsed.km!==null)$('km').value=String(parsed.km);
    if(parsed.liters!==null){$('kind').value='fuel';$('liters').value=String(parsed.liters);$('kind').dispatchEvent(new Event('change',{bubbles:true}));}
    $('cost').dispatchEvent(new Event('input',{bubbles:true}));$('liters').dispatchEvent(new Event('input',{bubbles:true}));$('receiptApply').hidden=true;
   };
   const found=parsed.cost!==null||parsed.liters!==null||parsed.date!==null||parsed.km!==null;
   if(found){
    if(Object.keys(before).every(id=>$(id).value===before[id]))fill();
    else{$('receiptApply').hidden=false;$('receiptApply').onclick=fill;}
   }
   const summary=[parsed.cost!==null?'Koszt: '+parsed.cost.toFixed(2)+' zł':'Nie rozpoznano jednoznacznie kosztu',parsed.liters!==null?'Paliwo: '+parsed.liters+' l':'Nie rozpoznano jednoznacznie liczby litrów',parsed.date!==null?'Data: '+parsed.date:'Nie rozpoznano daty',parsed.km!==null?'Przebieg: '+parsed.km+' km':'Nie rozpoznano przebiegu'];
   message(summary.join('. ')+'. '+parsed.warnings.join(' ')+' Sprawdź pola przed zapisaniem. Tankowanie do pełna zaznacz samodzielnie.');
  }catch(error){abandoned=true;if(token===generation)message(error.message||'Nie udało się odczytać paragonu. Uzupełnij dane ręcznie.');}
  finally{clearTimeout(timeout);if(activeWorker)await activeWorker.terminate().catch(()=>{});if(worker===activeWorker)worker=null;if(token===generation){scanBusy=false;$('receiptCancel').hidden=true;}}
 }
 window.receiptScanner=Object.freeze({reset,parseReceipt});
 $('receiptCamera').addEventListener('change',scan);$('receiptFile').addEventListener('change',scan);
 $('receiptCancel').onclick=reset;
 $('entryDialog').addEventListener('close',reset);
})();
