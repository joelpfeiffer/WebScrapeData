import os
import csv
import unicodedata
from datetime import datetime
from playwright.sync_api import sync_playwright

URL = "https://www.anwb.nl/vakantie/reisvoorbereiding/brandstofprijzen-europa"


def clean_price(value: str) -> str:
    """Normaliseert ANWB prijzen naar decimaal PUNT voor CSV."""
    if not value:
        return ""

    v = value.replace('"', '').replace(" ", "").strip()
    v = ''.join(c for c in v if c.isdigit() or c in ",.")

    # Case 1: puur cijfers (milliprijzen zoals 614 => 0.614)
    if v.isdigit():
        length = len(v)
        if length == 3:      # 614 → 0.614
            return f"0.{v}"
        if length == 4:      # 1124 → 1.124
            return f"{v[0]}.{v[1:]}"
        if length == 5:      # 20479 → 20.479 (heel zeldzaam)
            return f"{v[:2]}.{v[2:]}"
        return v

    # Case 2: comma + dot mixed (2,047 or 2.047)
    if "," in v and "." in v:
        # Als komma rechts staat -> comma = decimaal
        if v.rfind(",") > v.rfind("."):
            v = v.replace(".", "")  # punt = duizendtal → weg
        else:
            v = v.replace(",", "")  # komma = duizendtal → weg

    # Converteer comma naar punt (CSV decimaal)
    v = v.replace(",", ".")

    # Te veel punten verwijderen
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


def scrape_anwb():

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("▶ Pagina laden…")
        page.goto(URL, timeout=60000)
        page.wait_for_selector("table", timeout=30000)

        # Datum ANWB
        try:
            updated = page.get_by_text("Laatst bijgewerkt").inner_text().strip()
            updated_date = updated.split(":")[1].strip()
        except:
            updated_date = datetime.now().strftime("%Y-%m-%d")

        print("▶ Datum:", updated_date)

        rows = page.query_selector_all("table tr")

        header = None
        all_countries = {}

        # Tabel lezen
        for row in rows:
            cols = [c.inner_text().strip() for c in row.query_selector_all("th, td")]
            if not cols:
                continue

            if header is None:
                header = cols[1:]  # verwijder Land kolom
                continue

            land_raw = cols[0]
            land_norm = normalize_land(land_raw)
            cleaned = [clean_price(v) for v in cols[1:]]

            all_countries[land_norm] = {
                "display": land_raw,
                "values": cleaned
            }

        browser.close()

    # CSV's opslaan
    for land_norm, info in all_countries.items():
        csv_path = get_csv_path(land_norm)
        file_exists = os.path.isfile(csv_path)
        last_date = None

        if file_exists:
            with open(csv_path, "r", encoding="utf-8") as f:
                lines = list(csv.reader(f))
                if len(lines) > 1:
                    last_date = lines[-1][0]

        if last_date == updated_date:
            print("⏭", info["display"], "heeft al", updated_date)
            continue

        rows_out = []

        if not file_exists:
            rows_out.append(["Datum (ANWB)"] + header)

        rows_out.append([updated_date] + info["values"])

        os.makedirs(os.path.dirname(csv_path), exist_ok=True)

        with open(csv_path, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerows(rows_out)

        print("✔ Toegevoegd:", info["display"], updated_date)


if __name__ == "__main__":
    scrape_anwb()
