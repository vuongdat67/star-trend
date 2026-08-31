#!/usr/bin/env python3
"""
GitHub Stars Exporter & Analyzer
Author: Antigravity
Usage:
    python export_stars.py [username] [--token GITHUB_TOKEN] [--output STARS.md]
"""

import sys
import os
import io
import json
import csv
import argparse
import urllib.request
import urllib.error
from collections import Counter, defaultdict
from datetime import datetime

# Đảm bảo stdout hỗ trợ UTF-8 trên Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def fetch_all_stars(username, token=None):
    token = token or os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')
    headers = {
        'Accept': 'application/vnd.github.v3.star+json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StarExporter/1.0'
    }
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    starred_items = []
    page = 1
    per_page = 100
    
    print(f"[*] Bắt đầu tải danh sách starred repositories của user '{username}'...")
    
    while True:
        url = f"https://api.github.com/users/{username}/starred?per_page={per_page}&page={page}"
        req = urllib.request.Request(url, headers=headers)
        
        try:
            with urllib.request.urlopen(req) as response:
                items = json.loads(response.read().decode('utf-8'))
                rate_remaining = response.headers.get('X-RateLimit-Remaining', 'N/A')
                rate_limit = response.headers.get('X-RateLimit-Limit', 'N/A')
                
                if not items:
                    break
                
                starred_items.extend(items)
                print(f" -> Đã tải trang {page}: {len(items)} repos (Tổng: {len(starred_items)}) [Rate limit còn lại: {rate_remaining}/{rate_limit}]")
                
                if len(items) < per_page:
                    break
                
                page += 1
        except urllib.error.HTTPError as e:
            if e.code == 403:
                msg = "Lỗi 403 Rate Limit Exceeded từ GitHub Public API. Hãy thử lại sau 30-60 phút hoặc cung cấp GITHUB_TOKEN."
                print(f"\n[!] {msg}")
                raise RuntimeError(msg)
            else:
                msg = f"Lỗi HTTP {e.code}: {e.reason}"
                print(f"\n[!] {msg}")
                raise RuntimeError(msg)
        except Exception as e:
            print(f"\n[!] Lỗi kết nối: {e}")
            raise RuntimeError(f"Lỗi kết nối GitHub API: {e}")
            
    print(f"[✓] Đã tải thành công toàn bộ {len(starred_items)} repositories!\n")
    return starred_items

def parse_and_analyze(raw_items):
    repos = []
    languages_counter = Counter()
    topics_counter = Counter()
    starred_years_counter = Counter()
    
    for item in raw_items:
        repo = item.get('repo', {})
        starred_at = item.get('starred_at', '')
        
        # Parse dates
        starred_dt = None
        starred_year = 'Unknown'
        starred_date_str = ''
        if starred_at:
            try:
                starred_dt = datetime.fromisoformat(starred_at.replace('Z', '+00:00'))
                starred_year = str(starred_dt.year)
                starred_date_str = starred_dt.strftime('%Y-%m-%d')
            except Exception:
                starred_date_str = starred_at[:10]
        
        lang = repo.get('language') or 'Others'
        languages_counter[lang] += 1
        starred_years_counter[starred_year] += 1
        
        topics = repo.get('topics') or []
        for t in topics:
            topics_counter[t.lower()] += 1
            
        repo_data = {
            'name': repo.get('name', ''),
            'full_name': repo.get('full_name', ''),
            'owner': repo.get('owner', {}).get('login', ''),
            'html_url': repo.get('html_url', ''),
            'description': (repo.get('description') or '').replace('\n', ' ').strip(),
            'language': lang,
            'stars': repo.get('stargazers_count', 0),
            'forks': repo.get('forks_count', 0),
            'open_issues': repo.get('open_issues_count', 0),
            'topics': topics,
            'starred_at': starred_at,
            'starred_date': starred_date_str,
            'starred_year': starred_year,
            'archived': repo.get('archived', False),
            'license': (repo.get('license') or {}).get('spdx_id') or (repo.get('license') or {}).get('name') or '',
            'homepage': repo.get('homepage') or ''
        }
        repos.append(repo_data)
        
    return {
        'repos': repos,
        'languages': languages_counter,
        'topics': topics_counter,
        'years': starred_years_counter,
        'total': len(repos)
    }

