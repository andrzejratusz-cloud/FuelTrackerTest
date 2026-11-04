# Współdzielenie Fuel Tracker v25 — uruchomienie i wyłączenie

Moduł jest eksperymentalny i domyślnie wyłączony. Bez konfiguracji aplikacja działa lokalnie jak wcześniej. Nie utworzono projektu ani nie przesłano żadnych danych do Supabase.

## Konfiguracja właściciela

1. Utwórz projekt na swoim koncie https://supabase.com/dashboard. Wybierz dostępny region UE. Zachowaj hasło bazy w swoim menedżerze haseł — aplikacja go nie potrzebuje.
2. W SQL Editor uruchom dołączony supabase/schema.sql JEDEN RAZ w nowym projekcie. Skrypt tworzy trzy tabele i funkcje ft_*. Tabele mają RLS, bez bezpośrednich uprawnień dla anon/authenticated. Publiczne funkcje sprawdzają członkostwo po auth.uid(). Nie używaj istniejących tabel z innymi danymi.
3. W Authentication włącz logowanie e-mail. W szablonach wiadomości (Magic Link i Confirm signup, zależnie od konfiguracji) umieść kod {{ .Token }} zamiast samego linku. Użytkownik wpisuje kod w aplikacji, także tej z ikony iOS.
4. Skonfiguruj własną wysyłkę SMTP w Supabase Auth. Domyślna wysyłka Supabase jest testowa i nie obsłuży dowolnych użytkowników. Skonfiguruj limity wysyłki i ochronę przed nadużyciami przed publicznym udostępnieniem. Konfiguracja SMTP i sekrety pozostają w panelu Supabase.
5. Ustaw Site URL: https://andrzejratusz-cloud.github.io/fuel-tracker/. Wybierz odpowiednie ustawienia rejestracji e-mail dla swoich użytkowników. Użytkownicy nie powinni mieć dostępu do panelu administracyjnego Supabase.
6. Z Project Settings / API pobierz Project URL i publiczny klucz publishable (lub starszy anon). W sharing-config.js ustaw:

window.FUEL_SHARING_CONFIG = Object.freeze({
 enabled: true,
 url: 'https://TWOJ-PROJEKT.supabase.co',
 publicKey: 'TWOJ-PUBLICZNY-KLUCZ'
});

Nigdy nie umieszczaj service_role, secret, hasła bazy ani SMTP w plikach GitHub Pages.

7. Opublikuj index.html, pwa.js, sw.js, sharing-config.js, sharing.js wraz ze zwykłymi plikami aplikacji. Przy późniejszej zmianie konfiguracji zwiększ VERSION w sw.js. Zaktualizuj istniejącą PWA przyciskiem aktualizacji.

## Korzystanie

- Przed rozpoczęciem wyeksportuj dane na obu urządzeniach.
- W Ustawieniach / Współdzielenie podaj e-mail, wyślij kod i wpisz go w tym samym oknie.
- Pierwsza osoba wybiera Utwórz garaż z moich danych i potwierdza przesłanie samochodów, wpisów, limitów i obrazu karty do Supabase.
- Właściciel zapisuje zaproszenie dla dokładnego e-maila drugiej osoby. Zaproszenie jest ważne 7 dni. Ten moduł NIE wysyła e-maila z zaproszeniem. Przekaż drugiej osobie adres aplikacji samodzielnie.
- Druga osoba loguje się własnym e-mailem, odświeża zaproszenia i wybiera Dołącz. Jedna osoba może należeć do jednego garażu, garaż ma maksymalnie dwie osoby. Zaproszenie można zastąpić innym przed dołączeniem. Usuwanie członków z poziomu aplikacji nie jest jeszcze zaimplementowane.
- Dane lokalne i wspólne są przechowywane osobno. Nie scalamy automatycznie dotychczasowych plików z obu telefonów. Utworzenie garażu przenosi do niego kopię danych pierwszej osoby; dane drugiej osoby pozostają w jej trybie lokalnym. Nie importuj całego CSV do wspólnego garażu bez wcześniejszego scalenia plików, bo import zastępuje zbiór.
- Wybór aktywnego auta jest lokalny, nie przełącza auta drugiej osobie. Pozostały zestaw, w tym karta, limity i kolory, jest współdzielony.

