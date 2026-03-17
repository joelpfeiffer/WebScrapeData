def clean_price(value: str) -> str:
    """Maak ANWB brandstofprijs schoon en detecteer milliprijzen zoals 614 → 0,614."""
    if not value:
        return ""

    # verwijder quotes/spaties
    v = value.replace('"', '').replace(" ", "").strip()

    # alleen cijfers, komma, punt
    v = ''.join(c for c in v if c.isdigit() or c in ",.")

    # detecteer waardes zoals "614" → dat is geen €614, maar €0,614
    if v.isdigit() and len(v) == 3:
        return f"0,{v}"

    # detecteer waardes zoals "1124" → €1,124
    if v.isdigit() and len(v) == 4:
        return f"{v[0]},{v[1:]}"

    # detecteer waardes zoals "2047" → €2,047
    if v.isdigit() and len(v) == 4:
        return f"{v[0]},{v[1:]}"

    # gemengde notatie 2,047 of 2.047
    if "," in v and "." in v:
        if v.rfind(",") > v.rfind("."):
            v = v.replace(".", "")
        else:
            v = v.replace(",", "")

    # punt-decimaal naar komma-decimaal
    if "." in v and "," not in v:
        v = v.replace(".", ",")

    # teveel komma's
    parts = v.split(",")
    if len(parts) > 2:
        v = parts[0] + "," + "".join(parts[1:])

    return v
