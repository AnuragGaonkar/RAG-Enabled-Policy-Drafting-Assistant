from modules.intent_extractor import extract_intent
from modules.law_matcher import match_laws, group_rules
from modules.feasibility_checker import check_feasibility
from modules.drafter import draft_policy
from modules.citations import extract_citations

def run_pipeline(user_input, llm, legal_kb):
    intent = extract_intent(user_input, llm)

    matched = match_laws(intent, legal_kb)
    grouped = group_rules(matched)

    feasibility = check_feasibility(intent, grouped)
    policy = draft_policy(intent, grouped, llm)
    citations = extract_citations(grouped)

    return intent, feasibility, policy, citations
