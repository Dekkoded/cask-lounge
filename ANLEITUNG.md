# Schritt-für-Schritt: Deine Tasting-App bauen

Diese Anleitung führt dich von Null bis zur installierbaren App, die deine
Freunde aufs iPhone (und Android) holen können — mit eigenen Accounts,
Cloud-Speicher, Gruppen, Tastings und Benachrichtigungen.

Du baust mit **Claude Code**. Du musst nicht alles selbst tippen — Claude Code
schreibt den Code, du gibst die Richtung vor und prüfst nach jedem Schritt.

**Mitgelieferte Dateien:**
- `SPEC.md` — der vollständige Bauplan (gibst du Claude Code als Kontext)
- `schema.sql` — die fertige Datenbank (kopierst du in Supabase)

---

## Überblick: Was du einrichtest

Drei kostenlose Dienste, die zusammenspielen:

1. **Supabase** — Cloud-Datenbank + Accounts + Foto-Speicher. Hier liegen alle Daten.
2. **Vercel** — hostet die App, gibt dir die Web-Adresse zum Teilen.
3. **Resend** — verschickt die „Ich trinke gerade"-Benachrichtigungs-Mails.

Dein Code liegt auf **GitHub**, damit Vercel ihn automatisch veröffentlicht.

Für deine Testrunde: **0 € laufende Kosten.** (Optional eine Domain ~12 €/Jahr.)

---

## TEIL A — Konten & Werkzeuge anlegen (einmalig, ~30 Min)

### Schritt 1: Programme installieren
Auf deinem Mac/PC brauchst du:
- **Node.js** (LTS-Version) von nodejs.org
- **Git** von git-scm.com
- **Claude Code** (Anleitung: docs.claude.com → Claude Code)
- Einen Editor, z. B. **VS Code**

### Schritt 2: Konten erstellen (alle kostenlos)
- **GitHub**-Konto (github.com)
- **Supabase**-Konto (supabase.com) → neues Projekt anlegen, Region „Frankfurt"
  wählen, Datenbank-Passwort sicher notieren
- **Vercel**-Konto (vercel.com) → mit GitHub verbinden
- **Resend**-Konto (resend.com)

### Schritt 3: Datenbank einrichten
1. Im Supabase-Projekt links auf **SQL Editor**.
2. Inhalt von `schema.sql` komplett hineinkopieren, **Run** drücken.
3. Es erscheint „Success". Damit stehen alle Tabellen + Sicherheitsregeln.
4. Links unter **Authentication → Sign In / Providers** sicherstellen, dass
   **Email** aktiviert ist. Für den Prototyp „Confirm email" ausschalten, dann
   müssen deine Freunde keine Bestätigungsmail anklicken (später wieder an).
5. Links unter **Storage** einen Bucket **`drink-photos`** anlegen, auf
   **public** stellen (für die Getränke-Fotos).
6. Links unter **Project Settings → API**: notiere dir die **Project URL** und
   den **anon public key**. Die brauchst du gleich. (Den `service_role`-Key
   NIEMALS ins Frontend — der bleibt geheim.)

---

## TEIL B — App-Grundgerüst mit Claude Code (~1 Abend)

### Schritt 4: Projekt starten
Öffne ein Terminal in einem leeren Ordner und starte Claude Code dort.
Gib Claude Code als ersten Auftrag (hänge `SPEC.md` als Kontext an):

> „Lies die beigefügte SPEC.md. Erstelle ein neues PWA-Projekt mit Vite,
> React, TypeScript und Tailwind CSS. Richte vite-plugin-pwa mit Manifest und
> Icons ein. Installiere @supabase/supabase-js und lege einen Supabase-Client
> an, der VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY aus einer .env-Datei
> liest. Lege eine .env.example an. Wir bauen die App in den Phasen aus der
> SPEC; fang mit Phase 0 an und halt dann an."

Danach legst du eine Datei `.env` an mit deinen zwei Supabase-Werten aus
Schritt 3.6.

### Schritt 5: Lokal testen
> „Starte den Dev-Server und sag mir, wie ich die App im Browser öffne."

Du solltest eine leere App-Hülle sehen. Läuft das, geht's weiter.

