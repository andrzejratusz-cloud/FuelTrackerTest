# Fuel Tracker — PWA

## Instalacja na iPhonie

1. Rozpakuj paczkę. Umieść CAŁĄ zawartość katalogu FuelTrackerHTML na statycznym hostingu HTTPS. Nie są potrzebne baza danych, API ani proces budowania. Zachowaj jeden stały adres.
2. Otwórz adres index.html w Safari na iPhonie, mając połączenie z internetem.
3. W ustawieniach Fuel Tracker sprawdź status „Gotowa do pracy offline”.
4. W Safari wybierz Udostępnij → Dodaj do ekranu początkowego. Jeżeli widoczna jest opcja „Otwórz jako aplikację”, pozostaw ją włączoną.
5. Uruchom nową ikonę, jeszcze z internetem, i poczekaj na status gotowości offline w ustawieniach. Następnie sprawdź ponowne otwarcie i dodanie wpisu w trybie samolotowym.

Nie opublikowano aplikacji. Lokalny adres file:// jest podglądem HTML i nie obsługuje service workera ani instalacji PWA. Na komputerze można testować przez http://localhost. Zwykły adres HTTP komputera w sieci Wi-Fi nie zastępuje HTTPS na iPhonie.

Źródła: https://support.apple.com/en-gb/guide/iphone/iphea86e5236/27/ios/27 oraz https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers

## Przeniesienie dotychczasowych danych

Przed zmianą adresu lub instalacją wykonaj eksport danych w starej wersji. W aplikacji otwartej z ekranu początkowego wybierz import. Import wymaga potwierdzenia i zastępuje wszystkie dane. Nie zakładaj, że Safari i zainstalowana aplikacja współdzielą zapisy. Format kopii HTML i PWA jest taki sam; wcześniejsza aplikacja Swift ma inny format.

## Offline i prywatność

Service worker zapisuje wyłącznie kod, manifest i ikony w Cache Storage. Tankowania, samochody, limit i obraz karty pozostają w localStorage na urządzeniu. Nie są wysyłane na hosting. Pierwsze wczytanie i sprawdzanie aktualizacji pobierają pliki aplikacji z hostingu. Wybrany hosting może zapisywać standardowe logi dostępu, np. adres IP. Aplikacja nie ma kont, analityki ani synchronizacji.

Regularnie eksportuj kopię. localStorage i Cache Storage mogą zostać usunięte przez użytkownika lub system; PWA nie daje gwarancji trwałości danych jak osobny plik kopii. Kopia CSV nie jest szyfrowana. Czyszczenie danych strony lub zmiana domeny może usunąć dostęp do zapisów. Systemowa aplikacja Pliki może korzystać z chmury, jeśli wybierzesz ją jako miejsce eksportu.

## Aktualizacje i hosting

Publikuj razem index.html, pwa.js, sw.js, manifest.webmanifest oraz icons/. Przy każdej zmianie plików zwiększ VERSION w sw.js (np. v1 na v2). Nowa wersja przygotowuje oddzielną pamięć podręczną, czeka na zamknięcie wszystkich okien starej aplikacji i dopiero wtedy się aktywuje. Nie wymusza odświeżenia otwartego formularza i nie usuwa localStorage.

Dla sw.js zalecany nagłówek Cache-Control: no-cache oraz Content-Type: application/javascript. Dla manifestu application/manifest+json. Nie przekierowuj nieistniejących plików do HTML. Hosting wymagający logowania może ograniczać instalację i odświeżanie PWA; do tej aplikacji wystarczy zwykły hosting statycznych plików HTTPS. Nie umieszczaj kopii JSON ani danych użytkownika w publikowanym katalogu.

## Funkcje

Wspólny miesięczny limit wszystkich aut, tankowania i inne wydatki, edycja/usuwanie, zmiana aktywnego samochodu, karta lojalnościowa, historia i statystyki, eksport/import. Limit można zmieniać od bieżącego lub przyszłego miesiąca; wcześniejsze miesiące zachowują poprzednią wartość. Statystyki dotyczą całej historii aktywnego auta. Spalanie to suma litrów pomiędzy pełnymi tankowaniami podzielona przez dystans razy 100, z uwzględnieniem częściowych tankowań; średnia jest ważona dystansem. Inne wydatki nie wpływają na spalanie i dystans.

## Weryfikacja

