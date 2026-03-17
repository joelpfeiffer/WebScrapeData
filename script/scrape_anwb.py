def clean_price(value: str) -> str:
    """Zet ANWB prijzen correct om naar Europese notatie (komma-decimaal)."""
    if not value:
        return ""

    v = value.replace('"', '').strip()

    # Haal alle rare tekens weg behalve cijfers, punt en komma
    v = ''.join(c for c in v if c.isdigit() or c in ".,")
    
    # Scenario 1: "2,047" → decimaal: 2.047  (NIET 2047!)
    if "," in v and "." in v:
        # Als de komma rechts staat (zoals 2,047 → 2.047)
        if v.rfind(",") > v.rfind("."):
            v = v.replace(".", "")  # verwijder punt als duizendtal
        # Als punt decimaal is (zeldzaam), convert naar komma
        else:
            v = v.replace(",", "")

    # Scenario 2: "2.047" → decimaal → 2,047
    if "." in v and "," not in v:
        v = v.replace(".", ",")

    # Scenario 3: "2,047" → laat staan maar zonder duizendtallen logica
    # (brandstofprijzen zijn nooit > 10)
    parts = v.split(",")
    if len(parts) > 2:
        # verwijder alle komma’s behalve de eerste decimaal
        v = parts[0] + "," + "".join(parts[1:])

    return v
``
