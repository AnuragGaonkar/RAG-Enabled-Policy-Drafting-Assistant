def draft_section(section, intent, grouped_rules, llm):
    prompt = f"""
Draft ONLY the section titled "{section}".

Rules:
- Formal legal language
- No assumptions
- Follow Indian law only
- Cite law in brackets

Intent:
{intent}

Relevant rules:
{grouped_rules}
"""
    return llm(prompt)


def draft_policy(intent, grouped_rules, llm):
    sections = [
        "Introduction",
        "Consent",
        "Data Collection",
        "User Rights",
        "Data Retention",
        "Grievance Redressal"
    ]

    return {
        sec: draft_section(sec, intent, grouped_rules, llm)
        for sec in sections
    }
