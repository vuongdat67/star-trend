import os
import json
import time
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
CACHE_FILE = os.path.join(DATA_DIR, 'ai_pulse.json')

PULSE_CACHE = {}
CACHE_TTL = 900  # 15 phút

def get_flagship_conferences_and_platforms():
    """Danh sách các hội nghị khoa học uy tín hàng đầu (CCF-A, CORE A*) và nền tảng học thuật."""
    return [
        {
            "title": "NeurIPS 2026 – Neural Information Processing Systems (CCF-A / CORE A*)",
            "summary": "Hội nghị cờ đầu toàn cầu về Học máy & Deep Learning. Tổ chức bởi NeurIPS Foundation.",
            "url": "https://neurips.cc/",
            "source": "Top Conference",
            "category": "🏛️ Hội Nghị Đỉnh Cao (CCF-A)",
            "badge": "NeurIPS (AI/ML)",
            "published_at": "Hội nghị 2026",
            "tags": ["neurips", "machine-learning", "deep-learning", "ccf-a", "core-a*"]
        },
        {
            "title": "ICLR 2026 – International Conference on Learning Representations (CORE A*)",
            "summary": "Hội nghị hàng đầu thế giới về kiến trúc mạng neural, representation learning và foundational AI models.",
            "url": "https://iclr.cc/",
            "source": "Top Conference",
            "category": "🏛️ Hội Nghị Đỉnh Cao (CCF-A)",
            "badge": "ICLR (Deep Learning)",
            "published_at": "Hội nghị 2026",
            "tags": ["iclr", "representation-learning", "transformers", "core-a*"]
        },
        {
            "title": "IEEE S&P 2026 – Symposium on Security and Privacy (Oakland) (CCF-A / CORE A*)",
            "summary": "Hội nghị danh giá nhất thế giới về An toàn thông tin, mật mã học và bảo mật hệ thống.",
            "url": "https://sp2026.ieee-security.org/",
            "source": "Top Conference",
            "category": "🏛️ Hội Nghị Đỉnh Cao (CCF-A)",
            "badge": "IEEE S&P (Security)",
            "published_at": "Big-Four Security",
            "tags": ["ieee-sp", "oakland", "security", "cryptography", "ccf-a"]
        },
        {
            "title": "USENIX Security 2026 – USENIX Security Symposium (CCF-A / CORE A*)",
            "summary": "Hội nghị đỉnh cao về bảo mật ứng dụng, reverse engineering, lỗ hổng zero-day và firmware security.",
            "url": "https://www.usenix.org/conference/usenixsecurity26",
            "source": "Top Conference",
            "category": "🏛️ Hội Nghị Đỉnh Cao (CCF-A)",
            "badge": "USENIX Sec",
            "published_at": "Big-Four Security",
            "tags": ["usenix-security", "vulnerability", "exploit", "ccf-a"]
        },
        {
            "title": "ACM CCS 2026 – Conference on Computer and Communications Security (CCF-A / CORE A*)",
            "summary": "Hội nghị an ninh mạng cờ đầu của ACM, diễn ra tại The Hague.",
            "url": "https://www.sigsac.org/ccs/CCS2026/",
            "source": "Top Conference",
            "category": "🏛️ Hội Nghị Đỉnh Cao (CCF-A)",
            "badge": "ACM CCS",
            "published_at": "Big-Four Security",
            "tags": ["acm-ccs", "security", "network-security", "ccf-a"]
        },
        {
            "title": "NDSS 2026 – Network and Distributed System Security Symposium (CCF-A / CORE A*)",
            "summary": "Mảnh ghép thứ 4 trong Big-Four Security, chuyên sâu về mạng máy tính và hệ thống phân tán an toàn.",
            "url": "https://www.ndss-symposium.org/",
            "source": "Top Conference",
            "category": "🏛️ Hội Nghị Đỉnh Cao (CCF-A)",
            "badge": "NDSS",
            "published_at": "Big-Four Security",
            "tags": ["ndss", "distributed-security", "network", "ccf-a"]
        },
        {
            "title": "CVPR 2026 – IEEE / CVF Computer Vision & Pattern Recognition (CCF-A / CORE A*)",
            "summary": "Hội nghị số 1 thế giới về Thị giác máy tính, Multimodal và Diffusion Models.",
            "url": "https://cvpr.thecvf.com/",
            "source": "Top Conference",
            "category": "🏛️ Hội Nghị Đỉnh Cao (CCF-A)",
            "badge": "CVPR (Vision)",
            "published_at": "Hội nghị 2026",
            "tags": ["cvpr", "computer-vision", "multimodal", "ccf-a"]
        },
        {
            "title": "ACL 2026 – Meeting of the Association for Computational Linguistics (CCF-A / CORE A*)",
            "summary": "Hội nghị hàng đầu thế giới về Xử lý ngôn ngữ tự nhiên (NLP) và Large Language Models.",
            "url": "https://www.aclweb.org/",
            "source": "Top Conference",
            "category": "🏛️ Hội Nghị Đỉnh Cao (CCF-A)",
            "badge": "ACL (NLP & LLM)",
            "published_at": "Hội nghị 2026",
            "tags": ["acl", "nlp", "llm", "linguistics", "ccf-a"]
        },
        {
            "title": "OSDI / SOSP 2026 – Operating Systems Design and Implementation (CCF-A / CORE A*)",
            "summary": "Hai hội nghị danh giá nhất thế giới về Hệ điều hành, hạt nhân và hạ tầng tính toán quy mô lớn.",
            "url": "https://www.usenix.org/conference/osdi26",
            "source": "Top Conference",
            "category": "🏛️ Hội Nghị Đỉnh Cao (CCF-A)",
            "badge": "OSDI / SOSP (Systems)",
            "published_at": "Systems CCF-A",
            "tags": ["osdi", "sosp", "systems", "kernel", "os", "ccf-a"]
        },
        {
            "title": "AlphaXiv – The GitHub of Open AI Research & Discussions",
            "summary": "Nền tảng mở cho phép cộng đồng nghiên cứu thảo luận trực tiếp trên từng dòng của các bài báo arXiv.",
            "url": "https://alphaxiv.org/",
            "source": "Research Platform",
            "category": "🏛️ Hội Nghị Đỉnh Cao (CCF-A)",
            "badge": "Platform",
            "published_at": "Công cụ nghiên cứu",
            "tags": ["alphaxiv", "open-research", "arxiv", "collaboration"]
        },
        {
            "title": "ACL Anthology & Semantic Scholar Citation Engine",
            "summary": "Kho lưu trữ mở toàn bộ bài báo NLP và công cụ trích dẫn khoa học chính xác được xác minh.",
            "url": "https://aclanthology.org/",
            "source": "Research Platform",
            "category": "🏛️ Hội Nghị Đỉnh Cao (CCF-A)",
            "badge": "Repository",
            "published_at": "Kho học thuật",
            "tags": ["acl-anthology", "semantic-scholar", "citations", "open-access"]
        }
    ]

