'use strict';
(() => {
 let installPrompt = null, registration=null, checking=false, applying=false, reloadAvailable=false;
 let updateMessage='';
 function syncUpdateButton(){
  document.querySelectorAll('[data-check-update]').forEach(button=>{
   button.disabled=checking||applying;
   button.textContent=applying?'Aktualizowanie…':checking?'Sprawdzanie…':registration?.waiting||reloadAvailable?'↻ Zaktualizuj teraz':'↻ Sprawdź aktualizacje';
  });
  document.querySelectorAll('[data-update-status]').forEach(node=>{node.textContent=updateMessage;});
 }
 function note(message){updateMessage=message;syncUpdateButton();}
 function activateUpdate(){
  if(!registration?.waiting&&!reloadAvailable)return;
  const perform=()=>{
   if(!registration?.waiting&&!reloadAvailable)return;
   // Data backup is best effort. No storage is cleared during an update.
   try{window.FuelLocal?.backup();}catch{}
   applying=true;syncUpdateButton();
   if(reloadAvailable){location.reload();return;}
   registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
   setTimeout(()=>{if(applying){applying=false;note('Aktualizacja trwa dłużej. Spróbuj ponownie lub zamknij i otwórz aplikację.');}},15000);
  };
  if(document.querySelector('#entryDialog[open],#carDialog[open],#confirmDialog[open]')){
   window.confirm('Zaktualizować aplikację?', 'Otwarte okno może zawierać niezapisane zmiany. Aktualizacja je zamknie. Zapisane dane pozostaną na urządzeniu.',perform);
  }else perform();
 }
 async function checkUpdate(){
  if(registration?.waiting||reloadAvailable){activateUpdate();return;}
  if(!registration){note('Tryb aktualizacji nie jest jeszcze gotowy. '+status);return;}
  if(navigator.onLine===false){note('Połącz się z internetem, aby sprawdzić aktualizacje.');return;}
  checking=true;note('Sprawdzanie nowej wersji…');
  try{await registration.update();note(registration.waiting?'Nowa wersja jest gotowa.':registration.installing?'Pobieranie nowej wersji…':'Nie znaleziono nowej wersji.');}
  catch{note('Nie udało się sprawdzić aktualizacji. Sprawdź połączenie i spróbuj ponownie.');}
  finally{checking=false;syncUpdateButton();}
 };
 document.addEventListener('click',event=>{if(event.target.closest('[data-check-update]'))checkUpdate();});
 navigator.serviceWorker?.addEventListener('controllerchange',()=>{
  if(applying){location.reload();return;}
  reloadAvailable=true;note('Nowa wersja jest gotowa. Kliknij „Zaktualizuj teraz”.');
 });
 let status = 'Przygotowywanie trybu offline…';
 const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
 const section = document.createElement('div');
 section.className = 'panel';
 section.style.marginTop = '18px';
 section.innerHTML = '<h3>Aplikacja PWA</h3><p class="help" id="pwaStatus" role="status"></p><div class="actions"><button class="primary" id="pwaInstall" hidden>Zainstaluj aplikację</button></div><p class="help">iPhone: otwórz adres HTTPS w Safari → Udostępnij → Dodaj do ekranu początkowego. Jeśli pojawi się opcja „Otwórz jako aplikację”, pozostaw ją włączoną. Następnie uruchom ikonę z ekranu i poczekaj na komunikat gotowości offline.</p><p class="help">Przed przejściem z pliku HTML lub innego adresu wyeksportuj dane, a potem zaimportuj je w zainstalowanej aplikacji. Przeglądarka i aplikacja mogą korzystać z oddzielnych danych. Nie usuwaj danych przeglądarki bez kopii.</p>';
 function update() {
   if (!section.isConnected) document.getElementById('settings').append(section);
   section.querySelector('#pwaStatus').textContent = (standalone() ? 'Uruchomiono jako aplikację. ' : '') + status;
   section.querySelector('#pwaInstall').hidden = !installPrompt || standalone();
 }
 // Existing app renders settings after each data change. Reattach only when needed.
 const observer = new MutationObserver(() => { if (!section.isConnected) update();syncUpdateButton(); });
 observer.observe(document.getElementById('settings'), {childList:true});
 observer.observe(document.getElementById('about'), {childList:true});
 section.querySelector('#pwaInstall').onclick = async () => {
   if (!installPrompt) return;
   const prompt = installPrompt; installPrompt = null; update();
   try { await prompt.prompt(); await prompt.userChoice; } catch { /* Installation remains optional. */ }
 };
 window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; update(); });
 window.addEventListener('appinstalled', () => { installPrompt = null; update(); });
 async function init() {
   // Ask the browser to retain local data when supported. This is not a backup.
   try { if(navigator.storage?.persist) await navigator.storage.persist(); } catch {}

   if (location.protocol === 'file:') {
     status = 'Podgląd z pliku: instalacja i pamięć offline PWA wymagają HTTPS (lub localhost na komputerze). Dane i funkcje HTML nadal działają lokalnie.';
     update(); return;
   }
   if (!window.isSecureContext || !('serviceWorker' in navigator)) {
     status = 'Ta przeglądarka lub adres nie obsługuje trybu PWA. Otwórz aplikację przez HTTPS w aktualnym Safari, Chrome lub Edge.';
     update(); return;
   }
   try {
     registration = await navigator.serviceWorker.register('./sw.js', {scope:'./', updateViaCache:'none'});
     function watch(worker) {
       if (!worker) return;
       worker.addEventListener('statechange', () => {
         if (worker.state === 'redundant' && !registration.active) {status = 'Nie udało się przygotować plików offline. Sprawdź połączenie i otwórz aplikację ponownie.';update();}
         if (worker.state === 'installed' && registration.active) {status = 'Aktualizacja gotowa. Kliknij przycisk w Ustawieniach lub About. Dane pozostaną zapisane.';note('Nowa wersja jest gotowa do instalacji.');update();}
       });
     }
     watch(registration.installing);
     registration.addEventListener('updatefound', () => watch(registration.installing));
     await navigator.serviceWorker.ready;
     status = registration.waiting ? 'Aktualizacja gotowa. Kliknij „Zaktualizuj teraz” w Ustawieniach lub About.' : 'Gotowa do pracy offline. Tankowania, wydatki i karta działają bez internetu. Regularnie eksportuj kopię.';
     syncUpdateButton();
     if(registration.waiting)note('Nowa wersja jest gotowa do instalacji.');
     update();
   } catch (error) {
     status = 'Nie udało się włączyć trybu offline. Sprawdź HTTPS oraz dostępność plików aplikacji i odśwież stronę.';
     update();
   }
 }
 update(); init();
})();
