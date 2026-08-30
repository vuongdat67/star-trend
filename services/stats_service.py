from collections import Counter, defaultdict

# Mapping categories dynamically
CATEGORY_RULES = [
    ('🤖 AI, LLMs & Agents', ['ai', 'llm', 'claude', 'gpt', 'agent', 'mcp', 'openai', 'anthropic', 'prompt', 'rag', 'deepseek', 'langchain', 'llama', 'machine-learning', 'copilot', 'codex']),
    ('🛠️ Developer Tools & CLI', ['cli', 'terminal', 'devtools', 'developer-tools', 'automation', 'productivity', 'tool', 'workflow', 'git', 'scraper', 'crawler', 'powershell', 'bash', 'shell']),
    ('🛡️ Security & Reverse Eng', ['security', 'cybersecurity', 'malware', 'exploit', 'reverse-engineering', 'decompiler', 'disassembler', 'pentest', 'vulnerability', 'cve', 'hack', 'antivirus', 'evasion', 'yara', 'ghidra', 'ida', 'pyc', 'uncompyle', 'hook']),
    ('📚 Learning & Tutorials', ['awesome', 'tutorial', 'learning', 'interview', 'roadmap', 'book', 'courses', 'education', 'algorithms', 'cheatsheet']),
    ('🌐 Web & Fullstack', ['react', 'vue', 'nextjs', 'tailwind', 'frontend', 'backend', 'web', 'fastapi', 'flask', 'django', 'express', 'css', 'html', 'nodejs', 'svelte']),
    ('⚙️ Systems & Low-level', ['rust', 'c++', 'kernel', 'driver', 'windows', 'linux', 'operating-system', 'embedded', 'compiler', 'database', 'wasm', 'low-level'])
]

def categorize_repo(repo):
    topics = [t.lower() for t in repo.get('topics', [])]
    desc = (repo.get('description') or '').lower()
    name = (repo.get('name') or '').lower()
    full_text = f"{' '.join(topics)} {desc} {name}"

    matched_categories = []
    for cat_name, keywords in CATEGORY_RULES:
        if any(k in full_text for k in keywords):
            matched_categories.append(cat_name)

    if not matched_categories:
        matched_categories.append('📦 Khác / Miscellaneous')

    return matched_categories

def compute_stars_stats(repos):
    lang_counter = Counter()
    topic_counter = Counter()
    year_counter = Counter()
    category_counter = Counter()

    for r in repos:
        lang = r.get('language') or 'Others'
        lang_counter[lang] += 1

        starred_at = r.get('starred_at', '')
        yr = r.get('starred_year') or (starred_at[:4] if starred_at else 'Unknown')
        year_counter[yr] += 1

        raw_topics = r.get('topics') or []
        for t in raw_topics:
            t_clean = t.strip().lower()
            if t_clean:
                topic_counter[t_clean] += 1

        cats = categorize_repo(r)
        r['categories'] = cats
        for c in cats:
            category_counter[c] += 1

    sorted_topics = [{"name": t, "count": c} for t, c in topic_counter.most_common()]

    # Format category list for Splunk-style sidebar
    category_list = []
    for cat, count in category_counter.most_common():
        category_list.append({
            "name": cat,
            "count": count,
            "id": cat.split(' ')[1] if ' ' in cat else cat
        })

    return {
        'total': len(repos),
        'languages': dict(lang_counter.most_common(20)),
        'all_languages': dict(lang_counter),
        'topics': dict(topic_counter.most_common(50)),
        'all_topics': sorted_topics,
        'total_unique_topics': len(topic_counter),
        'years': dict(sorted(year_counter.items(), reverse=True)),
        'categories': dict(category_counter.most_common()),
        'sidebar_categories': category_list
    }
