import subprocess

def ollama_llm(prompt, model="mistral"):
    result = subprocess.run(
        ["ollama", "run", model],
        input=prompt,
        text=True,
        capture_output=True
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr)
    
    return result.stdout.strip()