def format_number(num):
    if num >= 1_000_000:
        return f"{num / 1_000_000:.1f}M"
    if num >= 1_000:
        return f"{num / 1_000:.1f}k"
    return str(num)

def create_bar(percentage, width=20):
    filled = int(round(width * percentage / 100.0))
    return '█' * filled + '░' * (width - filled)

def categorize_repo(repo):
    topics = [t.lower() for t in repo.get('topics', [])]
    desc = (repo.get('description') or '').lower()
    name = (repo.get('name') or '').lower()
    full_text = f"{' '.join(topics)} {desc} {name}"
    
    categories = []
    
    # AI / LLM / Agents
    if any(k in full_text for k in ['ai', 'llm', 'claude', 'gpt', 'agent', 'mcp', 'openai', 'anthropic', 'prompt', 'rag', 'deepseek', 'langchain', 'llama', 'machine-learning', 'copilot', 'codex']):
        categories.append('🤖 AI, LLMs & Agents')
        
    # Security / Reverse Engineering / Pentest
    if any(k in full_text for k in ['security', 'cybersecurity', 'malware', 'exploit', 'reverse-engineering', 'decompiler', 'disassembler', 'pentest', 'vulnerability', 'cve', 'hack', 'antivirus', 'evasion', 'yara', 'ghidra', 'ida', 'pyc', 'uncompyle', 'hook']):
        categories.append('🛡️ Security & Reverse Engineering')
        
    # DevTools / CLI / Workflow / Automation
    if any(k in full_text for k in ['cli', 'terminal', 'devtools', 'developer-tools', 'automation', 'productivity', 'tool', 'workflow', 'git', 'scraper', 'crawler', 'powershell', 'bash', 'shell']):
        categories.append('🛠️ DevTools, CLI & Automation')
        
    # Learning / Tutorials / Awesome Lists
    if any(k in full_text for k in ['awesome', 'tutorial', 'learning', 'interview', 'roadmap', 'book', 'courses', 'education', 'algorithms', 'cheatsheet']):
        categories.append('📚 Learning, Tutorials & Awesome Lists')
        
    # Web & Fullstack Development
    if any(k in full_text for k in ['react', 'vue', 'nextjs', 'tailwind', 'frontend', 'backend', 'web', 'fastapi', 'flask', 'django', 'express', 'css', 'html', 'nodejs', 'svelte']):
        categories.append('🌐 Web & Fullstack Development')
        
    # Systems / Low-level / OS
    if any(k in full_text for k in ['rust', 'c++', 'kernel', 'driver', 'windows', 'linux', 'operating-system', 'embedded', 'compiler', 'database', 'wasm', 'low-level']):
        categories.append('⚙️ Systems, OS & Low-level')
        
    if not categories:
        categories.append('📦 Khác / Miscellaneous')
        
    return categories

