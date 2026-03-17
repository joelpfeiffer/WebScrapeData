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

        # Wacht tot de tabel geladen is
        page.wait_for_selector("table", timeout=20000)

        print("Tabel gevonden, uitlezen...")
        rows = page.query_selector_all("table tr")

        today = datetime.now().strftime("%Y-%m-%d")

        data = []
        is_header = True

        for row in rows:
            cols = [c.inner_text().strip() for c in row.query_selector_all("th, td")]

            if not cols:
                continue

            if is_header:
                # Voor de header -> 'Datum' kolom toevoegen
                data.append(["Datum"] + cols)
                is_header = False
            else:
                # Voor data-rijen -> datum toevoegen
                data.append([today] + cols)

        browser.close()

    # Opslaan naar CSV
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(data)

    print(f"✔️ {len(data)} rijen opgeslagen in {OUTPUT_FILE}")

if __name__ == "__main__":
    scrape_anwb()
