# Whisky is Life — App-Spezifikation

Ein Bauplan für eine installierbare Web-App (PWA) mit Cloud-Backend.
Gedacht zum Mitgeben an **Claude Code**: Arbeite die Phasen der Reihenfolge nach ab.

---

## 1. Was die App können soll (in einem Satz)

Eine Whisky-Bewertungs-App, in der jeder mit eigenem Konto Whiskys bewertet,
seine Bewertung global oder nur in privaten Gruppen sichtbar macht, in Gruppen
exklusive Tastings mit Rangliste hostet und die Runde per Mail benachrichtigen
kann, dass er gerade einen Whisky trinkt.

## 2. Technische Entscheidungen (bereits getroffen)

| Bereich            | Wahl                                    | Warum |
|--------------------|-----------------------------------------|-------|
| App-Typ            | **PWA** (installierbar, kein App-Store) | Schnellster Start, ein Code für iOS/Android/Desktop |
| Frontend           | **React + Vite + TypeScript**           | Standard, von Claude Code gut wartbar |
| Styling            | **Tailwind CSS**                        | Schnell, konsistent |
| Routing            | **React Router**                        | Mehrere Seiten (Landing, Gruppe, Tasting …) |
| Backend            | **Supabase** (Postgres + Auth + Storage + Realtime) | Kostenloses Kontingent, RLS für Sichtbarkeit, fertige Auth |
| Login              | **E-Mail + Passwort** (Supabase Auth)   | Wie gewünscht |
| Benachrichtigung   | **E-Mail** primär (Supabase Edge Function + Resend), Web-Push optional | Mail erreicht alle sofort; iOS-Web-Push nur bei installierter PWA ab iOS 16.4 |
| Hosting Frontend   | **Vercel** oder **Netlify** (kostenlos) | Auto-Deploy aus GitHub |

## 3. Datenmodell

Das vollständige SQL liegt in `schema.sql` und wird **unverändert** im Supabase
SQL-Editor ausgeführt. Kurzüberblick der Tabellen:

- `profiles` — Nutzerprofil (1:1 zu Supabase-Auth-User), öffentlich lesbar.
- `drinks` — globaler Getränke-Katalog (generisch). Feld `category` (Default
  `'whisky'`) erlaubt später Bier, Gin, Rum etc.; flexible Zusatzfelder in
  `attributes` (JSON). Im Prototyp setzt das Frontend `category='whisky'` fix
  und beschriftet die Oberfläche mit „Whisky".
- `ratings` — eine Bewertung pro Nutzer pro Whisky, Feld `is_public` steuert
  globale Sichtbarkeit. Enthält Noten (Nase/Geschmack/Abgang), Gesamtschnitt,
  Farb-Index und die zwei Geschmacksräder als JSON.
- `groups`, `group_members` — private Gruppen + Mitgliedschaften, Beitritt per
  `invite_code`.
- `group_ratings` — verknüpft eine bestehende `ratings`-Zeile mit einer Gruppe.
  **Das ist der Mechanismus für „Bewertung teilen, ohne neu zu bewerten".**
- `tastings`, `tasting_drinks`, `tasting_ratings` — Event innerhalb einer
  Gruppe; eigene Bewertungstabelle, damit daraus eine Tasting-Rangliste entsteht.
- `drink_sessions` — „Ich trinke gerade …"; löst die Mail aus und kann am Ende
  optional auf eine `ratings`-Zeile verweisen (geteilte Bewertung).

**Sicherheit:** Alle Tabellen haben Row Level Security. Ein Nutzer sieht eine
Bewertung nur, wenn sie öffentlich ist, ihm gehört, oder in eine seiner Gruppen
geteilt wurde. Das ist in den Policies in `schema.sql` festgelegt — nicht im
Frontend nachbauen, das Backend erzwingt es.

## 4. Geschmacksrad — Bewertungskriterien (recherchierter Standard)

Basierend auf dem **SWRI/Pentlands Flavour Wheel** (1978, Scotch Whisky Research
Institute) bzw. der Whisky-Magazine-Variante. **Dieselben 12 Achsen für Nase und
Geschmack** (genau wie auf klassischen Tasting-Sheets):

```
Fruchtig · Floral · Würzig · Getreidig · Torfig · Schwefelig ·
Hefig · Nussig · Holzig · Weinig · Schoko · Rauchig
```

