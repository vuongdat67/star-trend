import os
import csv
import json
from datetime import datetime
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def format_number(num):
    if not isinstance(num, (int, float)):
        return str(num)
    if num >= 1_000_000:
        return f"{num / 1_000_000:.1f}M"
    if num >= 1_000:
        return f"{num / 1_000:.1f}k"
    return str(num)

def export_all_markdown_and_csv(repos, stats_data, username='vuongdat67', target_dir=None):
    """Xuất toàn bộ file Markdown theo ngôn ngữ, chủ đề, timeline và file CSV vào thư mục chỉ định."""
    out_dir = target_dir if (target_dir and os.path.isdir(target_dir)) else BASE_DIR
    os.makedirs(out_dir, exist_ok=True)

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    total = len(repos)

    created_files = []

    # 1. Main Markdown (Language-based + Dashboard)
    md_lines = [
        f"# 🌟 GitHub Starred Repositories - @{username}",
        f"",
        f"> Danh sách toàn bộ starred repositories của **[@{username}](https://github.com/{username})**.",
        f"> 🕒 Cập nhật: `{now_str}` | 📦 Tổng số: **{total:,}** repositories",
        f"",
        f"---",
        f"",
        f"## 📊 Thống Kê Tổng Quan",
        f"",
        f"| Ngôn ngữ | Số lượng | Tỷ lệ (%) |",
        f"| :--- | :---: | :---: |"
    ]
    
    for lang, count in stats_data.get('languages', {}).items():
        pct = (count / total * 100) if total > 0 else 0
        md_lines.append(f"| **{lang}** | `{count}` | `{pct:.1f}%` |")
        
    md_lines.extend([
        f"",
        f"---",
        f"",
        f"## 📦 Danh Sách Chi Tiết Theo Ngôn Ngữ",
        f""
    ])

    by_lang = defaultdict(list)
    for r in repos:
        by_lang[r.get('language') or 'Others'].append(r)

    for lang in sorted(by_lang.keys(), key=lambda l: len(by_lang[l]), reverse=True):
        items = sorted(by_lang[lang], key=lambda x: x.get('stars', 0), reverse=True)
        md_lines.append(f"### {lang} `({len(items)})`")
        md_lines.append("")
        for r in items:
            stars = format_number(r.get('stars', 0))
            forks = format_number(r.get('forks', 0))
            date_str = r.get('starred_date') or r.get('starred_at', '')[:10]
            md_lines.append(f"- [**{r.get('full_name')}**]({r.get('html_url')}) - ⭐ **{stars}** | 🍴 {forks} | 📅 `{date_str}`")
            if r.get('description'):
                md_lines.append(f"  - {r.get('description')}")
            md_lines.append("")
        md_lines.append("")

    f1 = os.path.join(out_dir, 'github_stars.md')
    with open(f1, 'w', encoding='utf-8') as f:
        f.write("\n".join(md_lines))
    created_files.append(f1)

    # 2. Topic-based Markdown
    topic_lines = [
        f"# 🏷️ GitHub Starred Repositories Theo Chủ Đề - @{username}",
        f"",
        f"> Phân loại thông minh {total} repositories theo lĩnh vực ứng dụng.",
        f"> 🕒 Cập nhật: `{now_str}`",
        f"",
        f"---",
        f""
    ]

    by_cat = defaultdict(list)
    for r in repos:
        for c in r.get('categories', ['📦 Khác / Miscellaneous']):
            by_cat[c].append(r)

    for cat in sorted(by_cat.keys(), key=lambda c: len(by_cat[c]), reverse=True):
        c_items = sorted(by_cat[cat], key=lambda x: x.get('stars', 0), reverse=True)
        topic_lines.append(f"## {cat} `({len(c_items)})`")
        topic_lines.append("")
        for r in c_items:
            stars = format_number(r.get('stars', 0))
            forks = format_number(r.get('forks', 0))
            topic_lines.append(f"- [**{r.get('full_name')}**]({r.get('html_url')}) - `{r.get('language') or 'Others'}` | ⭐ **{stars}** | 🍴 {forks}")
            if r.get('description'):
                topic_lines.append(f"  - {r.get('description')}")
            topic_lines.append("")
        topic_lines.append("")

    f2 = os.path.join(out_dir, 'github_stars_by_topic.md')
    with open(f2, 'w', encoding='utf-8') as f:
        f.write("\n".join(topic_lines))
    created_files.append(f2)

    # 3. Timeline Markdown
    timeline_lines = [
        f"# 📅 GitHub Starred Timeline - @{username}",
        f"",
        f"> Lịch sử các repository đã star theo dòng thời gian.",
        f"> 🕒 Cập nhật: `{now_str}`",
        f"",
        f"---",
        f""
    ]

    sorted_by_date = sorted(repos, key=lambda x: x.get('starred_at') or '', reverse=True)
    by_month = defaultdict(list)
    for r in sorted_by_date:
        d = r.get('starred_date') or r.get('starred_at', '')[:10]
        m_key = d[:7] if len(d) >= 7 else 'Unknown'
        by_month[m_key].append(r)

    for m, m_items in by_month.items():
        timeline_lines.append(f"## 🗓️ Tháng {m} `({len(m_items)} repos)`")
        timeline_lines.append("")
        for r in m_items:
            d = r.get('starred_date') or r.get('starred_at', '')[:10]
            stars = format_number(r.get('stars', 0))
            timeline_lines.append(f"- `{d}`: [**{r.get('full_name')}**]({r.get('html_url')}) (`{r.get('language') or 'Others'}`) - ⭐ **{stars}**")
            if r.get('description'):
                timeline_lines.append(f"  - {r.get('description')}")
            timeline_lines.append("")
        timeline_lines.append("")

    f3 = os.path.join(out_dir, 'github_stars_timeline.md')
    with open(f3, 'w', encoding='utf-8') as f:
        f.write("\n".join(timeline_lines))
    created_files.append(f3)

    # 4. CSV Export
    f4 = os.path.join(out_dir, 'github_stars.csv')
    fieldnames = ['full_name', 'html_url', 'description', 'language', 'stars', 'forks', 'starred_date', 'topics', 'license']
    with open(f4, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        for r in repos:
            row = dict(r)
            if isinstance(row.get('topics'), list):
                row['topics'] = "; ".join(row['topics'])
            writer.writerow(row)
    created_files.append(f4)

    return {
        "output_directory": out_dir,
        "files": created_files
    }
