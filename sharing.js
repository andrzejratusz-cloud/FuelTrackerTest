/* Optional Supabase REST adapter. No third-party SDK, no analytics of account data. */
(() => {
 'use strict';
 const cfg=window.FUEL_SHARING_CONFIG||{},api=window.FuelLocal;
 const sessionKey='fuel-sharing-session-v1',stateKey='fuel-sharing-state-v1';
 let session=null,state=null,busy=false,conflict=null,message='',email='',emailSent=false;
 let garageInfo=null,invites=[],timer=null;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const packed=data=>{const value=clone(data);delete value.active;return value;};
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const configured=(()=>{try{const u=new URL(cfg.url);return cfg.enabled===true&&u.protocol==='https:'&&/^[a-z0-9-]+\.supabase\.co$/.test(u.hostname)&&u.pathname==='/'&&typeof cfg.publicKey==='string'&&cfg.publicKey.length>20;}catch{return false;}})();
 function load(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
 function persistState(){localStorage.setItem(stateKey,JSON.stringify(state));}
 function formsOpen(){return !!document.querySelector('#entryDialog[open],#carDialog[open],#confirmDialog[open]');}
 function setMessage(value){message=value;paint();}
 async function request(path,body,token){
  if(navigator.onLine===false)throw Error('Brak połączenia. Zmiany pozostają na urządzeniu.');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(cfg.url.replace(/\/$/,'')+path,{method:'POST',headers:{apikey:cfg.publicKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:controller.signal});
   const result=await response.json().catch(()=>null);
   if(!response.ok)throw Error(response.status===401?'Sesja wygasła. Zaloguj się ponownie.':result?.msg||result?.message||result?.error_description||'Błąd połączenia z Supabase.');
   return result;
  }finally{clearTimeout(timeout);}
 }
 async function accessToken(){
  const refresh=async()=>{
   const saved=load(sessionKey);if(saved?.user?.id===session?.user?.id)session=saved;
   if(!session?.access_token)throw Error('Zaloguj się.');
   if(session.expires_at*1000<Date.now()+60000){
    const fresh=await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token});
    fresh.expires_at=Math.floor(Date.now()/1000)+fresh.expires_in;
    localStorage.setItem(sessionKey,JSON.stringify(fresh));session=fresh;
   }
   return session.access_token;
  };
  return navigator.locks? navigator.locks.request('fuel-sharing-token',refresh):refresh();
 }
 async function rpc(name,args={}){return request('/rest/v1/rpc/ft_'+name,args,await accessToken());}
 async function list(){const result=await rpc('list');garageInfo=result.garage;invites=result.invites||[];paint();}
 function compatible(data){return api.validate({...clone(data),active:data.cars?.[0]?.id||null});}
 function activate(gid,data){
  api.switchScope(session.user.id+':'+gid,compatible(data));
 }
 function current(){return packed(api.get());}
 function dirty(){return state&&api.scope()===session?.user?.id+':'+state.garage&&!equal(current(),state.base);}
 async function sync(){
  if(!configured||!session||!state||busy||conflict||formsOpen()||document.getElementById('sharingModule')?.contains?.(document.activeElement)||document.hidden||navigator.onLine===false)return;
  if(api.scope()!==session.user.id+':'+state.garage)return;
  busy=true;paint();
  try{
   // Web Locks also avoid competing sync operations between tabs of this browser.
   const task=async()=>{
    const latest=load(stateKey);if(latest?.user===session.user.id&&latest.garage===state.garage)state=latest;
    const local=current(),head=await rpc('head',{p_garage:state.garage});
    if(head===state.revision&&equal(local,state.base)){message='Zsynchronizowano';return;}
    const remote=await rpc('get',{p_garage:state.garage});
    compatible(remote.data);
    if(!equal(local,state.base)){
     if(remote.revision!==state.revision&&!equal(local,remote.data)){
      conflict=remote;setMessage('Konflikt: na innym urządzeniu zapisano zmiany. Wybierz wersję.');return;
     }
     if(!equal(local,remote.data)){
      const response=await rpc('put',{p_garage:state.garage,p_revision:remote.revision,p_data:local});
      if(response.conflict){setMessage('Dane zmieniły się podczas zapisu. Ponów synchronizację.');return;}
      state.revision=response.revision;state.base=local;
     }else{state.revision=remote.revision;state.base=remote.data;}
    }else{
     // Do not overwrite an edit made while the network request was running.
     if(!equal(current(),local)||formsOpen())return;
     if(!equal(local,remote.data))api.apply(compatible(remote.data));
     state.revision=remote.revision;state.base=remote.data;
    }
    state.syncedAt=new Date().toISOString();persistState();message=dirty()?'Oczekuje na synchronizację':'Zsynchronizowano';
   };
   if(navigator.locks)await navigator.locks.request('fuel-sharing-sync',task);else await task();
  }catch(error){message=error.message;}
  finally{busy=false;paint();}
 }
 async function action(work){if(busy)return;busy=true;paint();try{await work();}catch(error){message=error.message;}finally{busy=false;paint();}}
 function confirmAction(title,text,fn){window.confirm(title,text,()=>action(fn));}
 function download(data){
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='FuelTracker-przed-scaleniem-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 async function connectGarage(gid){
  const remote=await rpc('get',{p_garage:gid});compatible(remote.data);
  activate(gid,remote.data);
  const saved=load(stateKey);
  state=saved?.user===session.user.id&&saved.garage===gid?saved:{user:session.user.id,garage:gid,revision:equal(current(),remote.data)?remote.revision:-1,base:remote.data,syncedAt:null};
  state.enabled=true;persistState();conflict=null;message='Połączono wspólny garaż. Dane lokalne zachowano osobno.';
 }
 function stop(){clearInterval(timer);timer=null;}
 function start(){stop();timer=setInterval(sync,15000);sync();}
 function disconnect(){
  stop();api.switchScope(null);if(state){state.enabled=false;persistState();}state=null;conflict=null;message='Tryb lokalny. Dane wspólnego garażu pozostają w osobnym zapisie.';
 }
 function paint(){
  const root=document.getElementById('sharingModule');if(!root)return;root.replaceChildren();
  const add=(tag,text,cls)=>{const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;root.append(el);return el;};
  add('h3','Współdzielenie aplikacji · eksperymentalne');
  add('p','Opcjonalny wspólny garaż dla dwóch osób. Dane lokalne pozostają osobno. Logowanie nie przesyła danych do Google Analytics.','help');
  const status=add('p',message||(configured?'Tryb lokalny':'Moduł nie jest jeszcze podłączony. Wymaga projektu Supabase i konfiguracji administratora.'),'help');status.setAttribute('role','status');
  const input=(label,type='text')=>{const id='share-'+label.replace(/[^a-z]/gi,'');const l=add('label',label);l.htmlFor=id;const el=add('input','');el.id=id;el.type=type;return el;};
  const button=(text,fn,disabled=false)=>{const b=add('button',text,'secondary');b.type='button';b.disabled=busy||disabled;b.style.margin='10px 8px 0 0';b.onclick=fn;return b;};
  if(!configured){
   const mail=input('E-mail','email');mail.disabled=true;mail.placeholder='Twój adres e-mail';
   button('Wyślij kod',()=>{},true);button('Zaloguj się',()=>{},true);
   button('Zaproś osobę',()=>{},true);button('Synchronizuj teraz',()=>{},true);
   add('p','Przyciski zostaną włączone po podłączeniu Supabase. Wyłączenie modułu nie usuwa danych lokalnych.','help');return;
  }
  if(!session){
   const mail=input('E-mail','email');mail.autocomplete='email';mail.value=email;mail.oninput=()=>email=mail.value.trim();
   button('Wyślij kod',()=>action(async()=>{if(!mail.checkValidity()||!mail.value)throw Error('Podaj poprawny e-mail.');email=mail.value.trim();await request('/auth/v1/otp',{email,create_user:true});emailSent=true;message='Sprawdź pocztę i wpisz kod w tym oknie aplikacji.';}));
   if(emailSent){const code=input('Kod z wiadomości');code.inputMode='numeric';code.autocomplete='one-time-code';
    button('Zaloguj się',()=>action(async()=>{const result=await request('/auth/v1/verify',{email,token:code.value.trim(),type:'email'});if(!result.access_token||!result.user?.id)throw Error('Nieprawidłowa odpowiedź logowania.');result.expires_at=Math.floor(Date.now()/1000)+result.expires_in;localStorage.setItem(sessionKey,JSON.stringify(result));session=result;await list();message='Zalogowano. Wybierz lub utwórz garaż.';}));
   }return;
  }
  add('p','Zalogowano: '+session.user.email,'help');
  if(state){
   add('p','Wspólny garaż'+(garageInfo?.name?': '+garageInfo.name:'')+'. '+(dirty()?'Oczekuje na synchronizację.':'Brak niewysłanych zmian.')+(state.syncedAt?' Ostatnio: '+new Date(state.syncedAt).toLocaleString((window.i18n?.locale()||'pl-PL')):'') ,'help');
   button('Synchronizuj teraz',()=>sync());
   if(conflict){
    add('p','Oba urządzenia zmieniły dane. W tej wersji wybierasz cały zestaw danych, nie pojedyncze wpisy. Najpierw pobierz kopię i porównaj zawartość.','help');
    button('Pobierz mój zestaw',()=>download(api.get()));
    button('Przyjmij wersję wspólną',()=>confirmAction('Zastąpić lokalne zmiany?','Niewysłane zmiany z tego urządzenia zostaną zastąpione wersją serwera. Najpierw pobierz kopię.',async()=>{const fresh=await rpc('get',{p_garage:state.garage});api.apply(compatible(fresh.data));state.base=fresh.data;state.revision=fresh.revision;persistState();conflict=null;message='Przyjęto wersję wspólną.';}));
    button('Wyślij mój zestaw',()=>confirmAction('Zastąpić wspólne dane?','Cały zestaw na serwerze zostanie zastąpiony danymi tego urządzenia. Zmiany drugiej osoby mogą zostać usunięte.',async()=>{const fresh=await rpc('get',{p_garage:state.garage}),data=current();const response=await rpc('put',{p_garage:state.garage,p_revision:fresh.revision,p_data:data});if(response.conflict)throw Error('Kolejna zmiana na serwerze. Spróbuj ponownie.');state.base=data;state.revision=response.revision;persistState();conflict=null;message='Wysłano wybraną wersję.';}));
   }
   if(garageInfo?.owner){const invited=input('E-mail zapraszanej osoby','email');
    button('Zapisz zaproszenie',()=>confirmAction('Zaprosić drugą osobę?','Adres '+invited.value+' otrzyma możliwość dołączenia do wspólnego garażu i edycji jego danych.',async()=>{if(!invited.checkValidity()||!invited.value)throw Error('Podaj e-mail.');await rpc('invite',{p_garage:state.garage,p_email:invited.value});message='Zaproszenie ważne 7 dni. Przekaż osobie adres aplikacji; po zalogowaniu zobaczy zaproszenie. E-mail z zaproszeniem nie jest wysyłany automatycznie.';}));
   }
   button('Wróć do danych lokalnych',()=>confirmAction('Wyłączyć synchronizację na urządzeniu?','Wspólne dane i niewysłane zmiany pozostaną w osobnym lokalnym zapisie. Dane prywatne sprzed połączenia znów będą widoczne.',async()=>disconnect()));
  }else{
   if(garageInfo)button('Otwórz wspólny garaż',()=>confirmAction('Otworzyć wspólne dane?','Dane lokalne zostaną zachowane osobno. Nie scalamy ich automatycznie.',async()=>{await connectGarage(garageInfo.id);start();}));
   else{
    const name=input('Nazwa wspólnego garażu');name.maxLength=80;
    button('Utwórz garaż z moich danych',()=>confirmAction('Przesłać dane do Supabase?','Samochody, wydatki, limity i obraz karty zostaną zapisane w prywatnym garażu. Zaproszona osoba uzyska do nich dostęp.',async()=>{const data=current();const gid=await rpc('create',{p_name:name.value.trim(),p_data:data});await list();await connectGarage(gid);start();}));
    for(const invite of invites)button('Dołącz: '+invite.name,()=>confirmAction('Dołączyć do garażu?','Otworzysz wspólny zestaw. Dotychczasowe dane lokalne pozostają osobno; automatyczne scalanie nie jest wykonywane.',async()=>{await rpc('accept',{p_garage:invite.id});await list();await connectGarage(invite.id);start();}));
   }
  }
  button('Odśwież zaproszenia',()=>action(list));
  button('Wyloguj się',()=>confirmAction('Wylogować się?','Powrócisz do prywatnych danych lokalnych. Niewysłane wspólne zmiany pozostaną na tym urządzeniu do następnego połączenia z garażem.',async()=>{try{await request('/auth/v1/logout',{},await accessToken());}catch{}disconnect();localStorage.removeItem(sessionKey);session=null;garageInfo=null;invites=[];message='Wylogowano na tym urządzeniu.';}));
 }
 window.fuelSharing=Object.freeze({render:paint,changed(){if(state){message='Oczekuje na synchronizację';setTimeout(sync,500);}}});
 async function init(){
  if(!configured){api.switchScope(null);paint();return;}
  session=load(sessionKey);if(!session?.user?.id){session=null;paint();return;}
  const saved=load(stateKey);
  if(saved?.user===session.user.id&&saved.enabled!==false){state=saved;api.switchScope(session.user.id+':'+state.garage);}
  paint();try{await list();}catch(error){setMessage(error.message);}if(state)start();
 }
 window.addEventListener('online',sync);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
 // Session and data storage changes require a reload; do not apply them to an open form.
 window.addEventListener('storage',event=>{if(event.key===sessionKey||event.key===stateKey){stop();state=null;setMessage('Sesja lub stan synchronizacji zmieniły się w innym oknie. Odśwież aplikację.');}});
 init().catch(error=>setMessage(error.message));
})();
