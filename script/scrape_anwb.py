import os
import csv
from datetime import datetime
from playwright.sync_api import sync_playwright

URL = "https://www.anwb.nl/vakantie/reisvoorbereiding/brandstofprijzen-europa"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "brandstofprijzen.csv")

def scrape_anwb():

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Pagina laden...")
        page.goto(URL, timeout=60000)

        # Wacht tot de tabel aanwezig is
        page.wait_for_selector("table", timeout=20000)

        # ---- DATUM SCRAPEN ----
        try:
            updated_element = page.get_by_text("Laatst bijgewerkt")
            updated_text = updated_element.inner_text().strip()
            # "Laatst bijgewerkt: 14 maart 2026"
            updated_date = updated_text.split(":")[1].strip()
        except:
            updated_date = datetime.now().strftime("%Y-%m-%d")

        print(f"Scrape-datum gebruikt: {updated_date}")

        # ---- TABEL SCRAPEN ----
        rows = page.query_selector_all("table tr")

        header = None
        nederland_row = None

        for row in rows:
            cols = [c.inner_text().strip() for c in row.query_selector_all("th, td")]

            if not cols:
                continue

            # Eerste rij = header
            if header is None:
                header = cols
                continue

            # Zoek expliciet naar "Nederland"
            if cols[0].lower() == "nederland":
                nederland_row = cols
                break

        browser.close()

    # ---- CSV BOUWEN ----
    if header is None or nederland_row is None:
        raise ValueError("Kon Nederland of header niet vinden in ANWB-tabel!")

    output_data = []
    output_data.append(["Datum (ANWB)"] + header)
    output_data.append([updated_date] + nederland_row)

    # ---- OPSLAAN ----
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(output_data)

    print(f"✔️ Nederland succesvol opgeslagen in {OUTPUT_FILE}")

if __name__ == "__main__":
    scrape_anwb()
