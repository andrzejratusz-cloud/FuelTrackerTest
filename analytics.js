(() => {
'use strict';
const config=window.FUEL_ANALYTICS_CONFIG||{},key='fuel-analytics-consent-v1';
let enabled=false,started=false,choice=null,site=null,panel=null;
const mode=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true?'installed':'browser';
function configured(){try{site=new URL(config.siteUrl);return /^G-[A-Z0-9]+$/.test(config.measurementId)&&site.protocol==='https:'&&location.protocol==='https:'&&site.origin===location.origin&&(location.pathname===site.pathname||location.pathname.startsWith(site.pathname.endsWith('/')?site.pathname:site.pathname+'/'));}catch{return false;}}
const valid=configured();
try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&['granted','denied'].includes(saved.value)&&saved.expires>Date.now())choice=saved.value;}catch{}
// gtag.js expects an Arguments command, not a plain Array.
function gtag(){window.dataLayer=window.dataLayer||[];window.dataLayer.push(arguments);}
function start(){if(!valid||choice!=='granted'||navigator.onLine===false||started)return;
 started=true;enabled=true;window['ga-disable-'+config.measurementId]=false;
 gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
 gtag('js',new Date());
 gtag('config',config.measurementId,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:site.origin+site.pathname,page_referrer:'',page_title:'Fuel Tracker'});
 const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+config.measurementId;document.head.append(script);
 gtag('event','page_view',{send_to:config.measurementId,page_location:site.origin+site.pathname,page_referrer:'',page_title:'Fuel Tracker',app_mode:mode()});
}
function clearCookies(){const names=document.cookie.split(';').map(c=>c.split('=')[0].trim()).filter(n=>n==='_ga'||n.startsWith('_ga_'));const parts=location.hostname.split('.');for(const name of names){document.cookie=name+'=;Max-Age=0;path=/';for(let i=0;i<parts.length-1;i++)document.cookie=name+'=;Max-Age=0;path=/;domain=.'+parts.slice(i).join('.');}}
function choose(value){choice=value;try{localStorage.setItem(key,JSON.stringify({value,expires:Date.now()+180*86400000}));}catch{}
 panel?.remove();panel=null;
 if(value==='granted'){start();return;}
 enabled=false;window['ga-disable-'+config.measurementId]=true;clearCookies();if(started)location.reload();
}
function preferences(){if(panel)return;panel=document.createElement('section');panel.className='panel analytics-consent';panel.setAttribute('role','region');panel.setAttribute('aria-label','Zgoda na statystyki');
 const title=document.createElement('h3');title.textContent='Statystyki korzystania';
 const text=document.createElement('p');text.className='help';text.textContent=valid?'Czy zgadzasz się na Google Analytics i analityczne pliki cookie? Mierzymy otwarcia i dodanie wydatku, bez kwot, nazw samochodów, notatek i zdjęć. Google otrzymuje dane techniczne połączenia. Odmowa nie ogranicza aplikacji. Wybór zmienisz w Ustawieniach.':'Statystyki Google Analytics nie są jeszcze skonfigurowane albo ten adres jest lokalnym podglądem. Żadne zdarzenia nie są wysyłane.';
 panel.append(title,text);const actions=document.createElement('div');actions.className='actions';for(const [label,value] of valid?[['Odrzuć','denied'],['Zgadzam się','granted']]:[['Zamknij','close']]){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=label;b.onclick=()=>value==='close'?(panel.remove(),panel=null):choose(value);actions.append(b);}const link=document.createElement('a');link.href='https://policies.google.com/privacy';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Prywatność Google';actions.append(link);panel.append(actions);document.body.append(panel);}
window.fuelAnalytics=Object.freeze({openPreferences:preferences,track(name){try{if(!enabled||choice!=='granted'||navigator.onLine===false||name!=='Expense Added')return;gtag('event','expense_added',{send_to:config.measurementId,app_mode:mode()});}catch{}}});
window.addEventListener('online',start);
window.addEventListener('storage',e=>{if(e.key===key)location.reload();});
if(valid){if(choice==='granted')start();else if(choice===null)preferences();}
})();
