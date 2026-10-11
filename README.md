# Funny Gadgets

Responsywny front sklepu przygotowany dla marki Funny Gadgets i domeny e-gadgets.com.pl. Identyfikacja korzysta z wybranego czerwono-żółtego logotypu, kremowego tła i komiksowych akcentów.

## Uruchomienie lokalne

```sh
cd funny-gadgets
npm run dev
```

Podgląd: http://127.0.0.1:4173. Projekt jest statyczny, bez instalowania zależności i bez procesu budowania. `npm run check` sprawdza składnię JavaScript.

## Pliki

- `dist/index.html` — strona główna, katalog, sekcja prezentów, FAQ i stopka.
- `dist/styles.css` — układ desktop/mobilny, motyw, dialogi i dostępność.
- `dist/app.js` — trzy produkty demonstracyjne, filtry, sortowanie, wyszukiwanie, ulubione, szczegóły produktu, koszyk i podsumowanie.
- `dist/assets/` — wybrane logo, favicon oraz trzy zdjęcia produktów wygenerowane narzędziem ImageGen. Dokładne prompty są w `image-prompts.txt`.
- `.openai/hosting.json` — konfiguracja prywatnego podglądu w Sites.

## Zakres demonstracji

Produkty, ceny, opisy i warunki dostawy są przykładowe. Koszyk i ulubione zapisują się lokalnie w przeglądarce. Przeliczenia korzystają z cen w groszach; pokazowa dostawa kosztuje 12,90 zł i jest bezpłatna od 199 zł. Podsumowanie nie składa zamówienia ani nie pobiera płatności.

## Następny etap

Podłączenie źródła produktów i stanów magazynowych, API koszyka/zamówień, płatności oraz rzeczywistych metod dostawy. Dane demonstracyjne są wydzielone na początku `app.js`, a logika katalogu i koszyka ma osobne funkcje renderowania. Domena e-gadgets.com.pl nie została podpięta do podglądu.

## Weryfikacja

Sprawdzono składnię JS i scenariusze w przeglądarce: filtrowanie, sortowanie cen, szukanie i pusty wynik, ulubione, dodawanie z karty i szczegółów, zmiana ilości, usuwanie, dwa progi kosztu dostawy, podsumowanie demo, zapis po odświeżeniu i mobilne menu. Układ sprawdzono na desktopie oraz telefonie. Dialogi obsługują Escape i powrót fokusu; animacje respektują preferencję ograniczonego ruchu.
