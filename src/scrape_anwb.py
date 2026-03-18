import os
import csv
import json
import unicodedata
from datetime import datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright

URL = "https://www.anwb.nl/vakantie/reisvoorbereiding/brandstofprijzen-europa"

def get_today_date():
    return datetime.now(ZoneInfo("Europe/Amsterdam")).strftime("%Y-%m-%d")

def get_last_date_from_csv(path):
    if not os.path.isfile(path):
        return None
    try:
        with open(path, "rb") as f:
            f.seek(-2, os.SEEK_END)
            while f.read(1) != b"\n":
                f.seek(-2, os.SEEK_CUR)
            last_line = f.readline().decode("utf-8")
        return last_line.split(",")[0].strip()
    except:
        return None

def clean_price(v):
    return v.replace(",", ".").strip()

def normalize_land(land):
    land = unicodedata.normalize("NFKD", land)
    land = "".join(c for c in land if not unicodedata.combining(c))
    return land.strip().lower()

def get_csv_path(land):
    base = os.path.dirname(__file__)
    return os.path.join(base, "..", "docs", "data", f"{land}.csv")

def generate_json(countries):
    base = os.path.join(os.path.dirname(__file__), "..", "docs", "data")
    output = {}

    for land in countries:
        path = os.path.join(base, f"{land}.csv")
        if not os.path.isfile(path):
            continue

        with open(path, "r", encoding="utf-8") as f:
            rows = [r for r in csv.reader(f) if r]

        output[land] = {
            "header": rows[0],
            "data": rows[1:]
        }

    with open(os.path.join(base, "all.json"), "w") as f:
        json.dump(output, f)

def scrape():
    today = get_today_date()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(URL)
        page.wait_for_selector("table tr")

        rows = page.query_selector_all("table tr")

        header = None
        countries = {}

        for row in rows:
            cols = [c.inner_text().strip() for c in row.query_selector_all("th, td")]
            if not cols:
                continue

            if header is None:
                header = cols[1:]
                continue

            land_raw = cols[0]
            land = normalize_land(land_raw)
            values = [clean_price(v) for v in cols[1:]]

            countries[land] = {"values": values}

    for land, info in countries.items():
        path = get_csv_path(land)
        last = get_last_date_from_csv(path)

        if last == today:
            continue

        rows_out = []
        if not os.path.isfile(path):
            rows_out.append(["Datum"] + header)

        rows_out.append([today] + info["values"])

        os.makedirs(os.path.dirname(path), exist_ok=True)

        with open(path, "a", newline="\n", encoding="utf-8") as f:
            csv.writer(f).writerows(rows_out)

    generate_json(countries.keys())

if __name__ == "__main__":
    scrape()
