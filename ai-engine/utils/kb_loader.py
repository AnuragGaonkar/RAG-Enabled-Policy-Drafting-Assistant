import os
import json

def load_legal_kb(path="kb"):
    all_rules = []

    # Safety check: Ensure the folder exists before trying to read
    if not os.path.exists(path):
        print(f"⚠️ Warning: KB folder '{path}' not found.")
        return []

    for file in os.listdir(path):
        if not file.endswith(".json"):
            continue

        try:
            # FIX IS HERE: Added encoding="utf-8"
            # This forces Python to read the file correctly on Windows
            with open(os.path.join(path, file), "r", encoding="utf-8") as f:
                rules = json.load(f)

                # Robustness check: Ensure rules is actually a list
                if isinstance(rules, list):
                    for rule in rules:
                        rule["source_file"] = file
                        all_rules.append(rule)
        except Exception as e:
            print(f"❌ Error loading file {file}: {e}")

    return all_rules