def generate_markdown(analysis_data, username):
    repos = analysis_data['repos']
    total = analysis_data['total']
    lang_counter = analysis_data['languages']
    topic_counter = analysis_data['topics']
    year_counter = analysis_data['years']
    
    # Sort repos by language, then by stars desc
    repos_by_lang = defaultdict(list)
    for r in repos:
        repos_by_lang[r['language']].append(r)
    
    for lang in repos_by_lang:
        repos_by_lang[lang].sort(key=lambda x: x['stars'], reverse=True)
        
    sorted_langs = sorted(repos_by_lang.keys(), key=lambda l: len(repos_by_lang[l]), reverse=True)
    
    # Top repos by stars
    top_starred = sorted(repos, key=lambda x: x['stars'], reverse=True)[:10]
    
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    lines = []
    lines.append(f"# 🌟 GitHub Starred Repositories - @{username}")
    lines.append(f"")
    lines.append(f"> Danh sách toàn bộ starred repositories của **[@{username}](https://github.com/{username})**.")
    lines.append(f"> 🕒 Cập nhật: `{now_str}` | 📦 Tổng số: **{total:,}** repositories")
    lines.append(f"")
    lines.append(f"---")
    lines.append(f"")
    lines.append(f"## 📊 Bảng Thống Kê Tổng Quan (Dashboard)")
    lines.append(f"")
    
    # Language Distribution Table
    lines.append(f"### 🔤 Phân bố theo Ngôn ngữ lập trình")
    lines.append(f"")
    lines.append(f"| Ngôn ngữ | Số lượng | Tỷ lệ (%) | Phân bổ trực quan |")
    lines.append(f"| :--- | :---: | :---: | :--- |")
    for lang, count in lang_counter.most_common(12):
        pct = (count / total) * 100
        bar = create_bar(pct, width=15)
        slug = lang.lower().replace(' ', '-').replace('#', 'sharp').replace('+', 'p')
        lines.append(f"| [**{lang}**](#{slug}) | `{count}` | `{pct:.1f}%` | `{bar}` |")
    
    others_count = sum(c for l, c in lang_counter.items() if l not in [x[0] for x in lang_counter.most_common(12)])
    if others_count > 0:
        pct = (others_count / total) * 100
        bar = create_bar(pct, width=15)
        lines.append(f"| [**Khác / Others**](#others) | `{others_count}` | `{pct:.1f}%` | `{bar}` |")
    lines.append(f"")
    
    # Top Topics
    lines.append(f"### 🏷️ Top 20 Chủ đề / Topics phổ biến nhất")
    lines.append(f"")
    top_topics = [f"`#{t}` ({c})" for t, c in topic_counter.most_common(20)]
    lines.append(" • ".join(top_topics))
    lines.append(f"")
    lines.append(f"")
    
    # Timeline
    lines.append(f"### 📅 Thống kê Star theo Năm")
    lines.append(f"")
    lines.append(f"| Năm | Số repo star | Tỷ lệ (%) |")
    lines.append(f"| :---: | :---: | :---: |")
    for yr, count in sorted(year_counter.items(), reverse=True):
        pct = (count / total) * 100
        lines.append(f"| **{yr}** | `{count}` | `{pct:.1f}%` |")
    lines.append(f"")
    
    # Top 10 most popular repos
    lines.append(f"### 🏆 Top 10 Repository nhiều sao nhất")
    lines.append(f"")
    lines.append(f"| # | Repository | Ngôn ngữ | ⭐ Stars | 🍴 Forks | Mô tả |")
    lines.append(f"| :-: | :--- | :---: | :-: | :-: | :--- |")
    for idx, r in enumerate(top_starred, 1):
        desc = r['description']
        if len(desc) > 80:
            desc = desc[:77] + '...'
        lines.append(f"| {idx} | [**{r['full_name']}**]({r['html_url']}) | `{r['language']}` | **{format_number(r['stars'])}** | {format_number(r['forks'])} | {desc} |")
    lines.append(f"")
    lines.append(f"---")
    lines.append(f"")
    
    # Table of Contents
    lines.append(f"## 📑 Mục Lục Điều Hướng (Table of Contents)")
    lines.append(f"")
    toc_items = []
    for lang in sorted_langs:
        count = len(repos_by_lang[lang])
        slug = lang.lower().replace(' ', '-').replace('#', 'sharp').replace('+', 'p')
        toc_items.append(f"- [{lang} ({count})](#{slug})")
    lines.append("\n".join(toc_items))
    lines.append(f"")
    lines.append(f"---")
    lines.append(f"")
    
    # Repos grouped by language
    lines.append(f"## 📦 Danh Sách Repositories Chi Tiết Theo Ngôn Ngữ")
    lines.append(f"")
    
    for lang in sorted_langs:
        lang_repos = repos_by_lang[lang]
        slug = lang.lower().replace(' ', '-').replace('#', 'sharp').replace('+', 'p')
        lines.append(f"<a id=\"{slug}\"></a>")
        lines.append(f"### {lang} `({len(lang_repos)})`")
        lines.append(f"")
        lines.append(f"[🔼 Lên đầu trang](#-mục-lục-điều-hướng-table-of-contents)")
        lines.append(f"")
        
        for r in lang_repos:
            archived_badge = " `[ARCHIVED]`" if r['archived'] else ""
            license_badge = f" • 📜 `{r['license']}`" if r['license'] else ""
            date_badge = f" • 📅 Starred: `{r['starred_date']}`" if r['starred_date'] else ""
            
            lines.append(f"- [**{r['full_name']}**]({r['html_url']}){archived_badge} - ⭐ **{format_number(r['stars'])}** | 🍴 {format_number(r['forks'])}{license_badge}{date_badge}")
            if r['description']:
                lines.append(f"  - {r['description']}")
            if r['topics']:
                tags = " ".join([f"`#{t}`" for t in r['topics'][:8]])
                lines.append(f"  - 🏷️ {tags}")
            if r['homepage']:
                lines.append(f"  - 🔗 [Homepage]({r['homepage']})")
            lines.append(f"")
            
        lines.append(f"")
        
    return "\n".join(lines)