---

## TEIL C — Features bauen, Phase für Phase

Arbeite die Phasen aus `SPEC.md` der Reihe nach ab. Nach **jeder** Phase:
kurz im Browser testen, dann erst weiter. Hier die Aufträge an Claude Code:

### Phase 1 — Login (eigene Accounts)
> „Baue Phase 1 aus der SPEC: Registrierung und Login mit E-Mail + Passwort
> über Supabase Auth. Erstelle einen Auth-Context, eine Login- und eine
> Signup-Seite, und schütze die App-Routen, sodass nur eingeloggte Nutzer
> hineinkommen. Logout-Button nicht vergessen."

**Test:** Registriere dich mit einer Test-Mail, logge dich aus und wieder ein.
In Supabase unter **Authentication → Users** muss dein Account auftauchen, unter
**Table Editor → profiles** automatisch dein Profil.

### Phase 2 — Getränke & Bewerten (Prototyp: Whisky)
> „Baue Phase 2: Nutzer können ein Getränk anlegen (im Prototyp setzen wir
> category fest auf 'whisky' und beschriften die Oberfläche mit 'Whisky';
> die Felder name, producer, region, age_years, abv, plus Foto-Upload in den
> Supabase-Storage-Bucket drink-photos). Baue das Bewertungsformular mit den
> zwei Geschmacksrädern (12 Achsen, je 0–5, SVG wie in der SPEC beschrieben),
> drei Noten 1–10 für Nase/Geschmack/Abgang, der 10-stufigen Farbpalette, einer
> Notiz und einem Schalter 'Öffentlich zeigen'. Speichere als Upsert in ratings,
> overall = Schnitt der drei Noten."

**Test:** Whisky anlegen, bewerten, Foto hochladen. In Supabase muss die Zeile
in **ratings** stehen.

### Phase 2b — Globale Landing Page
> „Baue die globale Landing Page (Route /): Bestenliste aller öffentlich
> bewerteten Getränke aus der View global_drink_scores, sortier- und
> durchsuchbar. Die Detailseite zeigt den Gruppenschnitt, die öffentlichen
> Einzelbewertungen und ein gemitteltes Geschmacksrad."

**Test:** Deine öffentliche Bewertung erscheint auf der Startseite.

### Phase 3 — Gruppen (privater Bereich)
> „Baue Phase 3: Nutzer können Gruppen erstellen (erzeugt invite_code), per
> Code beitreten, Mitglieder sehen. Baue die Gruppen-Home mit Tabs Archiv,
> Tastings, Live, Mitglieder. Im Archiv erscheinen Getränke, deren Bewertungen
> in diese Gruppe geteilt wurden, plus die in Gruppen-Tastings bewerteten.
> Baue die Aktion 'Meine Bewertung in diese Gruppe teilen' (schreibt
> group_ratings, ohne neu bewerten zu müssen)."

**Test:** Zweiten Account anlegen, Gruppe erstellen, mit Code beitreten,
Bewertung teilen — prüfen, dass sie nur Gruppenmitglieder sehen.

### Phase 4 — Tasting mit Rangliste
> „Baue Phase 4: In einer Gruppe kann ein Host ein Tasting erstellen, Getränke
> hinzufügen, und jedes Mitglied bewertet jedes Getränk (tasting_ratings).
> Zeige eine Live-Rangliste (Schnitt aller overall je Getränk, absteigend),
> aktualisiert per Supabase Realtime. Host kann das Tasting schließen."

**Test:** Mit zwei Accounts dasselbe Tasting bewerten, Rangliste prüfen.

### Phase 5 — „Ich trinke gerade" + Benachrichtigung
> „Baue Phase 5: Ein Button in der Gruppe öffnet einen Dialog, in dem man ein
> Getränk wählt oder frei benennt und optional eine Nachricht schreibt — das
> schreibt eine drink_sessions-Zeile. Zeige aktive Sessions in der Gruppe.
> Am Ende kann der Nutzer 'Meine Bewertung teilen' tippen: falls er das Getränk
> schon bewertet hat, wird diese Bewertung via group_ratings in die Gruppe
> geteilt und in der Session unter rating_id vermerkt. Kein Zwang zur
> Neubewertung."

