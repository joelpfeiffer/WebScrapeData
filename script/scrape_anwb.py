import os
import csv
import unicodedata
from datetime import datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright

URL = "https://www.anwb.nl/vakantie/reisvoorbereiding/brandstofprijzen-europa"


def get_today_date() -> str:
    now = datetime.now(ZoneInfo("Europe/Amsterdam"))
    return now.strftime("%Y-%m-%d")


def clean_price(value: str) -> str:
    if not value:
        return ""

    v = value.replace('"', '').replace(" ", "").strip()
    v = ''.join(c for c in v if c.isdigit() or c in ",.")

    if v.isdigit():
        length = len(v)
        if length == 3:
            return f"0.{v}"
        if length == 4:
            return f"{v[0]}.{v[1:]}"
        if length == 5:
            return f"{v[:2]}.{v[2:]}"
        return v

    if "," in v and "." in v:
        if v.rfind(",") > v.rfind("."):
            v = v.replace(".", "")
        else:
            v = v.replace(",", "")

    v = v.replace(",", ".")

    parts = v.split(".")
    if len(parts) > 2:
        v = parts[0] + "." + "".join(parts[1:])

    return v


def normalize_land(land: str) -> str:
    land = unicodedata.normalize("NFKD", land)
    land = "".join(c for c in land if not unicodedata.combining(c))
    return land.strip().lower()


def get_csv_path(land: str) -> str:
    safe = land.replace(" ", "_")
    base = os.path.dirname(__file__)
    return os.path.join(base, "..", "docs", "data", f"{safe}.csv")


def get_last_date_from_csv(path: str) -> str | None:
    if not os.path.isfile(path):
        return None

    try:
        with open(path, "r", encoding="utf-8") as f:
            rows = [row for row in csv.reader(f) if row]

        if len(rows) > 1:
            return rows[-1][0].strip()

    except Exception as e:
        print("⚠ Fout bij lezen CSV:", path, e)

    return None


def scrape_anwb():
    today = get_today_date()
    print("▶ Datum (NL):", today)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("▶ Pagina laden…")
        page.goto(URL, timeout=60000)
        page.wait_for_selector("table", timeout=30000)

        rows = page.query_selector_all("table tr")

        header = None
        all_countries = {}

        for row in rows:
            cols = [c.inner_text().strip() for c in row.query_selector_all("th, td")]
            if not cols:
                continue

            if header is None:
                header = cols[1:]
                continue

            land_raw = cols[0]
            land_norm = normalize_land(land_raw)
            cleaned = [clean_price(v) for v in cols[1:]]

            all_countries[land_norm] = {
                "display": land_raw,
                "values": cleaned
            }

        browser.close()

    for land_norm, info in all_countries.items():
        csv_path = get_csv_path(land_norm)
        last_date = get_last_date_from_csv(csv_path)

        print(f"DEBUG: {info['display']} | last: {last_date} | today: {today}")

        if last_date == today:
            print("⏭", info["display"], "heeft al data voor vandaag")
            continue

        rows_out = []

        if not os.path.isfile(csv_path):
            rows_out.append(["Datum"] + header)

        rows_out.append([today] + info["values"])

        os.makedirs(os.path.dirname(csv_path), exist_ok=True)

        with open(csv_path, "a", newline="\n", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerows(rows_out)

        print("✔ Toegevoegd:", info["display"], today)


if __name__ == "__main__":
    scrape_anwb()