def generate_topic_markdown(analysis_data, username):
    repos = analysis_data['repos']
    total = analysis_data['total']
    
    categorized = defaultdict(list)
    for r in repos:
        cats = categorize_repo(r)
        for c in cats:
            categorized[c].append(r)
            
    # Sort repos inside each category by stars
    for c in categorized:
        categorized[c].sort(key=lambda x: x['stars'], reverse=True)
        
    sorted_cats = sorted(categorized.keys(), key=lambda c: len(categorized[c]), reverse=True)
    
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    lines = []
    lines.append(f"# 🏷️ GitHub Starred Repositories Theo Chủ Đề - @{username}")
    lines.append(f"")
    lines.append(f"> Phân loại thông minh 611 repositories theo lĩnh vực ứng dụng.")
    lines.append(f"> 🕒 Cập nhật: `{now_str}`")
    lines.append(f"")
    lines.append(f"---")
    lines.append(f"")
    lines.append(f"## 📑 Mục Lục Chủ Đề")
    lines.append(f"")
    for cat in sorted_cats:
        count = len(categorized[cat])
        slug = cat.lower().replace(' ', '-').replace(',', '').replace('&', '').replace('🤖', '').replace('🛡️', '').replace('🛠️', '').replace('📚', '').replace('🌐', '').replace('⚙️', '').replace('📦', '').strip('-')
        lines.append(f"- [{cat} ({count})](#{slug})")
    lines.append(f"")
    lines.append(f"---")
    lines.append(f"")
    
    for cat in sorted_cats:
        cat_repos = categorized[cat]
        slug = cat.lower().replace(' ', '-').replace(',', '').replace('&', '').replace('🤖', '').replace('🛡️', '').replace('🛠️', '').replace('📚', '').replace('🌐', '').replace('⚙️', '').replace('📦', '').strip('-')
        lines.append(f"<a id=\"{slug}\"></a>")
        lines.append(f"## {cat} `({len(cat_repos)})`")
        lines.append(f"")
        lines.append(f"[🔼 Lên đầu trang](#-mục-lục-chủ-đề)")
        lines.append(f"")
        for r in cat_repos:
            archived_badge = " `[ARCHIVED]`" if r['archived'] else ""
            lines.append(f"- [**{r['full_name']}**]({r['html_url']}){archived_badge} - `{r['language']}` | ⭐ **{format_number(r['stars'])}** | 🍴 {format_number(r['forks'])} | 📅 `{r['starred_date']}`")
            if r['description']:
                lines.append(f"  - {r['description']}")
            if r['topics']:
                tags = " ".join([f"`#{t}`" for t in r['topics'][:6]])
                lines.append(f"  - 🏷️ {tags}")
            lines.append(f"")
        lines.append(f"")
        
    return "\n".join(lines)

