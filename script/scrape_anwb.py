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

        # Wacht tot de pagina geladen is
        page.wait_for_selector("table", timeout=20000)

        # ---- LAATST BIJGEWERKT DATUM SCRAPEN ----
        try:
            updated_element = page.get_by_text("Laatst bijgewerkt")
            updated_text = updated_element.inner_text().strip()
            # Tekst is bv: "Laatst bijgewerkt: 14 maart 2026"
            updated_date = updated_text.split(":")[1].strip()
        except:
            print("Geen 'Laatst bijgewerkt' datum gevonden, gebruik systeemdatum")
            updated_date = datetime.now().strftime("%Y-%m-%d")

        print(f"Scrape-datum gebruikt: {updated_date}")

        # ---- TABEL SCRAPEN ----
        rows = page.query_selector_all("table tr")

        data = []
        is_header = True

        for row in rows:
            cols = [c.inner_text().strip() for c in row.query_selector_all("th, td")]
            if not cols:
                continue

            if is_header:
                data.append(["Datum (ANWB)"] + cols)
                is_header = False
            else:
                data.append([updated_date] + cols)

        browser.close()

    # ---- CSV OPSLAAN ----
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(data)

    print(f"✔️ CSV opgeslagen met {len(data)} rijen en datum {updated_date}")

if __name__ == "__main__":
    scrape_anwb()