def fetch_arxiv_papers(category, max_results=8, category_label="cs.AI"):
    """Lấy danh sách các bài báo nghiên cứu mới nhất từ arXiv API."""
    url = f"http://export.arxiv.org/api/query?search_query=cat:{category}&sortBy=submittedDate&sortOrder=descending&max_results={max_results}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StarHub/1.0'}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as resp:
            xml_data = resp.read()
            root = ET.fromstring(xml_data)
            entries = []
            ns = {'atom': 'http://www.w3.org/2005/Atom'}
            for entry in root.findall('atom:entry', ns):
                title_elem = entry.find('atom:title', ns)
                summary_elem = entry.find('atom:summary', ns)
                id_elem = entry.find('atom:id', ns)
                published_elem = entry.find('atom:published', ns)

                title = title_elem.text.strip().replace('\n', ' ') if title_elem is not None else "Untitled Paper"
                summary = summary_elem.text.strip().replace('\n', ' ') if summary_elem is not None else ""
                link = id_elem.text.strip() if id_elem is not None else "https://arxiv.org"
                published = published_elem.text.strip()[:10] if published_elem is not None else "Hôm nay"
                authors = [a.find('atom:name', ns).text for a in entry.findall('atom:author', ns)[:3] if a.find('atom:name', ns) is not None]

                entries.append({
                    "title": f"[{category_label}] {title}",
                    "summary": summary[:220] + '...' if len(summary) > 220 else summary,
                    "url": link,
                    "source": f"arXiv ({category_label})",
                    "category": "📄 arXiv Preprints",
                    "badge": f"{category_label}",
                    "authors": ", ".join(authors),
                    "published_at": published,
                    "tags": ["arxiv", "paper", category.lower()] + [c.lower() for c in category_label.split()]
                })
            return entries
    except Exception as e:
        print(f"[!] Error fetching arXiv {category}: {e}")
        return []

