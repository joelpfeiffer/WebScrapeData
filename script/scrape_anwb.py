import requests
from bs4 import BeautifulSoup
import csv
import os
from datetime import datetime

URL = "https://www.anwb.nl/vakantie/reisvoorbereiding/brandstofprijzen-europa"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "brandstofprijzen.csv")

def scrape_anwb():

    # User-Agent om blokkeerde content te voorkomen
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    }

    response = requests.get(URL, headers=headers, timeout=10)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Vind de eerste tabel
    table = soup.find("table")

    if not table:
        print("DEBUG PAGE OUTPUT:")
        print(response.text[:1000])  # Laat de eerste 1000 chars zien in logs
        raise ValueError("Geen tabel gevonden op ANWB pagina")

    rows = table.find_all("tr")

    data = []
    for row in rows:
        cols = [col.get_text(strip=True) for col in row.find_all(["td", "th"])]
        if cols:
            data.append(cols)

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(data)

    print(f"{len(data)} rijen opgeslagen in {OUTPUT_FILE} op {datetime.now()}")

if __name__ == "__main__":
    scrape_anwb()
