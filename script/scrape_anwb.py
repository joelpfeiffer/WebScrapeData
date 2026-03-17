import os
import csv
import unicodedata
from datetime import datetime
from playwright.sync_api import sync_playwright

URL = "https://www.anwb.nl/vakantie/reisvoorbereiding/brandstofprijzen-europa"

def normalize_price(value: str) -> str:
    """Zet punt naar komma voor Europese notatie."""
    stripped = value.replace(".", "").replace(",", "")
    if stripped.isdigit():
        return value.replace(".", ",")
    return value

def normalize_land(s: str) -> str:
    """Normaliseer landnaam (lowercase + accenten weg)."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()

def get_csv_path(land):
    safe = land.replace(" ", "_")
    base = os.path.dirname(__file__)
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
        all_countries = {}  # land → kolommen

        for row in rows:
            cols = [c.inner_text().strip() for c in row.query_selector_all("th, td")]
            if not cols:
                continue

            # Header opslaan (verwijder 'Land')
            if header is None:
                header = cols[1:]
                continue

            # Normaliseer landnaam
            landnaam_raw = cols[0]
            landnaam_norm = normalize_land(landnaam_raw)

            # Prijsvelden opschonen
            cleaned = [normalize_price(v) for v in cols[1:]]  # zonder land

            # Opslaan
            all_countries[landnaam_norm] = {
                "display": landnaam_raw,
                "values": cleaned
            }

            print(f"Gevonden land: {landnaam_raw}")

        browser.close()

    # ---- OPSLAG VAN ELK LAND APART ----
    for land_norm, info in all_countries.items():

        csv_path = get_csv_path(land_norm)
        file_exists = os.path.isfile(csv_path)
        last_date = None

        # Laatste datum uitlezen
        if file_exists:
            with open(csv_path, "r", encoding="utf-8") as f:
                lines = list(csv.reader(f))
                if len(lines) > 1:
                    last_date = lines[-1][0]

        # Datum dubbel? Skippen
        if last_date == updated_date:
            print(f"{info['display']}: datum {updated_date} bestaat al → skip")
            continue

        rows_to_write = []

        # Header (datum + prijzen)
        if not file_exists:
            rows_to_write.append(["Datum (ANWB)"] + header)

        # Nieuw record
        rows_to_write.append([updated_date] + info["values"])

        os.makedirs(os.path.dirname(csv_path), exist_ok=True)

        with open(csv_path, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerows(rows_to_write)

        print(f"✔️ Nieuwe rij toegevoegd voor {info['display']} ({updated_date})")

if __name__ == "__main__":
    scrape_anwb()
