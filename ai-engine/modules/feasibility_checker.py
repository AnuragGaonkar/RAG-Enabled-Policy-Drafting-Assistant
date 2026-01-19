def check_feasibility(intent, grouped_rules):
    warnings = []

    for rule in grouped_rules["obligations"]:
        warnings.append(
            f"Mandatory: {rule['text']} "
            f"({rule['law']} Section {rule['section']})"
        )

    status = "allowed_with_conditions" if warnings else "allowed"

    return {
        "status": status,
        "warnings": warnings
    }
