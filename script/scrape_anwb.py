import os
import csv
import unicodedata
from datetime import datetime
from playwright.sync_api import sync_playwright

URL = "https://www.anwb.nl/vakantie/reisvoorbereiding/brandstofprijzen-europa"

def normalize_price(value: str) -> str:
    """Zet een decimale punt naar een komma voor Europese notatie."""
    stripped = value.replace(".", "").replace(",", "")
    if stripped.isdigit():
        return value.replace(".", ",")
    return value

def normalize_land(s: str) -> str:
    """Normaliseer landnaam voor matching."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()

def get_csv_path(land):
    """Opslaan in docs/data/<land>.csv"""
    safe = land.replace(" ", "_")
    base = os.path.dirname(__file__)
    return os.path.join(base, "..", "docs", "data", f"{safe}.csv")

def scrape_anwb():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Pagina laden…")
        page.goto(URL, timeout=60000)
        page.wait_for_selector("table", timeout=20000)

        # ---- DATUM SCRAPEN ----
        try:
            updated = page.get_by_text("Laatst bijgewerkt")
            updated_text = updated.inner_text().strip()
            updated_date = updated_text.split(":")[1].strip()
        except:
            updated_date = datetime.now().strftime("%Y-%m-%d")

        print(f"ANWB-datum: {updated_date}")

        # ---- TABEL SCRAPEN ----
        rows = page.query_selector_all("table tr")

        header = None
        all_countries = {}  # land → data

        for row in rows:
            cols = [c.inner_text().strip() for c in row.query_selector_all("th, td")]
            if not cols:
                continue

            # Header = eerste rij → verwijder landkolom
            if header is None:
                header = cols[1:]
                continue

            land_raw = cols[0]
            land_norm = normalize_land(land_raw)

            cleaned = [normalize_price(v) for v in cols[1:]]

            all_countries[land_norm] = {
                "display": land_raw,
                "values": cleaned
            }

            print(f"Gevonden land: {land_raw}")

        browser.close()

    # ---- OPSLAG PER LAND ----
    for land_norm, info in all_countries.items():

        csv_path = get_csv_path(land_norm)
        file_exists = os.path.isfile(csv_path)
        last_date = None

        # Lees laatste datum
        if file_exists:
            with open(csv_path, "r", encoding="utf-8") as f:
                lines = list(csv.reader(f))
                if len(lines) > 1:
                    last_date = lines[-1][0]

        # Skip als datum al bestaat
        if last_date == updated_date:
            print(f"{info['display']}: datum {updated_date} bestaat al → skip")
            continue

        rows_to_write = []

        # Eerste keer header schrijven
        if not file_exists:
            rows_to_write.append(["Datum (ANWB)"] + header)

        # Nieuwe rij
        rows_to_write.append([updated_date] + info["values"])

        # Opslaan
        os.makedirs(os.path.dirname(csv_path), exist_ok=True)
        with open(csv_path, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerows(rows_to_write)

        print(f"✔ Nieuwe rij toegevoegd voor {info['display']} ({updated_date})")

if __name__ == "__main__":
    scrape_anwb()
