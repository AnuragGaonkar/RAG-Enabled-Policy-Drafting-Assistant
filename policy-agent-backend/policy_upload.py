import sys
import os
import json
import pickle

metadata_path = 'policy_metadata.pkl'

def load_metadata():
    if os.path.exists(metadata_path):
        with open(metadata_path, 'rb') as f:
            return pickle.load(f)
    return {}

def save_metadata(meta):
    with open(metadata_path, 'wb') as f:
        pickle.dump(meta, f)

def get_policy_title(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.readline().strip()[:100]

if __name__ == '__main__':
    file_path = sys.argv[1]
    mode = sys.argv[2]
    policy_id = sys.argv[3] if len(sys.argv) > 3 else ''
    check_only = '--check-only' in sys.argv

    result = {'conflict': False, 'message': ''}
    meta = load_metadata()
    title = get_policy_title(file_path)

    if mode == 'create':
        if title in meta:
            result['conflict'] = True
            result['message'] = f"Policy '{title}' already exists. Use update to modify."
        else:
            result['message'] = "No conflict detected."

    elif mode == 'update':
        found = False
        # By policy_id
        if policy_id and any(v.get('id') == policy_id for v in meta.values()):
            found = True
        # By title fallback
        if title in meta:
            found = True
        if not found:
            result['conflict'] = True
            result['message'] = "No Policy ID or matching title found for update."
        else:
            result['message'] = "No conflict detected."

    else:
        result['conflict'] = True
        result['message'] = "Invalid mode."

    # If just checking, print and exit
    if check_only:
        print(json.dumps(result))
        sys.exit(0)

    # Actually save/update if not checking
    if not result['conflict']:
        meta[title] = {'file': os.path.basename(file_path), 'id': policy_id or None}
        save_metadata(meta)
        result['message'] = f"Policy '{title}' {'updated' if mode=='update' else 'created'} successfully!"

    print(json.dumps(result))