def get_security_advisories_cve():
    """Lấy danh sách các lỗ hổng bảo mật CVE & CWE mới nhất từ GitHub Security Advisories API."""
    url = "https://api.github.com/advisories?per_page=15"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StarHub/1.0',
        'Accept': 'application/vnd.github.v3+json'
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode('utf-8'))

        items = []
        for adv in data:
            cve_id = adv.get('cve_id') or adv.get('ghsa_id') or 'CVE'
            cwes = [c.get('cwe_id') for c in adv.get('cwes', []) if c.get('cwe_id')]
            cwe_str = f" ({', '.join(cwes)})" if cwes else ""
            severity = (adv.get('severity') or 'medium').upper()
            summary = adv.get('summary') or ''
            gh_url = adv.get('html_url') or f"https://github.com/advisories/{adv.get('ghsa_id')}"
            published = (adv.get('published_at') or '')[:10] or "Gần đây"

            items.append({
                "title": f"[{severity}] {cve_id}{cwe_str}: {summary}",
                "summary": adv.get('description', summary)[:220] + '...' if len(adv.get('description', summary)) > 220 else adv.get('description', summary),
                "url": gh_url,
                "source": "CVE & Security Advisory",
                "category": "🛡️ Lỗ Hổng CVE/CWE",
                "badge": f"{severity}",
                "published_at": published,
                "tags": ["cve", "cwe", "security", "vulnerability"] + [c.lower() for c in cwes]
            })
        return items
    except Exception as e:
        print(f"[!] Security Advisories fetch error: {e}")
        return []

def get_x_tech_trending_topics():
    """Tổng hợp các chủ đề công nghệ & AI đang thịnh hành trên X/Twitter & Dev communities."""
    return [
        {
            "title": "#ClaudeCode & Agent Skills Ecosystem on X",
            "summary": "Cộng đồng lập trình viên trên X chia sẻ các workflow tự động hóa với Claude Code, tích hợp Agent Skills và MCP custom tools.",
            "url": "https://x.com/search?q=%23ClaudeCode",
            "source": "X (Twitter) Tech",
            "category": "🌐 X (Twitter) Trends",
            "badge": "Trending on X",
            "published_at": "Hôm nay",
            "tags": ["claudecode", "x-trending", "agents", "mcp"]
        },
        {
            "title": "#DeepSeek V3 / R1 Open Research Discussions",
            "summary": "Các kỹ sư AI phân tích kiến trúc Multi-Head Latent Attention và chiến lược tối ưu suy luận mã nguồn mở của DeepSeek.",
            "url": "https://x.com/search?q=%23DeepSeek",
            "source": "X (Twitter) Tech",
            "category": "🌐 X (Twitter) Trends",
            "badge": "Trending on X",
            "published_at": "Hôm nay",
            "tags": ["deepseek", "r1", "reasoning", "open-weights"]
        },
        {
            "title": "#ZeroDay & Cyber Threat Intelligence Feeds",
            "summary": "Cập nhật các phân tích kỹ thuật về reverse engineering, lỗ hổng zero-day và kỹ thuật bypass bảo mật mới nhất.",
            "url": "https://x.com/search?q=%23CyberSecurity",
            "source": "X (Twitter) Tech",
            "category": "🌐 X (Twitter) Trends",
            "badge": "Security Alert",
            "published_at": "Tuần này",
            "tags": ["zeroday", "security", "reverse-engineering", "cve"]
        },
        {
            "title": "#RustLang & High Performance Systems Discussions",
            "summary": "Xu hướng viết lại các công cụ CLI, parsers và web servers bằng Rust để đạt hiệu năng tối đa và an toàn bộ nhớ.",
            "url": "https://x.com/search?q=%23RustLang",
            "source": "X (Twitter) Tech",
            "category": "🌐 X (Twitter) Trends",
            "badge": "Dev Trends",
            "published_at": "Mới cập nhật",
            "tags": ["rust", "systems", "performance", "cli"]
        }
    ]

