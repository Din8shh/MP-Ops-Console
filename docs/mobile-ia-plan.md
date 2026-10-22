# Phone view and information hierarchy: review and plan (22 Oct 2026)

Reviewed against Luke Wroblewski's *Mobile First* (every chapter) and the NN/g *Information Architecture* study
guide (principles, navigation, research methods). The earlier mobile audit (`docs/mobile-plan.md`, 13 Oct) fixed
the **mechanics**: tap sizes, text size, Back button, scroll position and sheets. This review is about the
**structure**: what each phone screen shows first, how the pages are grouped and named, and whether each role
gets to its own work.
**Status: phases 1–5 built on branch `mobile-ia` (22 Oct 2026), previewed, not deployed. Phase 6 (tree test) is yours to run.**

---

## 1. The rules I measured against (short version)

**From *Mobile First***
1. **Content before navigation.** The first screen shows what the person came for, not menus, banners or chrome.
2. **Know why they picked up the phone:** to *check in* (status), *look up* (a machine, a number), or *get
   something done* (call, raise a concern). Build each role's first screen around that.
3. **One eyeball, one thumb.** Short bursts, outdoors, one hand. Main actions sit low and big.
4. **Every page ends with a next step.** A page that just stops is a dead end.
5. **Use what the phone can do:** tap to call, open the location in Maps. Never offer a call to a number that
   isn't one.
6. **Right keyboard, no auto-correct on codes.** Machine numbers like `UPL_2806` must not be "corrected".
7. **Reduce.** Fewer things on screen means fewer mis-taps and faster reading.

**From NN/g**
8. **Structure before menus.** Decide the groups, then the menu. **One structure** on desktop and phone.
9. **Information scent.** Every label says exactly what's behind it. No abbreviations without a key, no vague
   "More".
10. **One name, one thing.** A page keeps the same name on the tab, the heading and the browser title.
11. **4–5 tabs on a phone bar**, with icon *and* label. Anything more goes into a grouped list, never a long flat one.
12. **You are here:** the page name at the top of every screen, not only a highlighted tab.
13. **Each role gets its own home**, rather than one menu that everybody scans.
14. **Test the menu with real users** (a tree test) before calling it final.

## 2. How the review was done

- Local preview on the **live sheet**, phone layout at **320 × 560** (small Android) and **390 × 664** (a normal
  iPhone).
- Logins: **admin** (test PIN 0088) on every page in the bar and the More sheet, plus the machine detail sheet;
  **MP UPL field login** (test PIN 1111) on its home and More sheet. Leadership's phone menu was read from the code.
  I didn't walk Wheat and IoT: their phone pages were redesigned a week ago and are built around one job each.
- For each page I measured what is visible on the **first screen** (before any scrolling) and how long the page is.

## 3. Why each role opens the app on a phone

| Who | Why they pick it up (*Mobile First*) | What their first screen should answer |
|---|---|---|
| **Field login** (state UPL / SWAL) | **Check in** and **get it done**: on the move, between visits | "Which of *my* machines didn't run yesterday, and whose number do I ring?" |
| **Admin (ops head)** | **Check in** first thing in the morning; **look up** a machine or person when a call comes in | "Did the fleet work? Where didn't it?" Then search. |
| **Leadership** | **Check in**, weekly | "Are we ahead of last season?" |

## 4. What already works (keep it)

- The **phone mechanics from the 13 Oct audit**: 44px targets, 16px fields (no iOS zoom), Back closes sheets,
  scroll position survives, swipe-down sheets, offline badge.
- The new **status card** ("44 of 1,451 worked yesterday", with the season line) is the right first card for a
  check-in.
- **Tap to call** on people rows and the operator.
- **Hierarchy cards** (Territory → Cluster → Machine) expand in place with a clear chevron, which is NN/g's
  accordion advice exactly.
- **Machines list pages by 60** with "Load more · showing 60 of 1,451". It says what you're seeing and what's left.
- The **chromeless pages already name themselves** in the header ("Insights · All India"). That is the pattern to
  extend.
- The **PIN field opens the number pad** (`inputmode="numeric"`).

## 5. Problems found

### Phone view (M)