Sprawdzono składnię skryptów, manifest, rozmiary ikon PNG, obecność 7 plików buforowanych, instalację i aktywację service workera w modelu testowym, nawigację i odczyt zasobów bez sieci oraz izolację pamięci podręcznej między ścieżkami. Poprzednio sprawdzono logikę aplikacji i lokalny zapis. Nie wykonano testu w rzeczywistym Safari ani instalacji na urządzeniu. Testy service workera były symulacją API w Node, nie testem przeglądarkowym.

## Aktualizacja v2

Historia aktywnego samochodu znajduje się na dole Podsumowania (cała historia, od najnowszych wpisów); osobna zakładka Historia została usunięta. Formularz tankowania pokazuje cenę za litr obliczaną na żywo jako koszt / litry, także przy edycji. Puste lub zerowe litry nie generują wyniku. Kolor paska zmienia się płynnie: zielony przy początku, pomarańczowy przy 50%, czerwony przy 100% i przekroczeniu limitu. Wersja pamięci PWA: v2. Format danych bez zmian. Sprawdzono składnię i 12 kontroli renderowania/logiki w modelu DOM; nie wykonano testu na iPhonie.

## Aktualizacja v5 — kolory, limity i CSV

W ustawieniach wybierz domyślną wersję kolorystyczną. Przy dodawaniu lub edycji samochodu przypisz mu własny kolor albo wybierz kolor domyślny. Kolory interfejsu odpowiadają aktywnemu samochodowi.

Limit wspólny dla aut zmienia się od wybranego miesiąca do kolejnej zaplanowanej zmiany. Nie można ustawiać zmian od minionego miesiąca. Dotychczasowy limit stanowi podstawę dla historii; aplikacja nie może odtworzyć starszych limitów, których poprzednia wersja nie zapisywała.

Eksport to CSV UTF-8 z BOM i separatorem średnikowym. Plik nie zawiera ID. Wiersze typu wpis można edytować, usuwać i dopisywać; samochód jest rozpoznawany po unikalnej nazwie. Nowa nazwa we wpisie tworzy samochód. Daty: RRRR-MM-DD, rodzaj: tankowanie lub wydatek, do_pelna: tak lub nie. Kwoty i litry mogą zawierać kropkę lub przecinek dziesiętny. Zachowaj wszystkie kolumny oraz wiersze ustawienia, samochod, limit i karta, aby zachować pełną kopię. Wiersz ustawienia zawiera domyślny kolor, bazowy limit i nazwę aktywnego auta w kolumnie wartosc. Wiersz karta zawiera obraz karty, którego nie trzeba edytować.

Import zastępuje cały zbiór danych po potwierdzeniu; ponowny import nie dopisuje duplikatów. ID są generowane automatycznie. Stare kopie JSON nadal można importować. Importowana pełna kopia przywraca także zapisaną w niej historię limitów.

Walidacja v5: 25 kontroli logiki i obsługi formularzy w modelu DOM (Node), w tym historia limitów, migracja starej kopii, kolory samochodów i CSV z wieloma liniami, polskimi znakami oraz nowymi wpisami bez ID. Brak testu w rzeczywistym Safari/iPhonie.

## Aktualizacja v19 — zachowanie danych

Klucz danych fuel-tracker-v1 i format version:1 pozostają stałe niezależnie od numeru wydania aplikacji. Aktualizacja service workera usuwa wyłącznie stare pliki aplikacji z Cache Storage. Nie czyści localStorage. Przy uruchomieniu i przed zapisem aplikacja próbuje zachować lokalną kopię poprawnych danych. W ustawieniach można przywrócić ją po potwierdzeniu. Jest to kopia na tym samym urządzeniu i tej samej witrynie; usunięcie danych witryny może usunąć również kopię. Brak miejsca może uniemożliwić jej zapis, co aplikacja sygnalizuje. Przed zapisem sprawdzamy, czy inne okno nie zmieniło danych. Nieaktualny formularz wymaga odświeżenia. Aplikacja prosi o trwałą pamięć przez Storage API tam, gdzie przeglądarka ją udostępnia; przeglądarka może odmówić.

Aktualizuj istniejącą instalację pod niezmiennym adresem HTTPS, bez usuwania aplikacji, czyszczenia danych strony ani reinstalacji. Zamknij okna i otwórz ponownie po publikacji. Wgraj index.html, sw.js i pwa.js. Na pierwszym przejściu ze starszej wersji warto wcześniej wyeksportować CSV. Mechanizm nie odzyska danych już skasowanych przez system lub użytkownika i nie synchronizuje ich pomiędzy urządzeniami.

