import os
import csv
import unicodedata
from datetime import datetime
from playwright.sync_api import sync_playwright

URL = "https://www.anwb.nl/vakantie/reisvoorbereiding/brandstofprijzen-europa"

# Doellanden (genormaliseerd, zonder accenten)
LANDEN = ["nederland", "duitsland", "belgie", "frankrijk", "zwitserland", "luxemburg"]

def normalize(s: str) -> str:
    """Verwijder accenten en zet lowercase."""
    s = s.strip().lower()
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if not unicodedata.combining(c))

def get_csv_path(land):
    base = os.path.dirname(__file__)
    safe_name = land.replace(" ", "_")
    return os.path.join(base, "..", "data", f"{safe_name}.csv")

def scrape_anwb():

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Pagina laden…")
        page.goto(URL, timeout=60000)

        page.wait_for_selector("table", timeout=20000)

        # ---- DATUM (“Laatst bijgewerkt:”) ----
        try:
            updated_element = page.get_by_text("Laatst bijgewerkt")
            updated_text = updated_element.inner_text().strip()
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

            # Header
            if header is None:
                header = cols
                continue

            # Normaliseer het land zoals het op ANWB staat
            landnaam_norm = normalize(cols[0])

            if landnaam_norm in land_data:
                print(f"Gevonden land: {landnaam_norm}")
                land_data[landnaam_norm] = cols

        browser.close()

    # ---- OPSLAG PER LAND ----
    for land, row in land_data.items():

        if row is None:
            print(f"⚠️  Geen data gevonden voor {land}")
            continue

        csv_path = get_csv_path(land)
        file_exists = os.path.isfile(csv_path)
        last_date = None

        # Bestand bestaat → lees laatste datum
        if file_exists:
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = list(csv.reader(f))
                if len(reader) > 1:
                    last_date = reader[-1][0]

        # Als de datum al bestaat → skip
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