def generate_timeline_markdown(analysis_data, username):
    repos = analysis_data['repos']
    # Sort by starred_at descending
    sorted_by_date = sorted(repos, key=lambda x: x['starred_at'] or '', reverse=True)
    
    # Group by Year-Month
    by_month = defaultdict(list)
    for r in sorted_by_date:
        month_key = r['starred_date'][:7] if len(r['starred_date']) >= 7 else 'Unknown'
        by_month[month_key].append(r)
        
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    lines = []
    lines.append(f"# 📅 GitHub Starred Timeline - @{username}")
    lines.append(f"")
    lines.append(f"> Dòng thời gian các repository đã star theo tháng (mới nhất ở trên).")
    lines.append(f"> 🕒 Cập nhật: `{now_str}`")
    lines.append(f"")
    lines.append(f"---")
    lines.append(f"")
    
    for month, m_repos in by_month.items():
        lines.append(f"## 🗓️ Tháng {month} `({len(m_repos)} repos)`")
        lines.append(f"")
        for r in m_repos:
            lines.append(f"- `{r['starred_date']}`: [**{r['full_name']}**]({r['html_url']}) (`{r['language']}`) - ⭐ **{format_number(r['stars'])}**")
            if r['description']:
                lines.append(f"  - {r['description']}")
            lines.append(f"")
        lines.append(f"")
        
    return "\n".join(lines)

def export_json(analysis_data, filepath):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(analysis_data['repos'], f, ensure_ascii=False, indent=2)
    print(f"[✓] Đã lưu file JSON: {filepath}")

def export_csv(analysis_data, filepath):
    repos = analysis_data['repos']
    if not repos:
        return
    fieldnames = ['full_name', 'html_url', 'description', 'language', 'stars', 'forks', 'starred_date', 'topics', 'license', 'archived', 'homepage']
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        for r in repos:
            row = dict(r)
            row['topics'] = "; ".join(r['topics'])
            writer.writerow(row)
    print(f"[✓] Đã lưu file CSV: {filepath}")

def main():
    parser = argparse.ArgumentParser(description="Tải và thống kê danh sách GitHub Starred Repositories ra Markdown, JSON, CSV.")
    parser.add_argument('username', nargs='?', default='vuongdat67', help="GitHub Username (mặc định: vuongdat67)")
    parser.add_argument('--token', default=os.getenv('GITHUB_TOKEN') or os.getenv('GH_TOKEN'), help="GitHub Personal Access Token (tùy chọn)")
    parser.add_argument('--output', default='github_stars.md', help="Đường dẫn file Markdown theo ngôn ngữ (mặc định: github_stars.md)")
    parser.add_argument('--topic-output', default='github_stars_by_topic.md', help="Đường dẫn file Markdown theo chủ đề (mặc định: github_stars_by_topic.md)")
    parser.add_argument('--timeline-output', default='github_stars_timeline.md', help="Đường dẫn file Markdown theo timeline (mặc định: github_stars_timeline.md)")
    parser.add_argument('--json', default='github_stars.json', help="Đường dẫn file JSON output")
    parser.add_argument('--csv', default='github_stars.csv', help="Đường dẫn file CSV output")
    
    args = parser.parse_args()
    
    raw_items = fetch_all_stars(args.username, args.token)
    analysis = parse_and_analyze(raw_items)
    
    # 1. Main Markdown (Grouped by Language + Stats Dashboard)
    md_content = generate_markdown(analysis, args.username)
    with open(args.output, 'w', encoding='utf-8') as f:
        f.write(md_content)
    print(f"[✓] Đã tạo file Markdown (theo Ngôn ngữ): {args.output}")
    
    # 2. Topic-based Markdown
    if args.topic_output:
        topic_md = generate_topic_markdown(analysis, args.username)
        with open(args.topic_output, 'w', encoding='utf-8') as f:
            f.write(topic_md)
        print(f"[✓] Đã tạo file Markdown (theo Chủ đề): {args.topic_output}")
        
    # 3. Timeline-based Markdown
    if args.timeline_output:
        timeline_md = generate_timeline_markdown(analysis, args.username)
        with open(args.timeline_output, 'w', encoding='utf-8') as f:
            f.write(timeline_md)
        print(f"[✓] Đã tạo file Markdown (theo Timeline): {args.timeline_output}")
    
    # 4. JSON & CSV
    if args.json:
        export_json(analysis, args.json)
    if args.csv:
        export_csv(analysis, args.csv)
        
    print(f"\n[🎉] Hoàn tất xuất dữ liệu! Các file đã được lưu tại thư mục hiện tại.")

if __name__ == '__main__':
    main()
