# Wheat machine sheet — data audit (2026-10-26)

Sheet `1l7mMhlFUj-URefRDWUlDicaponlyLCGAZw3hNyQTPsg`, tab "a" (gid 1847044238): 413 rows, 410 machines.
Every item below is a fault **in the sheet**. The console works around each one (noted in brackets) so the
dashboard stays readable and the totals still match, but the fix belongs at the source.

## Must fix

1. **49 rows are shifted one column to the right.** A party or village cell containing a comma
   (e.g. "Samana, Patiala", "Rakesh Beej Bhandar, Mirchpur") is split across two cells. The rest of
   the retailer block moves one cell right, so:
   - `handover_status` holds a date (`2026-12-31`) instead of Yes / No;
   - `organisation` is lost.

   The export that writes tab "a" must quote or strip commas.
   [Console: re-joins the two halves and counts these rows as *not handed over*. It takes the company from
   the row's TM where that TM sells for one company only (34 rows); the other 15 show as Open.]
2. **Three machines are listed twice:** UPL_3036, UPL_3040, UPL_3045 (identical rows). [Console: first row used.]
3. **Two machines are handed over but have no retailer:** UPL_3032, UPL_2874.
4. **Territory "Shimla" (Himachal Pradesh) on two machines:** UPL_2600, UPL_2801. Their village is
   Chamkaur Sahib, Ropar (Punjab), and they ping from Punjab. The territory should be Ropar / Rupnagar.
   [Console: placed in Punjab by location; territory still reads "Shimla".]
5. **UPL_3045 is in territory Amritsar but pings from Rajasthan** (24.64 N, 76.32 E).

## Should fix

6. **64 machines have no territory and 55 have no retailer** (territory / party `0`). Ten of them sit
   in Rajasthan (around Tonk / Sawai Madhopur), which is why Rajasthan appears on the Wheat dashboard.
   [Console: placed by last ping.]
7. **Nine FO numbers have 9 digits** (`954107470` on UPL_2457, UPL_2721, UPL_2495, UPL_2480, UPL_2731 …;
   `750837809` on UPL_2956). [Console: no Call button for them.]
8. **Role tags typed into names:** "Sunil_Haryana_AM", "Sampat AM", "Dushyant Saxena SH",
   "Rajesh Kumar FO" (a CI). [Console: shows "Sunil", "Sampat", "Rajesh Kumar".]
9. **One FO number, two spellings:** "Lakhwinder singh" / "Lkhwinder Singh", "Megh Singh" / "Megh Singh/Arun Kumar".
   [Console: merged on the number.]
10. **Three machines have no location** (lat/long 0): UPL_2528, UPL_2844, UPL_2575. [Console: not on the map.]
11. **Planned machines don't match the machines listed** for 27 retailers (e.g. Khalsa Kheti Store planned 2,
    listed 3; Naveen Pesticides planned 8, listed 7).
12. **151 rows have no ops team** (CI / AM / SH / ops_state blank). They show under "Unassigned" on the AM page.
13. **No breakdown column.** [Console: the Breakdown tile is hidden for Wheat rather than reading 0.]

## For information

- 45 machines are handed over with no operator.
- UPL_2600 shows 2.4 IoT acres yesterday with 0 reported acres.
- UPL_2425's MTD scanned acres (33.8) exceed its season scanned acres (15).
- 38 rows last pinged before 1 Oct 2026, one as far back as April 2024.
- "Hissar" and "Hisar" are both used; "Sonepat" is spelled "Sonipat" on the map. [Console: merged.]
