def extract_citations(grouped_rules):
    citations = set()

    for rules in grouped_rules.values():
        for r in rules:
            citations.add(
                f"{r['law']} – Section {r['section']} "
                f"(Source: {r['source_file']})"
            )

    return sorted(citations)
