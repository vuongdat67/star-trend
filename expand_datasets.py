# -*- coding: utf-8 -*-
import os
import json
import time

base = r'e:\repo'
data_dir = os.path.join(base, 'data')
os.makedirs(data_dir, exist_ok=True)

# 1. READ JOBS
with open(os.path.join(data_dir, 'jobs.json'), 'r', encoding='utf-8') as f:
    jobs_data = json.load(f)

print(f"Jobs: {len(jobs_data.get('sample_jobs', []))} positions, {len(jobs_data.get('platforms', []))} platform categories.")

# 2. EXPAND AI PULSE (100+ items with clean categories and rich technical detail)
flagship_conferences = [
    {
        "id": "neurips-2026",
        "title": "NeurIPS 2026 – Neural Information Processing Systems (CCF-A / CORE A*)",
        "summary": "Hội nghị cờ đầu toàn cầu về Học máy & Deep Learning. Tổ chức bởi NeurIPS Foundation tập trung vào các đột phá trong mô hình nền tảng, học tăng cường và lý thuyết học máy.",
        "url": "https://neurips.cc/",
        "source": "Top Conference",
        "category": "Hội Nghị Đỉnh Cao (CCF-A)",
        "badge": "NeurIPS (AI/ML)",
        "published_at": "Hội nghị 2026",
        "tags": ["neurips", "machine-learning", "deep-learning", "ccf-a", "core-a*"]
    },
    {
        "id": "iclr-2026",
        "title": "ICLR 2026 – International Conference on Learning Representations (CORE A*)",
        "summary": "Hội nghị hàng đầu thế giới về kiến trúc mạng neural, representation learning, transformers và foundational AI models.",
        "url": "https://iclr.cc/",
        "source": "Top Conference",
        "category": "Hội Nghị Đỉnh Cao (CCF-A)",
        "badge": "ICLR (Deep Learning)",
        "published_at": "Hội nghị 2026",
        "tags": ["iclr", "representation-learning", "transformers", "core-a*"]
    },
    {
        "id": "ieee-sp-2026",
        "title": "IEEE S&P 2026 – Symposium on Security and Privacy (Oakland) (CCF-A / CORE A*)",
        "summary": "Hội nghị danh giá bậc nhất thế giới về An toàn thông tin, mật mã học, phân tích mã độc và kiến trúc bảo mật hệ thống.",
        "url": "https://sp2026.ieee-security.org/",
        "source": "Top Conference",
        "category": "Hội Nghị Đỉnh Cao (CCF-A)",
        "badge": "IEEE S&P (Security)",
        "published_at": "Big-Four Security",
        "tags": ["ieee-sp", "oakland", "security", "cryptography", "ccf-a"]
    },
    {
        "id": "usenix-sec-2026",
        "title": "USENIX Security 2026 – USENIX Security Symposium (CCF-A / CORE A*)",
        "summary": "Hội nghị đỉnh cao về bảo mật ứng dụng thực chiến, reverse engineering, lỗ hổng zero-day, sandbox evasion và firmware security.",
        "url": "https://www.usenix.org/conference/usenixsecurity26",
        "source": "Top Conference",
        "category": "Hội Nghị Đỉnh Cao (CCF-A)",
        "badge": "USENIX Sec",
        "published_at": "Big-Four Security",
        "tags": ["usenix-security", "vulnerability", "exploit", "ccf-a"]
    },
    {
        "id": "acm-ccs-2026",
        "title": "ACM CCS 2026 – Conference on Computer and Communications Security (CCF-A / CORE A*)",
        "summary": "Hội nghị an ninh mạng cờ đầu của ACM, diễn ra tại The Hague với các công trình nghiên cứu bảo mật mạng và quyền riêng tư.",
        "url": "https://www.sigsac.org/ccs/CCS2026/",
        "source": "Top Conference",
        "category": "Hội Nghị Đỉnh Cao (CCF-A)",
        "badge": "ACM CCS",
        "published_at": "Big-Four Security",
        "tags": ["acm-ccs", "security", "network-security", "ccf-a"]
    },
    {
        "id": "ndss-2026",
        "title": "NDSS 2026 – Network and Distributed System Security Symposium (CCF-A / CORE A*)",
        "summary": "Mảnh ghép thứ 4 trong Big-Four Security, chuyên sâu về mạng máy tính, giao thức phân tán an toàn và bảo mật hạ tầng viễn thông.",
        "url": "https://www.ndss-symposium.org/",
        "source": "Top Conference",
        "category": "Hội Nghị Đỉnh Cao (CCF-A)",
        "badge": "NDSS",
        "published_at": "Big-Four Security",
        "tags": ["ndss", "distributed-security", "network", "ccf-a"]
    },
    {
        "id": "cvpr-2026",
        "title": "CVPR 2026 – IEEE / CVF Computer Vision & Pattern Recognition (CCF-A / CORE A*)",
        "summary": "Hội nghị số 1 thế giới về Thị giác máy tính, Multimodal, 3D Reconstruction và Diffusion Generative Models.",
        "url": "https://cvpr.thecvf.com/",
        "source": "Top Conference",
        "category": "Hội Nghị Đỉnh Cao (CCF-A)",
        "badge": "CVPR (Vision)",
        "published_at": "Hội nghị 2026",
        "tags": ["cvpr", "computer-vision", "multimodal", "ccf-a"]
    },
    {
        "id": "acl-2026",
        "title": "ACL 2026 – Meeting of the Association for Computational Linguistics (CCF-A / CORE A*)",
        "summary": "Hội nghị hàng đầu thế giới về Xử lý ngôn ngữ tự nhiên (NLP), Large Language Models và đánh giá năng lực suy luận ngữ nghĩa.",
        "url": "https://www.aclweb.org/",
        "source": "Top Conference",
        "category": "Hội Nghị Đỉnh Cao (CCF-A)",
        "badge": "ACL (NLP & LLM)",
        "published_at": "Hội nghị 2026",
        "tags": ["acl", "nlp", "llm", "linguistics", "ccf-a"]
    },
    {
        "id": "osdi-sosp-2026",
        "title": "OSDI / SOSP 2026 – Operating Systems Design and Implementation (CCF-A / CORE A*)",
        "summary": "Hai hội nghị danh giá nhất thế giới về Hệ điều hành, hạt nhân Linux/Unix, hạ tầng tính toán đám mây và hệ thống lưu trữ phân tán.",
        "url": "https://www.usenix.org/conference/osdi26",
        "source": "Top Conference",
        "category": "Hội Nghị Đỉnh Cao (CCF-A)",
        "badge": "OSDI / SOSP (Systems)",
        "published_at": "Systems CCF-A",
        "tags": ["osdi", "sosp", "systems", "kernel", "os", "ccf-a"]
    },
    {
        "id": "icml-2026",
        "title": "ICML 2026 – International Conference on Machine Learning (CCF-A / CORE A*)",
        "summary": "Hội nghị khoa học uy tín về thuật toán học máy, lý thuyết tối ưu hóa toán học và các phương pháp học biểu diễn dữ liệu hiện đại.",
        "url": "https://icml.cc/",
        "source": "Top Conference",
        "category": "Hội Nghị Đỉnh Cao (CCF-A)",
        "badge": "ICML (Machine Learning)",
        "published_at": "Hội nghị 2026",
        "tags": ["icml", "machine-learning", "algorithms", "ccf-a"]
    },
    {
        "id": "sigcomm-2026",
        "title": "ACM SIGCOMM 2026 – Applications, Technologies, Architectures, and Protocols for Computer Communication",
        "summary": "Hội nghị thường niên hàng đầu thế giới về mạng máy tính, giao thức định tuyến BGP, SDN và kiến trúc mạng trung tâm dữ liệu.",
        "url": "https://www.sigcomm.org/",
        "source": "Top Conference",
        "category": "Hội Nghị Đỉnh Cao (CCF-A)",
        "badge": "SIGCOMM (Networking)",
        "published_at": "Networks CCF-A",
        "tags": ["sigcomm", "networking", "protocols", "ccf-a"]
    },
    {
        "id": "eurocrypt-2026",
        "title": "EUROCRYPT 2026 – Annual International Conference on the Theory and Applications of Cryptographic Techniques",
        "summary": "Hội nghị đỉnh cao về mật mã lý thuyết, Zero-Knowledge Proofs, mật mã lượng tử (Post-Quantum Cryptography) và bảo mật blockchain.",
        "url": "https://eurocrypt.iacr.org/",
        "source": "Top Conference",
        "category": "Hội Nghị Đỉnh Cao (CCF-A)",
        "badge": "EUROCRYPT (Crypto)",
        "published_at": "Crypto Top",
        "tags": ["crypto", "cryptography", "zkp", "post-quantum"]
    }
]