Sprawdzono 17 przypadków zachowania danych i aktualizacji w modelu JS: stary format, restart, kopia, uszkodzony zapis, konflikt okien, brak danych i brak miejsca. Nie odtworzono problemu na fizycznym telefonie; przyczyna zgłoszenia wymaga ustalenia sposobu aktualizacji.

## Aktualizacja v20 — przycisk aktualizacji

Na samej górze strony jest przycisk Sprawdź aktualizacje. Pobiera nową wersję przez service worker i pokazuje Zaktualizuj teraz, gdy jest gotowa. Kliknięcie pozwala aktywować przygotowane pliki bez czyszczenia danych. Przy otwartym formularzu pojawia się ostrzeżenie przed utratą niezapisanych zmian. Pozostałe okna z otwartymi formularzami nie są automatycznie przeładowywane. Aktualizacja nie usuwa localStorage, danych aut ani wpisów. Przed aktywacją próbuje zapisać lokalną kopię bezpieczeństwa. Gdy internet nie działa albo sprawdzenie się nie powiedzie, można ponowić próbę. Przycisk wymaga HTTPS lub localhost oraz obsługi service worker. Nie daje gwarancji zachowania danych po wyczyszczeniu pamięci witryny.

Pierwsze wdrożenie przycisku wymaga publikacji index.html, pwa.js i sw.js oraz otwarcia nowej wersji aplikacji. Następne aktualizacje można uruchamiać przyciskiem. Nigdy nie usuwaj danych witryny w celu pobrania aktualizacji. Testy v20: 14 kontroli przycisku w modelu PWA, 17 trwałości danych, 46 aplikacji i 16 analityki. Brak fizycznego testu na Androidzie/iPhonie.

## v25 — opcjonalne współdzielenie

Moduł Supabase jest domyślnie wyłączony. Instrukcja i SQL: supabase/SETUP.md oraz supabase/schema.sql w paczce wydania. Wymaga projektu Supabase, konfiguracji Auth/SMTP i publicznego klucza. Nie uruchomiono jeszcze prawdziwego połączenia. Po połączeniu dane wspólne są oddzielone od lokalnych; synchronizacja używa rewizji i przy konflikcie wymaga wyboru całego zestawu. Nie wykonuje automatycznego scalania wpisów z różnych telefonów. Można wrócić do danych lokalnych lub wyłączyć moduł w konfiguracji.

## v27 — skanowanie paragonu

W formularzu wydatku: Zeskanuj paragon otwiera aparat na obsługiwanych telefonach; Wybierz zdjęcie otwiera wybór pliku. HTML capture=environment jest wskazówką dla przeglądarki, więc nie każda otworzy bezpośrednio aparat. Zdjęcie jest zmniejszane i przetwarzane lokalnie przez Tesseract.js 6.0.1 (polski/angielski). Silnik, Web Worker, WASM i modele pobierane są z CDN przy skanowaniu. Dostawcy CDN otrzymują zwykłe żądania pobrania plików, bez zdjęcia paragonu. Nie gwarantujemy działania OCR offline. Dane zdjęcia i odczytany tekst nie są przechowywane w wydatku ani przesyłane do Supabase/Google Analytics.

Koszt końcowy paragonu i litry są wpisywane w formularz, bez automatycznego zapisania wydatku. Gdy użytkownik zmieni pola podczas OCR, musi nacisnąć Uzupełnij pola wynikiem OCR. Kilka różnych kwot lub litrów nie jest automatycznie wybierane. Suma paragonu może obejmować zakupy dodatkowe — sprawdź ją przed zapisem. OCR nie ustala przebiegu, samochodu ani pełnego baku. Dostępny podgląd zdjęcia i odczytanego tekstu oraz anulowanie. Zamknięcie formularza usuwa podgląd i zatrzymuje odczyt. Zdjęcia do 25 MB, obsługa formatu zależy od przeglądarki; przy problemach wybierz JPG/PNG.

Do publikacji v27 ze starszej wersji: index.html, sw.js i nowy receipt.js. Pozostaw pozostałe pliki aplikacji. Sprawdzono 23 przypadki parsera i 13 przypadków formularza z modelem OCR. Pliki silnika/modeli odpowiadają HTTP 200. Nie przeprowadzono testu rzeczywistej kamery ani skuteczności OCR na fizycznym telefonie.

## v28 — OCR pól SUMA / Ilość / Data / Przebieg, HEIC

