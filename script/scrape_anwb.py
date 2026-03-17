import requests
from bs4 import BeautifulSoup
import csv
from datetime import datetime
import os

URL = "https://www.anwb.nl/vakantie/reisvoorbereiding/brandstofprijzen-europa"

# Pad naar data-folder
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "brandstofprijzen.csv")

def scrape_anwb():
    response = requests.get(URL, timeout=10)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Vind de eerste tabel op de pagina (brandstofprijstabel)
    table = soup.find("table")
    if not table:
        raise ValueError("Geen tabel gevonden op ANWB pagina")

    rows = table.find_all("tr")

    data = []
    for row in rows:
        cols = [col.get_text(strip=True) for col in row.find_all(["td", "th"])]
        if cols:
            data.append(cols)

    # CSV schrijven
    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(data)

    print(f"{len(data)} rijen opgeslagen in {OUTPUT_FILE} op {datetime.now()}")

if __name__ == "__main__":
    scrape_anwb()