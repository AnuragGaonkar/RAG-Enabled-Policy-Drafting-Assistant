def match_laws(intent, legal_kb):
    return [
        r for r in legal_kb
        if r.get("jurisdiction") == intent.get("jurisdiction")
    ]


def group_rules(rules):
    grouped = {
        "obligations": [],
        "prohibitions": [],
        "exceptions": []
    }

    for r in rules:
        grouped[r["type"] + "s"].append(r)

    return grouped
