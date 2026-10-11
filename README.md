# Funny Gadgets

Sklep demonstracyjny dla marki Funny Gadgets i domeny e-gadgets.com.pl, przeniesiony do **Next.js 16.4 / React 19.3 (App Router)**. Zachowuje wybrane logo, oryginalny wygląd, trzy przykładowe produkty i dotychczasowe interakcje.

## Uruchomienie

Wymagany Node.js 20.9 lub nowszy.

```sh
npm ci
npm run dev
```

Podgląd: http://127.0.0.1:4173.

```sh
npm run check
npm run build
npm start
```

`check` sprawdza przeliczenia cen i dostawy, walidację oraz zgodność zapisanych danych koszyka i ulubionych. `build` tworzy produkcyjną aplikację Next.js; `start` ją uruchamia.

## Publikacja na Vercel

Zaimportuj repozytorium `funnygadgetsshop-ui/website` z gałęzi `main`. Konfiguracja w `vercel.json` ustawia framework **Next.js**, instalację `npm ci`, budowanie `npm run build` i katalog `.next`. Nie używaj poprzedniego katalogu `dist`. Obecny frontend nie wymaga zmiennych środowiskowych.

## Struktura

- `app/layout.jsx` — układ dokumentu, język, fonty i metadane.
- `app/page.jsx` — strona główna App Routera.
- `app/globals.css` — zachowany motyw i układ desktop/mobilny.
- `components/` — interfejs sklepu w komponentach Reacta.
- `lib/store.js` — dane produktów, walidacja, filtrowanie i obliczenia w groszach.
- `public/assets/` — wybrane logo, favicon i grafiki produktów. Prompty: `image-prompts.txt`.
- `tests/store.test.js` — testy logiki sklepu i dotychczasowego formatu danych.
- `.openai/hosting.json` — tożsamość prywatnego podglądu w Sites.

## Prywatny podgląd Sites

Vercel używa standardowej aplikacji Next.js. Istniejący prywatny podgląd Sites korzysta ze statycznego eksportu tej samej aplikacji:

```sh
SITES_STATIC_EXPORT=1 npm run build
```

Eksport trafia do `out/`. Ten tryb nie obsługuje funkcji wymagających serwera. Nie ustawiaj `SITES_STATIC_EXPORT` na Vercelu, gdy będziemy podłączać backend.

## Zakres demonstracji

Produkty, ceny i warunki dostawy są przykładowe. Koszyk i ulubione zapisują się w `localStorage` pod dotychczasowymi kluczami `funny-gadgets-cart-v1` i `funny-gadgets-favorites-v1`; wcześniejsze dane działają na tym samym adresie strony i w tej samej przeglądarce. Pokazowa dostawa kosztuje 12,90 zł i jest bezpłatna od 199 zł. Podsumowanie nie składa zamówienia ani nie pobiera płatności.

Kolejny etap to źródło produktów i stanów magazynowych, baza zamówień, płatności oraz rzeczywiste metody dostawy. Migracja nie podpina domeny e-gadgets.com.pl ani nie uruchamia backendu.