## Synchronizacja i konflikty

- Synchronizacja automatyczna co około 15 sekund, po zapisaniu zmiany, odzyskaniu sieci lub powrocie do otwartej aplikacji; także przyciskiem. Zamknięta aplikacja nie synchronizuje się w tle. Otwarte formularze wstrzymują pobieranie, żeby nie zastępować edytowanych danych.
- Po utracie sieci dane pozostają w lokalnym zapisie wspólnego garażu. Trwały stan bazowy i numer rewizji pozwalają wysłać zmiany po ponownym uruchomieniu. Kolejka ma postać całego aktualnego zestawu, nie osobnych operacji. Wyczyszczenie danych witryny usuwa niewysłane zmiany.
- Serwer przyjmuje zapis tylko dla oczekiwanej rewizji. Równoczesne zmiany dają konflikt; nic nie jest automatycznie nadpisywane. Obecny wariant wymaga wybrania CAŁEGO zestawu: lokalnego albo serwera. Najpierw pobierz kopię, porównaj dane i dopiero potwierdź. Brak automatycznego scalania pojedynczych wpisów. Usunięcia są częścią pełnego zestawu i również podlegają kontroli rewizji.
- Po odłączeniu i ponownym połączeniu zachowujemy lokalne niewysłane zmiany i ich bazową rewizję. Nowe logowanie innej osoby nie otwiera prywatnego lokalnego zapisu wspólnego garażu poprzedniej osoby.
- Baza ma limit 4 MB na dokument garażu (w tym obraz karty). Przy błędzie lokalne dane zostają na urządzeniu. Konto bez dostępu nie może pobrać danych przez RPC. Reguły i uprawnienia trzeba zweryfikować na prawdziwym projekcie przed użyciem produkcyjnym.

## Wyłączenie eksperymentu

W aplikacji wybierz Wróć do danych lokalnych lub Wyloguj się. Zostanie przywrócony wcześniejszy prywatny zestaw; wspólna kopia lokalna i niewysłane zmiany pozostaną odrębnie na urządzeniu. Aby wyłączyć moduł wszystkim, ustaw enabled:false w sharing-config.js, zwiększ VERSION w sw.js i opublikuj. Nie usuwa to danych z Supabase; projekt i dane chmurowe pozostają pod kontrolą właściciela. Przed jakimkolwiek usuwaniem projektu wyeksportuj dane. Nie usuwaj plików sharing*.js bez usunięcia odwołań z index.html i listy SHELL w sw.js.

## Odbiór przed publikacją

Nie wykonano jeszcze testów prawdziwego Supabase, SMTP ani telefonu — brak projektu i konfiguracji. Lokalnie sprawdzono 20 przypadków modelu synchronizacji, w tym konflikt i odmowę nadpisania, tryb wyłączony, brak sesji i brak internetu, plus testy izolacji danych lokalnych od wspólnych. Testy modelowe nie zastępują sprawdzenia SQL/RLS i Auth w rzeczywistym projekcie.

Po konfiguracji sprawdź:
1. Dwa niezależne konta: utworzenie garażu, zaproszenie, dołączenie i dwukierunkowy zapis.
2. Trzecie konto bez zaproszenia: ft_get i ft_put muszą być odrzucone; anonimowe wywołania również.
3. Offline: zapis, zamknięcie, ponowne otwarcie i synchronizacja; równoczesne zmiany na drugim urządzeniu powinny pokazać konflikt.
4. Odłączenie/wylogowanie i ponowne połączenie: prywatne dane lokalne oraz niewysłane wspólne dane muszą pozostać osobno.
5. iPhone: osobne logowanie w Safari i z ikony do tego samego konta/garażu; Android analogicznie.
6. Dane logowania i wydatki nie powinny pojawiać się w zdarzeniach Google Analytics; Pomiar zaawansowany GA4 pozostaje wyłączony.

Dokumentacja:
https://supabase.com/docs/guides/auth/auth-email-passwordless
https://supabase.com/docs/guides/auth/auth-smtp
https://supabase.com/docs/guides/database/functions
https://supabase.com/docs/guides/database/postgres/row-level-security
