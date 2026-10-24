# Dungeon Architect

> Erschaffe den ultimativen Dungeon. Lass Helden darin scheitern.

Roguelike-Strategie × Dungeon-Simulation × Deckbuilder. Du bist nicht der Held –
du bist der Grund, warum niemand den Dungeon überlebt.

Dieses Repository enthält einen **spielbaren Prototyp (Vertical Slice)** in HTML5/Canvas.
Das vollständige Spielkonzept steht in [`docs/konzept.md`](docs/konzept.md).

## Starten

Kein Build-Schritt, keine Abhängigkeiten:

```bash
# Variante 1: einfach öffnen
open index.html            # bzw. Doppelklick

# Variante 2: lokaler Server
python3 -m http.server 8000   # dann http://localhost:8000
```

## So wird gespielt

1. **Planen** – Du ziehst 5 Karten und hast Mana (3, später mehr).
   - **Räume** erweitern den Dungeon (an bestehende Felder angrenzend) oder ersetzen einen Raum.
   - **Monster** und **Fallen** kommen in Räume (je eines pro Raum).
     Dieselbe Karte auf dasselbe Monster bzw. dieselbe Falle wertet sie auf (bis ★★★).
   - **Zauber** wirken sofort.
2. **Beobachten** – „Tür öffnen“: Helden betreten den Dungeon.
   Schatzsucher erkunden **jeden** erreichbaren Raum (Sackgassen = Fallen doppelt passieren),
   Diebe nehmen den **kürzesten Weg** zum Herz.
3. **Verbessern** – Nach jeder Welle: 1 von 3 Karten wählen, beim Händler einkaufen,
   Karten entfernen. Bosse (Welle 5 und 10) lassen Artefakte fallen.
4. **Überleben** – Halte 10 Wellen stand. Danach geht's optional endlos weiter.

Gestorbene Monster kehren zur nächsten Welle zurück – der Dungeon ist dein Build.

**Steuerung:** Karte anklicken → leuchtendes Feld anklicken. Rechtsklick/`Esc` bricht ab.
`1`–`9` wählt Handkarten, `Leertaste` öffnet die Tür.

### Heldenklassen

| Klasse  | Problem für dich |
|---------|------------------|
| Krieger | +50% Schaden gegen Monster, Rüstung |
| Magier  | Umgeht Fallen, Magie ignoriert Rüstung |
| Dieb    | Kürzester Weg, weicht aus, stiehlt 30% Gold |
| Paladin | Reinigt Gift, Brand und Flüche, heilt die Gruppe |

### Synergien

- **Gift:** Pilzhöhle, Giftsee, Spinne, Pilzling, Giftpfeile, Seuchenwolke, Giftkessel
- **Untot:** Krypta, Skelett, Nekromant, Lich, Seelen (Untote +1 LP je 2 Seelen), Knochenthron
- **Fluch:** Ritualkammer, Fluchsiegel, Lich, Fluchkrone
- **Feuer:** Lavagrube, Feuerwichtel, Feuerrune, Drache, Ewige Flamme
- **Kontrolle:** Labyrinth + Falle, Spinnennetz, Schatzkammer, Einsturz

## Projektstruktur

```
index.html          Einstieg
css/style.css       Oberfläche
js/data.js          Karten, Helden, Artefakte, Wellen (reine Daten – hier balancen)
js/game.js          Spiellogik & Simulation (ohne DOM, headless testbar)
js/sprites.js       Pixel-Art als 8×8-Zeichenketten
js/render.js        Canvas-Rendering des Dungeons
js/ui.js            HUD, Hand, Dialoge
js/main.js          Spielschleife & Eingabe
tools/simtest.js    Headless-Bot: Absturztest & Balance-Statistik
```

## Balance-Test

```bash
node tools/simtest.js 500
```

Spielt Runs mit einem Zufalls-Bot und einem „gierigen“ Bot durch und gibt Siegquote und
erreichte Wellen aus. Aktueller Stand: Zufalls-Bot ≈ 7 %, gieriger Bot ≈ 33 % Siege – ein
Mensch, der Synergien gezielt baut, sollte deutlich besser abschneiden.

## Weg zu Steam (Ideen)

- Verpacken mit **Electron** oder **Tauri** (der Code läuft unverändert), Steamworks via `steamworks.js`
- Speicherstände, Meta-Progression (freischaltbare Karten/Startdecks), Achievements
- Echte Pixel-Art-Sprites & Animationen, Sound und Musik
- Mehr Heldenklassen (Kleriker, Waldläufer, Zwerg), Events, Raum-Synergien über Nachbarschaft
- Lokalisierung (Texte liegen zentral in `js/data.js`)