| # | Where | Problem (what the person sees) | Rule broken | Fix |
|---|---|---|---|---|
| **M1** | Map, Territory, Machines, Weather (all four bar tabs) | **Every tab opens with the same three blocks**: weather banner, status card, and a sideways row of 9–12 number cards. At 320 × 560 the page you tapped starts **below the first screen**. On Map, the map itself isn't visible at all. Tapping a different tab looks as if nothing changed. | 1, 7 | Show the status card and number row **once, on the home tab**. Every other tab opens straight onto its own content under its own heading. The weather banner moves to the Weather tab (it's about one place, and it doesn't say which). |
| **M2** | Header on the four fleet tabs | The header shows the **programme name**, cut off at 320 ("India O…", "1+1=11 Kharif · AFS"), not the page you're on. The other pages say "Insights · All India". | 10, 12 | The header always reads **page · scope**: "Machines · All India", "Map · Madhya Pradesh". The programme name moves to the PIN screen and the menu sheet. |
| **M3** | Field login home (Map) | A field user's question is "which of my machines didn't run?". Their first screen is an install banner, weather, the status card and four number tiles; at 320 the map doesn't appear until you scroll. **Nothing on it lists a machine or a person to call.** | 1, 2, 13 | A **"Didn't run yesterday"** list as their first tab: machine, operator, a Call button, and why it may not have run (breakdown, no operator, no season record). See **Decision A**. |
| **M4** | Machine detail sheet | Placeholder contacts are shown as data and **can be called**: operator name "7", territory "0 · 0", and **"Call 0"** buttons for the cluster officer and area manager. | 5 | Show a Call button only for a real 10-digit number. "0" reads "Not named on the sheet", the same rule the lists already follow. |
| **M5** | Machine detail sheet | The location is two raw numbers (`30.5233284, 75.4271634`) that can't be tapped. | 5 | An **"Open in Maps"** button. The IoT pages already do this. See **Decision D**. |
| **M6** | End of every phone page | Every page ends with the "Built with tokens…" line and nothing else, so it's a dead end. | 4 | One or two **next-step links** at the foot of each page, such as Machines → "Breakdowns only", Map → "Territory table", Territory → "Machines in this state". |
| **M7** | Search box (filter sheet) | It's a plain text field: no Search key on the keyboard, and the phone may capitalise or "correct" `upl_2806`. | 6 | Make it a search field with the Search key, and turn off auto-correct and auto-capitals. |
| **M8** | Insights (5,784px), Machines (5,424px) | Very long pages for one-thumb reading. Insights on the phone is ten screens. | 3, 7 | Insights on the phone: the first two cards open and the rest **collapsed to their headings**, tap to open. Machines already pages by 60, so keep it. |
| **M9** | "Raise a concern" button (field logins) | At 320 the floating button **covers the number cards** and list rows above the bottom bar. | 3 | Leave clear space at the bottom of the page so it never sits on content, or make it a labelled tab. See **Decision E**. |
| **M10** | Install offer | At 320 the three-line install card takes ~130px of the first screen on every visit until dismissed. | 1 | A **one-line** version ("Install the app · How"), with the steps behind the tap. |
| **M11** | Number row (admin) | 12 cards in a sideways row; the last ones (IoT, pinged) are seen by nobody. | 7 | On the phone show **4 cards** (Breakdown, Idle, Acres y'day, Deployed). The admin connectivity figures move to the Territory tab, where they already appear in each row. |

### Information hierarchy (I)

| # | Where | Problem | Rule broken | Fix |
|---|---|---|---|---|
| **I1** | Phone bar + More vs desktop menu | **Two different structures for the same pages.** Desktop (since today) is grouped Today · People · Season. The phone is Map, Territory, Machines, Weather + a flat "More". **Yesterday**, the daily recap, sits in Today on desktop but is buried 6th in More on the phone. | 8 | One structure for both. The phone's More sheet uses the **same three headings** and order as the desktop menu. |
| **I2** | More sheet | A **flat list of 8** under "More views". At 320 the last item (Cumulative) is below the sheet's fold. | 9, 11 | Rename it **"All pages"**, group it under Today / People / Season, and use tighter rows so it fits at 320. |
| **I3** | Field login bar | Field logins have 5 pages, so the bar shows 4 plus **a More sheet holding one item** (MP products). | 11 | When a role has **exactly 5 pages, show 5 tabs** and no More. |
| **I4** | Page names | **Abbreviations and mismatched names:** "AMs", "BMs", "FOs", "MP prod.", "Pending" on tabs. "Machines" tab vs "Machine locations" title. "Territory" tab vs "Territories" title. "1+1=11 Kharif · AFS" in the header. | 9, 10 | One name table used by tab, sheet, heading and browser title: **Area managers, Business managers, Field officers, Pending deployment, MP products, Machines, Territories**. Short forms only where the bar has no room, and then the same short form everywhere. |
| **I5** | "Yesterday" | **Three different things are called "Yesterday":** the Day switch (Yesterday / Today), the **Yesterday page** (daily recap) and Insights' **Yesterday mode**. | 9, 10 | Rename the page **"Daily recap"**. The Day switch and the Insights mode keep "Yesterday", since both mean the day. See **Decision C**. |
| **I6** | Leadership on the phone | Leadership's two real pages, **Cumulative and Products, are behind More**. Their bar is filled with fleet-ops tabs (Map, Machines, Weather, BMs) they rarely use. | 13 | **A bar per role**: leadership's first tabs are Cumulative, Products and Map. Field logins get Didn't run, Machines, Map, Business managers. See **Decision B**. |
| **I7** | The whole menu | The groups (Today / People / Season) and names are **my judgement, not tested with users.** | 14 | A small **tree test** with 6–8 real users (2 field, 2 AM/BM, 2 leaders, 2 ops) before the names are frozen. Kit in §9. |

## 6. Decisions needed (yours)

| | Decision | Options | Trade-off |
|---|---|---|---|
| **A** | Field login home (M3) | (a) **"Didn't run yesterday" list** as the first tab; (b) keep the Map | (a) answers their question in one screen, but changes the screen they know. The list itself is just a filter of data already on the Machines page, so there's no new data. |
| **B** | Different bars per role (I6) | (a) **Per-role bar order**; (b) the same order for everyone | (a) each role reaches its work in one tap. (b) is easier to explain on a call ("tap the third tab"), which matters if people help each other over the phone. |
| **C** | Rename the "Yesterday" page (I5) | (a) **"Daily recap"**; (b) keep "Yesterday" | Habit: people may already call it "Yesterday". |
| **D** | "Open in Maps" for a machine (M5) | (a) Add it; (b) leave coordinates as text | Tapping it sends the coordinates to Google Maps. The IoT pages already do this for technicians, so it's an existing precedent, but it's still a privacy call. |
| **E** | "Raise a concern" placement (M9) | (a) Keep the floating button, with space cleared under it; (b) **a header button**; (c) a bottom-bar tab | (a) is the smallest change. (b) is always visible but less prominent. (c) uses one of only 4–5 tab slots. |
| **F** | Run the tree test (I7) | Yes / no | About a week of calendar time and 8 people's ~10 minutes each, via a Google Form. Cheap, and it settles the names with evidence. |

## 7. Advice from the sources that does NOT fit here

- ***Mobile First*: "don't add your own Back button" and "don't fix menus to the bottom of the screen"** (2011). The
  console is installed as an app with no browser bar, so a bottom tab bar and Back handling are right. Both are kept.
- **Hamburger menus.** NN/g measured hidden menus as slower and less used. We keep a visible tab bar and make the
  overflow a *grouped* sheet, which is NN/g's "combo" pattern.
- **Breadcrumbs.** Our structure is two levels deep (page → expanded row), and NN/g says skip breadcrumbs on flat
  structures. The header's "page · scope" does the job.
- **Mega menus, footers, utility-link patterns.** These are for large websites, not a 13-page tool.
- **Camera, NFC, motion, the phone's own location ("machines near me").** No current job needs them. "Machines
  near me" could be a later idea for field officers, but it would need location permission.
- **A card sort.** NN/g recommends ~15 participants. With a small, fixed set of pages and roles, a tree test
  (§9) checks our groups with fewer people.
- **Gestures for navigation (swipe between tabs).** Gestures are shortcuts only. The bar stays the way to move.

## 8. Suggested order (small and safe first)

| Phase | Items | Size | Needs a decision? |
|---|---|---|---|
| **1. Quick, safe fixes** | M4 no "Call 0" · M7 search keyboard · M10 one-line install offer · I3 five tabs for five pages · M9 space under the concern button | Small | No (M9 uses option a) |
| **2. One structure, honest names** | I1 + I2 grouped "All pages" sheet · I4 one name table · M2 header = page · scope | Medium | No |
| **3. Content before navigation** | M1 status card on home only, other tabs open on their own content · M11 four cards on the phone · M6 next-step links | Medium | No |
| **4. Each role's home** | M3 Didn't-run list · I6 per-role bar · I5 rename | Medium | Decisions A, B, C |
| **5. Reading aids** | M8 Insights collapsed on the phone · M5 Open in Maps | Small–medium | Decision D for M5 |
| **6. Check with users** | I7 tree test, then a 5-person usability test on a real phone | No code | Decision F |

## 9. Tree-test kit (for I7)

**The tree** (plain text, no design), as a Google Form with one question per task:

```
Today
  Map
  Machines
  Weather
  Daily recap
People
  Territories
  Area managers
  Business managers
  Pending deployment
Season
  Insights
  Cumulative acres
  Products
  MP products
  Leaders
```

**Tasks** (written without the menu's words; the right answer is in brackets):
1. A machine in Vidisha didn't run yesterday. Where do you find who operates it? *(Machines)*
2. Is it likely to rain in Hisar tomorrow? *(Weather)*
3. How many acres did the whole programme do yesterday, and which state did the most? *(Daily recap)*
4. Which area manager's machines covered the most ground this season? *(Area managers)*
5. How many machines are still waiting to be handed over? *(Pending deployment)*
6. Are we behind last year's pace? *(Cumulative acres or Insights)*
7. Did UPL or SWAL products cover more acres? *(Products)*
8. Who is winning the operator contest? *(Leaders)*
9. Which Madhya Pradesh territory used the most herbicide? *(MP products)*
10. Which business manager has the most machines? *(Business managers)*

**How to run it:** send the form to 6–8 people (2 field, 2 AM/BM, 2 leaders, 2 ops). For each task they pick
the *one* place they'd look first, then rate how sure they are (1–5).

**How to read it** (NN/g's bands): a task where under 60% pick the right place has a naming or grouping problem;
over 80% is good. If answers for one task split between two places, that page may need to live in both groups, or
its name needs to say more.

## 10. Decisions taken (22 Oct 2026)

A Didn't-run list for field logins · B a bar per role · C rename to "Daily recap" · D Open in Maps: **all yes.**
E (concern button): **(a)**, kept floating with space cleared under it. F (tree test): not decided; the kit is above.

## 11. What was built (22 Oct 2026)

| # | What changed on the phone | Checked |
|---|---|---|
| M1 | The status card and number cards appear **only on your home tab**. The weather banner appears **only on Weather**, now labelled "Spray window today · All India". Every other tab opens on its own content. | Admin 320 |
| M2 | The header names **the page** ("Machines"), with the scope and programme underneath ("All India · 1+1=11 Kharif · AFS"). | Admin, field, IoT |
| M3 | **Didn't run** is the field logins' first tab and landing page. It lists their machines that didn't run, grouped by what the sheet says (no reason first, then breakdown, no operator, never sprayed), each with a **Call** button. Its count equals Idle + Breakdown (258 = 258 + 0 for MP UPL). | Field 320, desktop |
| M4 | **No Call button for a non-number.** "0" contacts read "No number on sheet" or "Not named on sheet". A machine whose "number" on the sheet is a date (UPL_2806) gets no Call button. | Admin 320 |
| M5 | **Open in Maps** on the machine sheet (desktop and phone). | Admin 320 |
| M6 | A **Next** row at the foot of each page, for example Machines → "Breakdowns only", "Territories". | Admin 320 |
| M7 | The search box shows the **Search key** and doesn't auto-correct `UPL_2806`. | Code |
| M8 | Insights on the phone: the hero and "What changed" stay open, and **six sections fold** to a named row. The page went from 5,784px to 2,526px. | Admin 320 |
| M9 | Space is cleared under "Raise a concern" at the end of each page. While scrolling, it can still sit over a card's Call button (that comes with option a). | Field 320 |
| M10 | The install offer is **one line**, with the steps behind **How**. | Admin 320 |
| M11 | The phone shows **4 number cards** (Breakdown, Idle, Acres y'day, Deployed). | Admin, field |
| I1–I2 | The **"All pages"** sheet (was "More views") lists every page in the desktop menu's groups: Today · People · Season, two to a row, and fits a 320 × 560 phone. | Admin, field, leadership |
| I3 | Five pages means **five tabs**. Non-MP field logins no longer get a one-item More. | Code (MP field has 6 pages) |
| I4 | **One name table.** Full names in the sheet, page headings and browser titles (Area managers, Pending deployment, Cumulative acres…). Short forms on the bar and rail, the same in both. | All |
| I5 | The Yesterday page is now **Daily recap** (`#/daily-recap`). | Admin |
| I6 | **A bar per role:** admin Map · Machines · Weather · Recap; leadership Cumulative · Products · Map · Machines (still lands on the Map); field Didn't run · Machines · Map · BMs. | All three |
| — | Logging in with a **different PIN** now starts from that login's home and its own scope (the MP field login's state used to carry over to the next login). | Field → leadership → admin |

No console errors and no sideways scrolling at 320 or 390 for admin, MP UPL, leadership and an IoT technician.
**Not checked:** Wheat logins, landscape phones, and a real phone on a slow network.