Jede Achse 0–5 (Intensität). Gespeichert als
`wheels = {"nose":[12 Zahlen], "taste":[12 Zahlen]}`.
Zusätzlich drei Gesamtnoten 1–10 (Nase, Geschmack, Abgang); `overall` = deren
Schnitt, von der App berechnet und mitgespeichert.

## 5. Screens / Routen

| Route | Screen | Inhalt |
|-------|--------|--------|
| `/` | **Globale Landing Page** | Bestenliste aller öffentlich bewerteten Whiskys (View `global_drink_scores`), sortier-/durchsuchbar. Detailseite zeigt Schnitt + öffentliche Einzelbewertungen + gemitteltes Geschmacksrad. |
| `/login`, `/signup` | **Auth** | E-Mail + Passwort über Supabase Auth. |
| `/whisky/:id` | **Whisky-Detail** | Globale Wertung + eigenes Bewerten-Formular (Räder, Farbe, Noten, Foto, Schalter „öffentlich"). |
| `/groups` | **Meine Gruppen** | Liste + „Gruppe erstellen" + „Per Code beitreten". |
| `/groups/:id` | **Gruppen-Home** | Tabs: **Archiv** (alle je in der Gruppe geteilten/bewerteten Whiskys), **Tastings**, **Live** (aktive Trink-Sessions), **Mitglieder/Einladen**. |
| `/groups/:id/tasting/:tid` | **Tasting** | Whisky-Liste des Tastings; jeder bewertet jeden; Live-**Rangliste** (Schnitt über alle Teilnehmer, sortiert). Host kann Tasting schließen. |

## 6. Kern-Features im Detail

### 6.1 Bewerten (global + Sichtbarkeit)
- Nutzer öffnet einen Whisky, füllt zwei Räder + drei Noten + Farbe + optional
  Foto + Notiz aus. Schalter **„Öffentlich auf der Landing Page zeigen"** setzt
  `is_public`.
- Genau **eine** Bewertung pro Whisky pro Nutzer (DB-Constraint `unique`).
  Erneutes Speichern = Update derselben Zeile (`upsert`).

### 6.2 Gruppen
- Erstellen erzeugt automatisch einen `invite_code`. Beitreten: Code eingeben →
  App sucht Gruppe → fügt `group_members`-Zeile hinzu.
- Im Gruppen-**Archiv** erscheinen alle Whiskys, zu denen Bewertungen in diese
  Gruppe geteilt wurden (`group_ratings`) **oder** die in einem Gruppen-Tasting
  bewertet wurden.

### 6.3 Tasting mit Rangliste
- Host erstellt Tasting in der Gruppe, fügt Whiskys hinzu (`tasting_drinks`).
- Jedes Mitglied bewertet jeden Whisky → `tasting_ratings`.
- **Rangliste**: pro Whisky der Schnitt aller `overall` der Teilnehmer,
  absteigend sortiert. Live aktualisiert (Supabase Realtime auf `tasting_ratings`).
- Host setzt `status='closed'` → Rangliste wird final.

### 6.4 „Ich trinke gerade …" + Benachrichtigung
- Button in der Gruppe → Dialog: Whisky wählen (aus Katalog) **oder** frei
  benennen + optionale Nachricht → schreibt `drink_sessions`-Zeile.
- Ein **Supabase Database Webhook** auf `INSERT` in `drink_sessions` ruft eine
  **Edge Function** auf, die per **Resend** allen Gruppenmitgliedern eine Mail
  schickt: „Leon trinkt gerade Ardnahoe Càraid Ìleach 🥃".
- **Bewertung trennen vom Trinken:** Die Session zwingt zu keiner neuen Wertung.
  Am Ende kann der Trinkende auf „Meine Bewertung teilen" tippen → falls er den
  Whisky schon bewertet hat, wird diese bestehende `ratings`-Zeile via
  `group_ratings` in die Gruppe geteilt und in der Session unter `rating_id`
  vermerkt. Kein Zwang, denselben Whisky an verschiedenen Tagen neu zu bewerten.

## 7. Baureihenfolge für Claude Code

Arbeite diese Phasen nacheinander ab; teste nach jeder.

**Phase 0 — Setup**
1. `npm create vite@latest whisky -- --template react-ts`, Tailwind einrichten.
2. Supabase-Projekt anlegen (kostenlos). `schema.sql` im SQL-Editor ausführen.
3. `@supabase/supabase-js` installieren; Client mit `VITE_SUPABASE_URL` +
   `VITE_SUPABASE_ANON_KEY` aus `.env` (niemals den service-role-Key ins Frontend!).
4. PWA: `vite-plugin-pwa` einrichten (Manifest, Icons, Offline-Shell).

**Phase 1 — Auth**
5. Signup/Login mit E-Mail+Passwort. Auth-Context, geschützte Routen.
6. Profil-Anlage testen (Trigger legt `profiles`-Zeile automatisch an).

**Phase 2 — Whiskys & globale Bewertung**
7. Whisky anlegen (inkl. Foto-Upload nach Supabase Storage Bucket `drink-photos`).
8. Bewertungs-Formular mit den zwei Geschmacksrädern (SVG, 12 Achsen, 0–5),
   drei Noten 1–10, Farb-Palette, `is_public`-Schalter. Upsert in `ratings`.
9. Globale Landing Page aus `global_drink_scores` + Detailseite mit Schnitt
   und gemitteltem Rad.

**Phase 3 — Gruppen**
10. Gruppe erstellen / per Code beitreten / Mitglieder anzeigen.
11. Gruppen-Archiv (geteilte + im Tasting bewertete Whiskys).
12. „Bewertung in Gruppe teilen"-Aktion (`group_ratings`).

**Phase 4 — Tasting**
13. Tasting erstellen, Whiskys hinzufügen, bewerten, Live-Rangliste (Realtime).

**Phase 5 — Trink-Session + Mail**
14. „Ich trinke gerade"-Button + Live-Anzeige in der Gruppe.
15. Edge Function + Resend-Integration für die Mail; Webhook auf `drink_sessions`.
16. „Bewertung teilen"-Abschluss der Session.

**Phase 6 — Feinschliff**
17. PWA-Install-Hinweis, leere Zustände, Ladezustände, Fehlerbehandlung.
18. RLS testen: zwei Test-Accounts, prüfen dass private Bewertungen NICHT
    fremd sichtbar sind (siehe `schema.sql`-Kommentare).

## 8. Wichtige Geschmacksrad-SVG-Logik (aus dem Prototyp übernehmen)

Achsen-Punkt bei Achse `i` (0–11) und Wert `v` (0–5), Zentrum (cx,cy), Radius R:
```
ang = -PI/2 + i * 2*PI/12        // oben starten, im Uhrzeigersinn
x = cx + (v/5)*R * cos(ang)
y = cy + (v/5)*R * sin(ang)
```
Gemitteltes Gruppen-/Tasting-Rad = je Achse der Mittelwert aller Bewertungen,
auf 1 Nachkommastelle gerundet. Beschriftungen ca. R+16 vom Zentrum, Anker
links/mitte/rechts je nach cos(ang), SVG-viewBox seitlich verbreitern, damit
lange Labels („Schwefelig") nicht abgeschnitten werden.

## 9. Kosten & Realismus (ehrlich)

- **Supabase Free**: bis 500 MB DB, 1 GB Storage, 50 000 monatlich aktive
  Nutzer-Auth, Edge Functions inkl. — für eure Runde lange ausreichend.
- **Vercel/Netlify Free**: für eine PWA dieser Größe kostenlos.
- **Resend Free**: ~3 000 Mails/Monat gratis — reicht für Trink-Benachrichtigungen.
- **Eigene Domain** (optional): ~10–15 €/Jahr.
- **Echte iOS-App im App Store** (später, falls gewünscht): braucht Apple
  Developer Program (99 USD/Jahr) und ein Verpacken der PWA (z. B. Capacitor).
  Für den Start nicht nötig — die PWA lässt sich per „Zum Home-Bildschirm" wie
  eine App installieren.

## 10. Datensicherheit / kein Datenverlust

- Daten liegen in Supabase-Postgres (nicht lokal) → kein Verlust beim Gerätewechsel.
- Supabase macht automatische Backups (Free: tägliche Sicherung im Hintergrund;
  für Point-in-Time-Recovery braucht es einen bezahlten Plan).
- Empfehlung: einmal pro Monat einen DB-Export ziehen (Supabase-Dashboard →
  Database → Backups / oder `pg_dump`), als zusätzliche Sicherung.
- `is_public`-Bewertungen sind bewusst global lesbar; alles andere ist durch
  RLS auf Gruppenmitglieder beschränkt.
