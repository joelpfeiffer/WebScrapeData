import os
import csv
import unicodedata
import re
from datetime import datetime
from playwright.sync_api import sync_playwright

URL = "https://www.anwb.nl/vakantie/reisvoorbereiding/brandstofprijzen-europa"


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


def normalize_date(date_str: str) -> str:
    for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime("%Y-%m-%d")
        except:
            continue
    return date_str.strip()


def extract_date_from_page(page) -> str:
    """Bulletproof datum extractie via regex."""
    try:
        body_text = page.inner_text("body")

        match = re.search(
            r"Laatst bijgewerkt[: ]+(\d{1,2}[-/]\d{1,2}[-/]\d{4})",
            body_text
        )

        if match:
            raw_date = match.group(1)
            print("FOUND (regex):", raw_date)
            return normalize_date(raw_date)

        raise ValueError("Datum niet gevonden")

    except Exception as e:
        print("FOUT bij datum ophalen:", e)
        fallback = datetime.now().strftime("%Y-%m-%d")
        print("Fallback datum:", fallback)
        return fallback


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

        updated_date = extract_date_from_page(page)
        print("▶ Datum gebruikt:", updated_date)

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
        file_exists = os.path.isfile(csv_path)
        last_date = None

        if file_exists:
            with open(csv_path, "r", encoding="utf-8") as f:
                lines = [row for row in csv.reader(f) if row]

                if len(lines) > 1:
                    last_date = normalize_date(lines[-1][0])

        print("DEBUG:", info["display"], "| last:", last_date, "| new:", updated_date)

        if last_date == updated_date:
            print("⏭", info["display"], "heeft al", updated_date)
            continue

        rows_out = []

        if not file_exists:
            rows_out.append(["Datum (ANWB)"] + header)

        rows_out.append([updated_date] + info["values"])

        os.makedirs(os.path.dirname(csv_path), exist_ok=True)

        with open(csv_path, "a", newline="\n", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerows(rows_out)

        print("✔ Toegevoegd:", info["display"], updated_date)


if __name__ == "__main__":
    scrape_anwb()