Parser obsługuje SUMA bez dopisku PLN, wiersze pod nagłówkiem Cena jm Ilość VAT Wartość dla paliwa, daty ISO i DD.MM.RRRR oraz licznik oznaczony Przebieg. Dla przykładu klienta: 128,05 zł; 20,67 l; 2026-04-01; 45000 km. Rozbieżne wartości nie są automatycznie wybierane. Wszystkie cztery pola są uzupełniane w formularzu; zmiana ręczna w czasie OCR wymaga potwierdzenia Uzupełnij pola wynikiem OCR.

HEIC/HEIF jest najpierw otwierany natywnie; w razie błędu pobieramy heic2any 0.0.4 z CDN i konwertujemy lokalnie na JPG, bez wysyłania pliku. Rozszerzenie .HEIC działa także bez MIME. Konwerter nie obsługuje każdego wariantu HEIC; w razie niepowodzenia pojawia się prośba o JPG. Pierwsza konwersja wymaga internetu. Dodano ikonę przy Wybierz zdjęcie.

Sprawdzono parser na tekście klienta i model formularza/konwersji HEIC. Nie otrzymano rzeczywistego pliku HEIC; rzeczywistego dekodowania i obrazu z telefonu nie zweryfikowano. Publikacja: index.html, receipt.js i sw.js.

## v29 — poprawka HEIC

Konwerter heic2any został zastąpiony heic-to 1.6.7 z nowszym libheif. Próba natywnego otwarcia ma limit czasu. Biblioteka pobierana na żądanie z jsDelivr, z zapasowym unpkg. Parametry nowej biblioteki: blob, type:image/jpeg, quality. Zdjęcie nadal jest dekodowane lokalnie. Błędy konwersji zawierają opis zamiast ogólnego komunikatu.

Zweryfikowano rzeczywiste dekodowanie publicznego examples/example.heic z repozytorium strukturag/libheif nowym dekoderem: 1280x854 piksele, test w Node z adapterem Web Worker. Sprawdzono też model formularza i parser. Nie sprawdzono konkretnego pliku użytkownika ani wydajności na jego iPhonie.

Publikacja: index.html, receipt.js, sw.js.

## v30 — reguły tabeli paliwa

Koszt: SUMA/Kwota, potem Wartość pozycji. Tabela Cena jm Ilość VAT Wartość rozdziela cenę za litr przed jm L oraz ilość i kwotę za jednostką. Nie naprawiamy automatycznie B21 na 6,21 bez innych dowodów. Data i Data/czas mogą mieć wartość w kolejnym wierszu. Licznik pochodzi wyłącznie z pola Przebieg. Brakującą liczbę litrów obliczamy jako kwota/cena za litr; brakującą kwotę jako litry*cena. Obliczenia są oznaczane w komunikacie OCR, nie zastępują rozpoznanych wartości i wymagają sprawdzenia. Niezgodność wszystkich trzech wartości daje ostrzeżenie. Testy obejmują tekst klienta, koszt z Kwota/Wartość i brakujące wartości tabeli.

## v32 — PL / EN

Przełącznik języka znajduje się w nagłówku, po wyborze samochodu. Wybór jest zapamiętywany lokalnie pod osobnym kluczem fuel-language-v1 i nie jest synchronizowany z garażem. Interfejs, komunikaty OCR/PWA/Analytics/Supabase, formularze, atrybuty dostępności i About są tłumaczone. Daty i liczby korzystają z pl-PL lub en-GB. Walutą pozostaje PLN. Nazwy aut, notatki, surowy tekst OCR, identyfikatory i dane zapisane nie są tłumaczone. Kategorie mają stabilne polskie wartości wewnętrzne i przetłumaczone etykiety. Format i słownik CSV pozostają kompatybilne z wcześniejszymi wersjami, co wyjaśnia angielska instrukcja importu.

Plik i18n.js zawiera słownik i warstwę tłumaczenia interfejsu. Nowe komunikaty należy dodać do słownika. Testy: 23 kontroli przełączania języka i ochrony danych; audyt tekstów głównych widoków i formularza; regresje aplikacji, kopii, OCR, PWA i współdzielenia. Nie wykonano fizycznego testu na telefonie.

Publikacja z v31: index.html, sw.js, i18n.js i sharing.js. Pozostaw pozostałe zasoby. Zaktualizuj aplikację przyciskiem w Ustawieniach/About.

## v35 — konfiguracja Supabase
Włączono współdzielenie i ustawiono publiczny klucz projektu. Wgraj sharing-config.js oraz sw.js pod dotychczasowym adresem aplikacji. Projekt wymaga uruchomienia schema.sql oraz konfiguracji Email/SMTP i szablonów kodu OTP. Nie zweryfikowano rzeczywistego logowania ani synchronizacji dwóch kont.