# Read existing ai_pulse.json if available to merge live feeds
existing_items = []
if os.path.exists(os.path.join(data_dir, 'ai_pulse.json')):
    try:
        with open(os.path.join(data_dir, 'ai_pulse.json'), 'r', encoding='utf-8') as f:
            raw = json.load(f)
            existing_items = raw.get('data', []) or raw.get('items', [])
    except Exception:
        pass

# Clean categories and titles in existing items
cleaned_existing = []
for it in existing_items:
    it_copy = dict(it)
    # Remove emoji prefixes in category and source
    cat = it_copy.get('category', '')
    cat_clean = cat.replace('🏛️ ', '').replace('📄 ', '').replace('🧪 ', '').replace('🛡️ ', '').replace('📰 ', '').replace('🌐 ', '').replace('🤖 ', '')
    it_copy['category'] = cat_clean
    cleaned_existing.append(it_copy)

# Merge flagship conferences + cleaned existing
seen_titles = set()
all_pulse_items = []

for item in flagship_conferences + cleaned_existing:
    t = item.get('title', '').strip()
    if t and t not in seen_titles:
        seen_titles.add(t)
        all_pulse_items.append(item)

# Save ai_pulse.json
pulse_output = {
    "timestamp": time.time(),
    "items": all_pulse_items,
    "data": all_pulse_items
}

with open(os.path.join(data_dir, 'ai_pulse.json'), 'w', encoding='utf-8') as f:
    json.dump(pulse_output, f, ensure_ascii=False, indent=2)

print(f"Generated data/ai_pulse.json with {len(all_pulse_items)} radar items.")

# Clean services files
for s_name in ['ai_pulse_service.py', 'jobs_service.py']:
    s_path = os.path.join(base, 'services', s_name)
    if os.path.exists(s_path):
        with open(s_path, 'r', encoding='utf-8') as f:
            stext = f.read()
        for em in ['🏛️ ', '📄 ', '🧪 ', '🛡️ ', '📰 ', '🌐 ', '🤖 ', '📌 ', '💻 ', '🎮 ', '☁️ ', '📊 ']:
            stext = stext.replace(em, '')
        with open(s_path, 'w', encoding='utf-8') as f:
            f.write(stext)
        print(f"Cleaned {s_name}")

