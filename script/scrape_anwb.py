import os
import csv
from datetime import datetime
from playwright.sync_api import sync_playwright

URL = "https://www.anwb.nl/vakantie/reisvoorbereiding/brandstofprijzen-europa"

# De landen die we willen scrapen (toegevoegd: luxemburg)
LANDEN = ["nederland", "duitsland", "belgië", "frankrijk", "zwitserland", "luxemburg"]

# Bestandsnamen voor elk land
def get_csv_path(land):
    base = os.path.dirname(__file__)
    return os.path.join(base, "..", "data", f"{land}.csv")

def scrape_anwb():

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Pagina laden...")
        page.goto(URL, timeout=60000)

        # Wacht op de tabel
        page.wait_for_selector("table", timeout=20000)

        # ---- DATUM SCRAPEN ("Laatst bijgewerkt:") ----
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

            # Check landnaam in kolom 0
            landnaam = cols[0].lower()

            if landnaam in land_data:
                land_data[landnaam] = cols

        browser.close()

    # ---- OPSLAG PER LAND ----
    for land, row in land_data.items():
        if row is None:
            print(f"Waarschuwing: geen data gevonden voor {land}")
            continue

        csv_path = get_csv_path(land)
        file_exists = os.path.isfile(csv_path)
        last_date = None

        # Als bestand bestaat → laatste datum lezen
        if file_exists:
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = list(csv.reader(f))
                if len(reader) > 1:
                    last_date = reader[-1][0]

        # Als datum gelijk is → overslaan
        if last_date == updated_date:
            print(f"{land}: datum {updated_date} bestaat al → skip")
            continue

        output_rows = []

        # Eerste keer → header toevoegen
        if not file_exists:
            output_rows.append(["Datum (ANWB)"] + header)

        # Nieuwe rij
        output_rows.append([updated_date] + row)

        # Wegschrijven
        os.makedirs(os.path.dirname(csv_path), exist_ok=True)
        with open(csv_path, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerows(output_rows)

        print(f"{land}: nieuwe rij toegevoegd ({updated_date})")

if __name__ == "__main__":
    scrape_anwb()
