import os
import csv
import unicodedata
from datetime import datetime
from playwright.sync_api import sync_playwright

URL = "https://www.anwb.nl/vakantie/reisvoorbereiding/brandstofprijzen-europa"

def clean_price(value: str) -> str:
    """Maak ANWB brandstofprijs schoon in Europese notatie."""
    if not value:
        return ""

    # remove quotes, spaces
    v = value.replace('"', '').strip()

    # keep only digits, comma, dot
    v = ''.join(c for c in v if c.isdigit() or c in ",.")

    # Case: "2,047" → 2,047 (NOT 2047)
    if "," in v and "." in v:
        # comma is decimal separator
        if v.rfind(",") > v.rfind("."):
            v = v.replace(".", "")
        else:
            v = v.replace(",", "")

    # Case: 2.047 (dot decimal) → 2,047
    if "." in v and "," not in v:
        v = v.replace(".", ",")

    # Too many commas → fix
    parts = v.split(",")
    if len(parts) > 2:
        v = parts[0] + "," + "".join(parts[1:])

    return v

def normalize_land(land: str) -> str:
    land = unicodedata.normalize("NFKD", land)
    land = "".join(c for c in land if not unicodedata.combining(c))
    return land.strip().lower()

def get_csv_path(land: str) -> str:
    safe = land.replace(" ", "_")
    base = os.path.dirname(__file__)
    return os.path.join(base, "..", "docs", "data", f"{safe}.csv")

def scrape_anwb():

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("▶ Pagina laden…")
        page.goto(URL, timeout=60000)
        page.wait_for_selector("table", timeout=30000)

        # Datum ophalen
        try:
            updated_el = page.get_by_text("Laatst bijgewerkt")
            updated_text = updated_el.inner_text().strip()
            updated_date = updated_text.split(":")[1].strip()
        except:
            updated_date = datetime.now().strftime("%Y-%m-%d")

        print(f"▶ ANWB datum: {updated_date}")

        rows = page.query_selector_all("table tr")

        header = None
        all_countries = {}

        for row in rows:
            cols = [c.inner_text().strip() for c in row.query_selector_all("th, td")]
            if not cols:
                continue

            # Header
            if header is None:
                header = cols[1:]   # remove land column
                continue

            land_raw = cols[0]
            land_norm = normalize_land(land_raw)
            cleaned = [clean_price(v) for v in cols[1:]]

            all_countries[land_norm] = {
                "display": land_raw,
                "values": cleaned
            }

        browser.close()

    # CSV opslag
    for land_norm, info in all_countries.items():

        csv_path = get_csv_path(land_norm)
        file_exists = os.path.isfile(csv_path)
        last_date = None

        if file_exists:
            with open(csv_path, "r", encoding="utf-8") as f:
                lines = list(csv.reader(f))
                if len(lines) > 1:
                    last_date = lines[-1][0]

        if last_date == updated_date:
            print(f"⏭ Skip: {info['display']} heeft al datum {updated_date}")
            continue

        rows_out = []

        if not file_exists:
            rows_out.append(["Datum (ANWB)"] + header)

        rows_out.append([updated_date] + info["values"])

        os.makedirs(os.path.dirname(csv_path), exist_ok=True)

        with open(csv_path, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerows(rows_out)

        print(f"✔ Toegevoegd: {info['display']} ({updated_date})")

if __name__ == "__main__":
    scrape_anwb()