Für die Mail:
> „Erstelle eine Supabase Edge Function, die per Resend an alle Mitglieder der
> Gruppe eine E-Mail schickt ('X trinkt gerade Y'). Richte einen Database
> Webhook ein, der bei INSERT in drink_sessions diese Function aufruft. Lege
> den Resend-API-Key als Supabase-Secret ab, nicht im Frontend."

**Test:** Session starten, prüfen ob die Mail bei den anderen ankommt.

---

## TEIL D — Veröffentlichen & an Freunde geben

### Schritt 6: Auf GitHub + Vercel bringen
> „Lege ein Git-Repository an, committe alles, und führe mich durch das Pushen
> zu einem neuen GitHub-Repo."

Dann auf vercel.com: **New Project → dein GitHub-Repo importieren**. Unter
**Environment Variables** dieselben zwei Supabase-Werte eintragen wie in deiner
`.env`. **Deploy** drücken. Vercel gibt dir eine Adresse wie
`deine-app.vercel.app`. Jeder neue Git-Push veröffentlicht automatisch.

### Schritt 7: Optional eigene Domain
Bei einem Anbieter (z. B. Namecheap, IONOS) eine Domain kaufen (~12 €/Jahr)
und in Vercel unter **Settings → Domains** verbinden. Dann heißt der Link z. B.
`whisky-runde.de`.

### Schritt 8: Installations-Anleitung für deine Freunde
Schick ihnen den Link mit dieser Kurzanleitung (iPhone):

> 1. Link in **Safari** öffnen (wichtig — nicht in Chrome o. Ä.).
> 2. Unten auf das **Teilen-Symbol** tippen.
> 3. **„Zum Home-Bildschirm hinzufügen"** wählen, bestätigen.
> 4. Die App vom Home-Bildschirm öffnen, mit E-Mail + Passwort registrieren.
> 5. Bei der Nachfrage **Benachrichtigungen erlauben** (für die Trink-Hinweise).

Android: Link in Chrome öffnen → Menü → „App installieren". Sonst identisch.

Wichtig: Echte Push-Mitteilungen auf dem iPhone funktionieren nur, wenn die App
so installiert wurde. Die Mail-Benachrichtigung kommt unabhängig davon bei allen
an — niemand verpasst also etwas, auch ohne Installation.

---

## TEIL E — Daten sichern (kein Verlust)

- Alle Daten liegen in Supabase (Cloud), nicht auf den Geräten → Gerätewechsel
  unproblematisch.
- Supabase Free macht tägliche Backups im Hintergrund.
- Zusätzlich empfohlen: einmal im Monat im Supabase-Dashboard unter
  **Database → Backups** einen manuellen Export ziehen und ablegen.

---

## Wenn ihr später wachsen wollt

- **Andere Getränke** (Bier, Gin, Rum): Das Datenmodell kann das schon — das
  Feld `category` und das flexible `attributes`-JSON sind dafür da. Du blendest
  in der Oberfläche dann eine Getränke-Auswahl ein und hinterlegst je Kategorie
  ein passendes Geschmacksrad. Keine Datenbank-Umstellung nötig.
- **Mehr Nutzer**: Wenn das Supabase-Free-Kontingent eng wird, ist der nächste
  Schritt der Supabase-Pro-Plan (derzeit ~25 $/Monat) mit größerer Datenbank und
  Point-in-Time-Recovery.
- **Echte App-Store-Apps**: Die fertige PWA lässt sich mit Capacitor in eine
  iOS-/Android-App verpacken. Dafür braucht es das Apple Developer Program
  (99 $/Jahr) und ggf. Google Play (einmalig 25 $). Erst sinnvoll, wenn ihr
  wirklich öffentlich launchen wollt.

---

## Reihenfolge in einem Satz

Konten anlegen → `schema.sql` in Supabase einspielen → mit Claude Code Phasen
0–5 bauen und je testen → auf GitHub+Vercel veröffentlichen → Link an die Runde
mit Installations-Anleitung. Fertig ist der Prototyp mit allen Funktionen.
