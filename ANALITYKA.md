# Google Analytics 4 — konfiguracja

Integracja v13 zastępuje Plausible. Pomiar jest wyłączony do podania measurementId i siteUrl w analytics-config.js. Konto i prywatny panel raportów pozostają po stronie właściciela.

1. W Google Analytics utwórz usługę GA4 i strumień danych typu Sieć dla publicznego adresu aplikacji.
2. Skopiuj identyfikator pomiaru G-... do measurementId. Do siteUrl wpisz pełny adres aplikacji, np. https://nazwa.github.io/FuelTracker/.
3. W ustawieniach strumienia WYŁĄCZ Pomiar zaawansowany (Enhanced measurement), aby Google nie dodawał zdarzeń formularzy, wyszukiwania, kliknięć i zmian historii. Nie włączaj Google Signals, danych użytkownika ani funkcji reklamowych dla tej integracji. Nie łącz Google Ads, jeśli nie potrzebujesz reklam.
4. Opublikuj razem index.html, sw.js, analytics-config.js oraz analytics.js. Pozostaw pozostałe pliki aplikacji. Po zmianie konfiguracji zwiększ VERSION w sw.js, aby PWA pobrała nowe pliki.
5. Otwórz publiczny adres online, zaakceptuj statystyki i sprawdź Czas rzeczywisty w GA4. Dodaj wydatek i sprawdź zdarzenie expense_added. Standardowe raporty mogą aktualizować się później. Nie umieszczaj haseł ani kluczy API w plikach.

Działanie: brak połączeń z Google przed zgodą i po odmowie (basic consent mode). Odmowa i akceptacja mają równorzędne przyciski. Wybór jest przechowywany lokalnie przez 180 dni i można go zmienić w Ustawieniach. Wycofanie zgody blokuje pomiar, czyści dostępne ciasteczka _ga i przeładowuje aplikację. Nie usuwa danych już zebranych w GA4. Zapis danych aplikacji nie wymaga zgody na statystyki.

Zdarzenia: page_view przy wczytaniu online po zgodzie; expense_added po udanym dodaniu nowego wydatku. Edycja i import nie wysyłają expense_added. app_mode ma tylko browser lub installed. Do zdarzeń nie dołączamy kwot, nazw aut, notatek, zdjęć ani ID wpisów. URL jest stały, bez query i fragmentu; referrer pusty. GA4 przetwarza własne identyfikatory cookie oraz dane techniczne połączenia. Dane offline nie są kolejkowane. Jeśli zgodę zapisano offline, tag uruchomi się po odzyskaniu sieci. Lokalny HTTP i inne domeny są wyłączone.

Prywatny panel jest dostępny na koncie Google właściciela; nie dodajemy go do aplikacji. Udostępniaj dostęp wyłącznie upoważnionym osobom.

Testy: 29 kontroli aplikacji i 16 kontroli GA4 w modelu JS. Nie potwierdzono odbioru w rzeczywistym GA4, ponieważ brak identyfikatora pomiaru i publicznego adresu.

Dokumentacja:
https://developers.google.com/analytics/devguides/collection/ga4/views
https://developers.google.com/tag-platform/security/guides/consent
https://developers.google.com/tag-platform/security/concepts/consent-mode
