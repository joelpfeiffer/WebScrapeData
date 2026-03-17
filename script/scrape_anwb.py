import os
import csv
import unicodedata
from datetime import datetime
from playwright.sync_api import sync_playwright

URL = "https://www.anwb.nl/vakantie/reisvoorbereiding/brandstofprijzen-europa"

LANDEN = ["nederland", "duitsland", "belgie", "frankrijk", "luxemburg"]

def normalize_text(s: str) -> str:
    """Verwijder accenten + lowercase."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()

def normalize_price(value: str) -> str:
    """Zet komma in prijzen om naar punt."""
    if value.replace(",", "").replace(".", "").isdigit():  
        return value.replace(",", ".")
    return value

def get_csv_path(land):
    base = os.path.dirname(__file__)
    safe = land.replace(" ", "_")
    return os.path.join(base, "..", "data", f"{safe}.csv")

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
        land_data = {land: None for land in LANDEN}

        for row in rows:
            cols = [c.inner_text().strip() for c in row.query_selector_all("th, td")]
            if not cols:
                continue

            if header is None:
                header = cols
                continue

            landnaam_norm = normalize_text(cols[0])

            if landnaam_norm in land_data:
                # Prijzen transformeren: komma → punt
                cleaned = [normalize_price(v) for v in cols]
                land_data[landnaam_norm] = cleaned
                print(f"Gevonden land: {landnaam_norm}")

        browser.close()

    # ---- OPSLAG ----
    for land, row in land_data.items():
        if row is None:
            print(f"⚠️ Geen data gevonden voor {land}")
            continue

        csv_path = get_csv_path(land)
        last_date = None
        file_exists = os.path.isfile(csv_path)

        if file_exists:
            with open(csv_path, "r", encoding="utf-8") as f:
                rows = list(csv.reader(f))
                if len(rows) > 1:
                    last_date = rows[-1][0]

        if last_date == updated_date:
            print(f"{land}: datum {updated_date} bestaat al → skip")
            continue

        output_rows = []

        if not file_exists:
            output_rows.append(["Datum (ANWB)"] + header)

        output_rows.append([updated_date] + row)

        os.makedirs(os.path.dirname(csv_path), exist_ok=True)

        with open(csv_path, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerows(output_rows)

        print(f"✔️ Nieuwe rij toegevoegd voor {land} ({updated_date})")

if __name__ == "__main__":
    scrape_anwb()