def get_hacker_news_top_stories():
    """Lấy các bài viết công nghệ và AI nổi bật nhất từ Hacker News API."""
    try:
        req = urllib.request.Request(
            'https://hacker-news.firebaseio.com/v0/topstories.json',
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            ids = json.loads(resp.read().decode('utf-8'))[:15]

        stories = []
        for sid in ids:
            try:
                item_req = urllib.request.Request(
                    f'https://hacker-news.firebaseio.com/v0/item/{sid}.json',
                    headers={'User-Agent': 'Mozilla/5.0'}
                )
                with urllib.request.urlopen(item_req, timeout=2.5) as iresp:
                    s = json.loads(iresp.read().decode('utf-8'))
                    if s and s.get('title') and s.get('url'):
                        stories.append({
                            "title": s.get('title'),
                            "summary": f"Hacker News ({s.get('score', 0)} pts, {s.get('descendants', 0)} comments) by @{s.get('by', 'anon')}",
                            "url": s.get('url'),
                            "source": "Hacker News",
                            "category": "📰 Hacker News Tech",
                            "badge": f"{s.get('score', 0)} pts",
                            "upvotes": s.get('score', 0),
                            "published_at": "Hôm nay",
                            "tags": ["hackernews", "tech-news", "discussion"]
                        })
            except Exception:
                continue
        return stories
    except Exception as e:
        print(f"[!] Hacker News fetch error: {e}")
        return []

def get_huggingface_daily_papers():
    """Lấy danh sách các bài báo nghiên cứu AI mới nhất từ Hugging Face Daily Papers API."""
    url = "https://huggingface.co/api/daily_papers"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StarHub/1.0'}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode('utf-8'))

        items = []
        for p in data[:20]:
            paper = p.get('paper', {})
            title = paper.get('title', '')
            summary = paper.get('summary', '')
            paper_id = paper.get('id', '')
            upvotes = paper.get('upvotes', 0)
            authors = [a.get('name') for a in paper.get('authors', [])[:3]]

            items.append({
                "title": title,
                "summary": summary[:220] + '...' if len(summary) > 220 else summary,
                "url": f"https://huggingface.co/papers/{paper_id}",
                "source": "Hugging Face Daily Papers",
                "category": "🧪 Hugging Face Papers",
                "badge": f"⭐ {upvotes}",
                "upvotes": upvotes,
                "authors": ", ".join(authors),
                "published_at": p.get('publishedAt', '')[:10] or "Hôm nay",
                "tags": ["paper", "arxiv", "ai-research"]
            })
        return items
    except Exception as e:
        print(f"[!] HF Papers error: {e}")
        return []

def get_ai_ecosystem_radar():
    """Tổng hợp tin tức & mô hình từ các lab AI lớn."""
    return [
        {
            "title": "Anthropic Claude Code & Agent Skills Ecosystem",
            "summary": "Agent coding CLI hoạt động trực tiếp trong terminal với khả năng hiểu ngữ cảnh toàn diện repository, tích hợp Agent Skills và MCP servers.",
            "url": "https://github.com/anthropics/claude-code",
            "source": "Anthropic / Claude",
            "category": "🤖 AI Lab Releases",
            "badge": "Agent Skills",
            "published_at": "Mới cập nhật",
            "tags": ["claude", "claude-code", "agent-skills", "anthropic"]
        },
        {
            "title": "DeepSeek Harness, R1 Reasoning & Open Weights",
            "summary": "DeepSeek Harness và mô hình suy luận R1 mở rộng kiến trúc Plugin mở, tối ưu chi phí suy luận và mã nguồn mở toàn diện.",
            "url": "https://github.com/deepseek-ai/deepseek-harness",
            "source": "DeepSeek AI",
            "category": "🤖 AI Lab Releases",
            "badge": "Open Weights",
            "published_at": "Hôm nay",
            "tags": ["deepseek", "r1", "harness", "open-weights"]
        },
        {
            "title": "Google Gemini 2.0 Flash & Gemma 2 Open Models",
            "summary": "Dòng mô hình đa phương thức tốc độ cao, hỗ trợ tool-use và reasoning thời gian thực từ Google DeepMind.",
            "url": "https://github.com/google-gemini",
            "source": "Google DeepMind",
            "category": "🤖 AI Lab Releases",
            "badge": "Multimodal",
            "published_at": "Tuần này",
            "tags": ["gemini", "gemma", "google", "multimodal"]
        },
        {
            "title": "Zhipu AI (GLM-5 / GLM-4) Open Foundation Models",
            "summary": "Mô hình ngôn ngữ lớn thế hệ mới tối ưu hoá xử lý văn bản song ngữ, tool-calling và suy luận logic chuyên sâu.",
            "url": "https://github.com/THUDM/GLM-4",
            "source": "Zhipu AI / THUDM",
            "category": "🤖 AI Lab Releases",
            "badge": "Foundation",
            "published_at": "Tháng này",
            "tags": ["glm", "glm-5", "zhipu", "thudm"]
        },
        {
            "title": "NousResearch Hermes-3 & Open Source Agent Swarms",
            "summary": "Mô hình mã nguồn mở tối ưu cho việc tuân thủ lệnh phức tạp, function calling và tự động phát triển kỹ năng AI.",
            "url": "https://github.com/NousResearch/hermes-agent",
            "source": "NousResearch",
            "category": "🤖 AI Lab Releases",
            "badge": "Swarm Agents",
            "published_at": "Mới cập nhật",
            "tags": ["hermes", "nousresearch", "agents", "reasoning"]
        },
        {
            "title": "Model Context Protocol (MCP) Standard Ecosystem",
            "summary": "Chuẩn giao thức mở kết nối LLMs với các hệ thống dữ liệu, công cụ lập trình, databases và API bên ngoài.",
            "url": "https://github.com/modelcontextprotocol",
            "source": "MCP Ecosystem",
            "category": "🤖 AI Lab Releases",
            "badge": "MCP Standard",
            "published_at": "Xu hướng",
            "tags": ["mcp", "protocol", "tools", "connectors"]
        },
        {
            "title": "Qwen 2.5 / Qwen3.8 Coder & Vision Series",
            "summary": "Alibaba công bố mô hình chuyên biệt cho lập trình và thị giác máy tính với khả năng hiểu ngữ cảnh lên tới 128k tokens.",
            "url": "https://github.com/QwenLM/Qwen2.5-Coder",
            "source": "Alibaba Qwen",
            "category": "🤖 AI Lab Releases",
            "badge": "Coding LLM",
            "published_at": "Mới cập nhật",
            "tags": ["qwen", "qwen-coder", "alibaba"]
        }
    ]

def get_ai_pulse_data():
    now = time.time()
    if 'data' in PULSE_CACHE and now - PULSE_CACHE['timestamp'] < CACHE_TTL:
        return PULSE_CACHE['data']

    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                disk = json.load(f)
                if now - disk.get('timestamp', 0) < CACHE_TTL:
                    PULSE_CACHE['data'] = disk.get('data', [])
                    PULSE_CACHE['timestamp'] = disk.get('timestamp', 0)
                    return PULSE_CACHE['data']
        except Exception:
            pass

    # Fetch live multi-source intelligence
    conferences = get_flagship_conferences_and_platforms()
    arxiv_ai = fetch_arxiv_papers('cs.AI', max_results=8, category_label="cs.AI")
    arxiv_sec = fetch_arxiv_papers('cs.CR', max_results=8, category_label="cs.CR Security")
    cve_items = get_security_advisories_cve()
    hf_papers = get_huggingface_daily_papers()
    hn_items = get_hacker_news_top_stories()
    x_items = get_x_tech_trending_topics()
    ecosystem = get_ai_ecosystem_radar()

    combined = conferences + arxiv_ai + arxiv_sec + hf_papers + cve_items + hn_items + x_items + ecosystem

    PULSE_CACHE['data'] = combined
    PULSE_CACHE['timestamp'] = now

    try:
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump({'timestamp': now, 'data': combined}, f, ensure_ascii=False)
    except Exception:
        pass

    return combined
