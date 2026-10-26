# Bayer partner page — design review (26 Oct 2026)

Page: https://din8shh.github.io/MP-Ops-Console/bayer/ (`bayer/index.html`). One login (Bayer, PIN 3906), two tabs.
Checked at 1280 × 800, 390 × 664 and 320 × 560 against the dashboard rules (DataCamp, Pencil & Paper), Mobile First
and the NN/g navigation rules.

## Who opens it and what it must answer
Bayer's team, a partner outside UPL, mostly on a phone, a few times a week, during the machine handover.
1. **How far along is the handover?** How many of the machines we asked for have a UPL machine, and how many are deployed / handed over?
2. **Where are machines still missing?** Which state and district.
3. **Who do I ring about a location?** Its field officer and CCM.

Dashboard type: **tactical progress tracker** (progress against a fixed request of 75), with an operational list below it.

## What already works (keep)
- Self-contained page, only Bayer's PIN in its source, reads only Bayer's sheet.
- Status is a word and a colour ("Machine assigned" / "Awaiting a machine"), not colour alone.
- Loading, error (with Try again) and no-match states exist.
- Blank sheet columns (CO, AM, deployment, handover) stay hidden until they are filled.
- Phone: no sideways scroll, 16px inputs, call buttons.

## Problems
| # | Where | Problem | Fix |
|---|---|---|---|
| B1 | Top of Locations | Four equal tiles; nothing says "good or not" first. "Deployed 0" reads as a failure when deployment simply has not started. | One **status card** first: "39 of 75 machines assigned", a progress bar, and the handover **stages** (Requested → Machine assigned → Deployed → Handed over) with "not started yet" where a stage is empty. |
| B2 | Whole page | No state split, though the request is two states (HR 30, PB 45) that are moving at different speeds. | A **by-state** pair of cards under the status card. |
| B3 | By district | 20 rows sorted by state, so the districts still waiting are scattered; the bars sit far right, unlabelled, and are not sorted. | Rename **"Where machines are still needed"**, sort by machines awaiting, a labelled stacked bar beside each name, finished districts last with "✓ all assigned". Tapping a district filters the list (drill-in). |
| B4 | Locations | 75 tall cards on desktop; every person's number is an orange pill, so the screen is a wall of orange. | Desktop: a **table** (Location · Status · Machine · Retailer · Field officer · CCM). Phone: compact cards. Numbers in plain ink with a Call button on the phone. |
| B5 | Header | "Checked 1:25 pm" only; no scope, no line on what the page is for. | Context line: "Haryana & Punjab · 75 machines requested", a one-line purpose, and "Updated 1:25 pm · refreshes every 10 min". |
| B6 | Filters | No "clear" and no count of active filters. | "Showing 28 of 75 · Clear filters". |
| B7 | Field officers | "No app access" printed 47 times, which is noise; nothing links an FO to the places he covers. | App access becomes one stat; each FO row lists **the locations he covers** (joined on mobile with the machine tab). |
| B8 | Whole page | No export (dashboard rule). | **Download CSV** of the list as currently filtered. |
| B9 | Navigation | Tabs have no address or own browser-tab title; Back leaves the page. | `#/deployment` and `#/field-officers`, tab title per tab, `aria-current`. |
| B10 | Phone | District table (20 rows) comes before the list; long scroll before any location. | Phone order: status → states → top districts still waiting (5, "show all") → list. |

## Decisions needed
None blocking. One to note: phone numbers of FOs/CCMs are shown in full. They are Bayer's own people from Bayer's own
sheet, so masking adds friction without protecting anything; left unmasked.

## Advice that does not fit here
- Trend charts / period comparison (dashboard rule "every number has a comparison"): the sheet has no history, only the
  current state. The comparison used is **against the request** (75), which is the target this programme has.
- Personalisation and drag-to-rearrange: one partner, one page; not worth it.
- Tree test of the menu: two tabs, nothing to test.

## Order
All ten are built together (asked for as "create as per dashboard standards"). Status: **built 26 Oct 2026**.
