import os
import csv
import unicodedata
from datetime import datetime
from playwright.sync_api import sync_playwright

URL = "https://www.anwb.nl/vakantie/reisvoorbereiding/brandstofprijzen-europa"

LANDEN = ["nederland", "duitsland", "belgie", "frankrijk", "luxemburg"]

def normalize_text(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()

def normalize_price(value: str) -> str:
    stripped = value.replace(".", "").replace(",", "")
    if stripped.isdigit():
        return value.replace(".", ",")
    return value

def get_csv_path(land):
    # BASE = map waarin dit script staat (script/)
    base = os.path.dirname(__file__)
    safe = land.replace(" ", "_")
    
    # SCHRIJVEN NAAR docs/data/<land>.csv
    return os.path.join(base, "..", "docs", "data", f"{safe}.csv")

def scrape_anwb():

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Pagina laden…")
        page.goto(URL, timeout=60000)
        page.wait_for_selector("table", timeout=20000)

        # --- Laatst bijgewerkt datum ---
        try:
            updated = page.get_by_text("Laatst bijgewerkt")
            updated_text = updated.inner_text().strip()
            updated_date = updated_text.split(":")[1].strip()
        except:
            updated_date = datetime.now().strftime("%Y-%m-%d")

        print(f"ANWB-datum: {updated_date}")

        # --- Tabel scrapen ---
        rows = page.query_selector_all("table tr")

        header = None
        land_data = {land: None for land in LANDEN}

        for row in rows:
            cols = [c.inner_text().strip() for c in row.query_selector_all("th, td")]
            if not cols:
                continue

            if header is None:
                header = cols[1:]  # verwijder "Land"
                continue

            landnaam_norm = normalize_text(cols[0])

            if landnaam_norm in land_data:
                cleaned = [normalize_price(v) for v in cols[1:]]
                land_data[landnaam_norm] = cleaned
                print(f"Gevonden: {landnaam_norm}")

        browser.close()

    # --- Opslag per land ---
    for land, row in land_data.items():

        if row is None:
            print(f"⚠️ Geen data gevonden voor {land}")
            continue

        csv_path = get_csv_path(land)
        file_exists = os.path.isfile(csv_path)
        last_date = None

        if file_exists:
            with open(csv_path, "r", encoding="utf-8") as f:
                lines = list(csv.reader(f))
                if len(lines) > 1:
                    last_date = lines[-1][0]

        if last_date == updated_date:
            print(f"{land}: datum {updated_date} bestaat al → skip")
            continue

        rows_to_write = []

        if not file_exists:
            rows_to_write.append(["Datum (ANWB)"] + header)

        rows_to_write.append([updated_date] + row)

        os.makedirs(os.path.dirname(csv_path), exist_ok=True)

        with open(csv_path, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerows(rows_to_write)

        print(f"✔️ Nieuwe rij toegevoegd voor {land} ({updated_date})")

if __name__ == "__main__":
    scrape_anwb()
