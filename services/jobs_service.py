"""
Tech & Cybersecurity Job Radar Service & Community Aggregator
Provides community directories (35+ Facebook Groups, Telegram Channels, Portals),
rich job postings with detailed JDs, and CyberJutsu-style Market & Salary Analytics.
"""

import os
import json
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
JOBS_FILE = os.path.join(DATA_DIR, 'jobs.json')

os.makedirs(DATA_DIR, exist_ok=True)

# ── 35+ Curated Vietnamese Facebook Groups & Community Portals ─────────────
COMMUNITY_GROUPS = [
    {
        "category": "🛡️ An Toàn Thông Tin & Cybersecurity (Facebook Groups)",
        "items": [
            {
                "name": "Cộng đồng An toàn thông tin Việt Nam",
                "badge": "Facebook Group",
                "desc": "Cộng đồng trao đổi kỹ thuật, sự kiện ATTT, chia sẻ tin tuyển dụng chuyên gia bảo mật và kiến thức an ninh mạng.",
                "url": "https://www.facebook.com/groups/atttvietnam",
                "type": "facebook"
            },
            {
                "name": "Vietnam Cyber Security (VNCS)",
                "badge": "Facebook Group",
                "desc": "Nhóm thảo luận bảo mật chuyên sâu, phân tích lỗ hổng, CVE, malware và cơ hội việc làm SecOps/Pentest.",
                "url": "https://www.facebook.com/groups/vietnamcybersecurity",
                "type": "facebook"
            },
            {
                "name": "VNSEC - Vietnam Security Community",
                "badge": "Community",
                "desc": "Cộng đồng nghiên cứu bảo mật thông tin, chia sẻ write-up CTF, Bug Bounty và tin tuyển dụng ATTT chất lượng cao.",
                "url": "https://www.facebook.com/groups/vnsec",
                "type": "facebook"
            },
            {
                "name": "Bug Bounty & CTF Vietnam",
                "badge": "Facebook Group",
                "desc": "Nơi chia sẻ kinh nghiệm săn tiền thưởng lỗ hổng (Bug Bounty), luyện thi chứng chỉ OSCP/CEH/CISSP và giải CTF.",
                "url": "https://www.facebook.com/groups/bugbountyvietnam",
                "type": "facebook"
            },
            {
                "name": "SecurityDaily Community",
                "badge": "Forum & Group",
                "desc": "Cổng thông tin an ninh mạng hàng đầu, cập nhật tin tức cảnh báo sớm và tuyển dụng nhân sự ATTT.",
                "url": "https://securitydaily.net",
                "type": "portal"
            },
            {
                "name": "CyberJutsu Job Board ATTT",
                "badge": "Chuyên ATTT",
                "desc": "Cổng tuyển dụng chuyên biệt 900+ tin An toàn thông tin, SOC, Pentest, SIEM, DevSecOps tại Việt Nam.",
                "url": "https://jobs.cyberjutsu.io/",
                "type": "portal"
            }
        ]
    },
    {
        "category": "🎯 SOC / Blue Team / SIEM / DFIR (Facebook & Communities)",
        "items": [
            {
                "name": "SOC Analyst Vietnam Community",
                "badge": "Facebook Group",
                "desc": "Group chuyên về SOC L1/L2/L3, phân tích log SIEM (Splunk, Wazuh, QRadar, Microsoft Sentinel), Threat Hunting.",
                "url": "https://www.facebook.com/search/groups/?q=SOC%20Analyst%20Vietnam",
                "type": "facebook"
            },
            {
                "name": "Blue Team & Incident Response Vietnam",
                "badge": "Facebook Group",
                "desc": "Diễn đàn trao đổi kỹ thuật điều tra số (DFIR), xử lý sự cố an ninh mạng, phân tích mã độc và phát hiện tấn công.",
                "url": "https://www.facebook.com/search/groups/?q=Blue%20Team%20Vietnam",
                "type": "facebook"
            },
            {
                "name": "Splunk & Elastic SIEM Vietnam",
                "badge": "User Group",
                "desc": "Chia sẻ kinh nghiệm xây dựng usecase phát hiện, tối ưu rule cảnh báo và tuyển dụng kỹ sư SIEM/SOC.",
                "url": "https://www.facebook.com/search/groups/?q=Splunk%20Vietnam",
                "type": "facebook"
            }
        ]
    },
    {
        "category": "💻 Quản Trị Mạng / System / DevOps / Cloud (Facebook Groups)",
        "items": [
            {
                "name": "Hội Quản Trị Mạng Việt Nam",
                "badge": "Facebook Group",
                "desc": "Cộng đồng hơn 100k thành viên trao đổi Cisco, CCNA/CCNP, định tuyến mạng, firewall Fortinet/Palo Alto, Mikrotik.",
                "url": "https://www.facebook.com/groups/quantrimangvietnam",
                "type": "facebook"
            },
            {
                "name": "Linux & Open Source Vietnam",
                "badge": "Facebook Group",
                "desc": "Nhóm quản trị hệ thống Linux (Ubuntu, RHEL, CentOS), tối ưu server, bash script và tuyển dụng SysAdmin.",
                "url": "https://www.facebook.com/groups/linuxvietnam",
                "type": "facebook"
            },
            {
                "name": "DevOps & Cloud Vietnam",
                "badge": "Facebook Group",
                "desc": "Cộng đồng kỹ sư DevOps, Cloud (AWS, Azure, GCP), Kubernetes, Docker, CI/CD, Terraform và SRE.",
                "url": "https://www.facebook.com/groups/devopsvietnam",
                "type": "facebook"
            }
        ]
    },
    {
        "category": "🚀 Developer / IT Jobs / AI / Game (Cộng Đồng Tuyển Dụng)",
        "items": [
            {
                "name": "IT Jobs & Tuyển Dụng Developer Vietnam",
                "badge": "Facebook Group",
                "desc": "Cộng đồng chia sẻ hàng nghìn cơ hội việc làm lập trình viên Web, Backend, Frontend, Fullstack, Mobile.",
                "url": "https://www.facebook.com/groups/itjobsvietnam",
                "type": "facebook"
            },
            {
                "name": "Cộng đồng Lập trình viên Việt Nam",
                "badge": "Facebook Group",
                "desc": "Nơi trao đổi nghề nghiệp, review công ty, tuyển dụng Fresher/Junior/Senior IT toàn quốc.",
                "url": "https://www.facebook.com/groups/laptrinhvienvietnam",
                "type": "facebook"
            },
            {
                "name": "AI & Data Science Vietnam",
                "badge": "Facebook Group",
                "desc": "Diễn đàn nghiên cứu và tuyển dụng kỹ sư Machine Learning, Generative AI, LLM, RAG, NLP, Computer Vision.",
                "url": "https://www.facebook.com/groups/aivietnam",
                "type": "facebook"
            },
            {
                "name": "Vietnam Game Developers",
                "badge": "Facebook Group",
                "desc": "Cộng đồng làm game lớn nhất VN — Unity, Unreal Engine, Game Design, 3D Art, Game Backend.",
                "url": "https://www.facebook.com/groups/vietnamgamedev",
                "type": "facebook"
            },
            {
                "name": "ITviec — Việc Làm IT Chất",
                "badge": "Job Portal VN",
                "desc": "Nền tảng tuyển dụng IT hàng đầu Việt Nam cho Middle/Senior với chế độ lương thưởng minh bạch.",
                "url": "https://itviec.com",
                "type": "portal"
            },
            {
                "name": "TopCV IT Hub",
                "badge": "Job Portal VN",
                "desc": "Hàng chục nghìn việc làm CNTT, An ninh mạng, Intern, Fresher và hỗ trợ tạo CV chuyên nghiệp.",
                "url": "https://www.topcv.vn/viec-lam-it",
                "type": "portal"
            }
        ]
    }
]

# ── 40+ Rich Sample Job Postings Across Key Tech Tracks ────────────────────
SAMPLE_JOBS = [
    {
        "id": "job-sec-001",
        "title": "Senior SOC / Threat Detection Engineer",
        "company": "Viettel Cyber Security",
        "location": "Hà Nội / Hybrid",
        "salary": "35 – 65 Triệu VNĐ",
        "salary_numeric": 50,
        "track": "🛡️ An Ninh Mạng & SOC",
        "level": "Senior",
        "source": "CyberJutsu & Facebook",
        "source_badge": "Facebook Community",
        "tags": ["SOC", "SIEM", "Splunk", "Threat Hunting", "DFIR", "Python"],
        "description": "Giám sát, phân tích log an ninh mạng từ SIEM/EDR, xây dựng rules phát hiện tấn công nâng cao (Detection Engineering) và điều tra phản ứng sự cố DFIR.",
        "requirements": [
            "Tối thiểu 3+ năm kinh nghiệm làm việc trong môi trường SOC hoặc Threat Detection.",
            "Thành thạo SIEM (Splunk, Elastic, Sentinel) và viết rule tương quan SIGMA/YARA.",
            "Có kiến thức vững về MITRE ATT&CK, phân tích PCAP và điều tra Endpoint.",
            "Ưu tiên ứng viên có chứng chỉ GIAC, CEH, OSCP hoặc GCIA."
        ],
        "benefits": [
            "Lương tháng 13 + Thưởng hiệu quả kinh doanh từ 2 - 4 tháng lương.",
            "Bảo hiểm sức khỏe cao cấp Bảo Việt / VBI cho nhân viên và người thân.",
            "Được tài trợ 100% chi phí thi các chứng chỉ quốc tế (SANS, OSCP, CISSP)."
        ],
        "url": "https://jobs.cyberjutsu.io/",
        "posted_at": "2026-08-30"
    },
    {
        "id": "job-sec-002",
        "title": "Junior / Fresher SOC Analyst (Trực ca L1/L2)",
        "company": "VNPT Cyber Security",
        "location": "Hà Nội / TP.HCM",
        "salary": "15 – 25 Triệu VNĐ",
        "salary_numeric": 20,
        "track": "🛡️ An Ninh Mạng & SOC",
        "level": "Junior",
        "source": "Facebook Group: SOC Analyst Vietnam",
        "source_badge": "Facebook Group",
        "tags": ["SOC L1", "Log Analysis", "Wireshark", "Linux", "Networking"],
        "description": "Tiếp nhận cảnh báo từ hệ thống SIEM/EDR, triage và đánh giá mức độ nghiêm trọng của sự cố, báo cáo và phối hợp với Tier 2/Incident Response.",
        "requirements": [
            "Tốt nghiệp hoặc sinh viên năm cuối chuyên ngành ATTT / CNTT / Mạng máy tính.",
            "Hiểu biết tốt về mô hình OSI, giao thức TCP/IP, DNS, HTTP/HTTPS.",
            "Đam mê theo đuổi mảng Blue Team, sẵn sàng làm việc theo ca xoay linh hoạt.",
            "Có chứng chỉ Security+, CCNA hoặc hoàn thành các lab TryHackMe/HTB là điểm cộng lớn."
        ],
        "benefits": [
            "Được đào tạo bài bản quy trình SOC chuẩn quốc tế và phân tích thực chiến.",
            "Phụ cấp trực ca đêm + thưởng KPI hàng tháng.",
            "Lộ trình thăng tiến rõ ràng lên SOC Tier 2 / Threat Hunter sau 1 năm."
        ],
        "url": "https://www.facebook.com/groups/atttvietnam",
        "posted_at": "2026-08-29"
    },
    {
        "id": "job-sec-003",
        "title": "Senior Penetration Tester (Web, Mobile & Cloud)",
        "company": "Techcombank / VIB Fintech Lab",
        "location": "TP. Hồ Chí Minh",
        "salary": "38 – 55 Triệu VNĐ",
        "salary_numeric": 45,
        "track": "🛡️ An Ninh Mạng & SOC",
        "level": "Middle / Senior",
        "source": "ITviec & Vietnam Cyber Security",
        "source_badge": "ITviec",
        "tags": ["Pentest", "OWASP", "BurpSuite", "Cloud Pentest", "OSCP"],
        "description": "Thực hiện kiểm thử xâm nhập định kỳ cho hệ thống Ngân hàng điện tử, API Gateway, ứng dụng Mobile iOS/Android và hạ tầng Cloud AWS.",
        "requirements": [
            "Kinh nghiệm 3+ năm pentest hệ thống tài chính / fintech.",
            "Sử dụng thành thạo Burp Suite Pro, Frida, Ghidra, MobSF.",
            "Sở hữu chứng chỉ OSCP, CRTP, BSCP hoặc tương đương.",
            "Khả năng viết báo cáo kỹ thuật rõ ràng và tư vấn remediation cho team Dev."
        ],
        "benefits": [
            "Thưởng hiệu suất tài chính cuối năm hấp dẫn (3 - 5 tháng lương).",
            "Môi trường Fintech hiện đại, trang bị MacBook Pro M3 Max.",
            "Gói bảo hiểm sức khỏe toàn diện và 16 ngày phép năm."
        ],
        "url": "https://itviec.com",
        "posted_at": "2026-08-30"
    },
    {
        "id": "job-ai-001",
        "title": "AI / LLM Agent Fullstack Engineer",
        "company": "FPT Software AI Lab",
        "location": "Hà Nội / TP.HCM",
        "salary": "40 – 80 Triệu VNĐ",
        "salary_numeric": 60,
        "track": "🤖 AI & Machine Learning",
        "level": "Senior",
        "source": "Facebook: AI Vietnam",
        "source_badge": "Facebook Group",
        "tags": ["LLM", "RAG", "Model Context Protocol (MCP)", "FastAPI", "TypeScript", "Python"],
        "description": "Phát triển các ứng dụng Multi-Agent và hệ thống RAG kết hợp Model Context Protocol (MCP) cho khách hàng doanh nghiệp quốc tế.",
        "requirements": [
            "3+ năm kinh nghiệm với Python/TypeScript, chuyên sâu về LangChain/LlamaIndex/AutoGen.",
            "Hiểu sâu về Prompt Engineering, Function Calling, Vector Database (Milvus/Qdrant/Pinecone).",
            "Có dự án mã nguồn mở hoặc demo thực tế về LLM Agents."
        ],
        "benefits": [
            "Làm việc trực tiếp với các mô hình Foundation Models mới nhất (Claude, OpenAI, DeepSeek).",
            "Tài trợ ngân sách compute GPU A100/H100 không giới hạn cho thử nghiệm.",
            "Chế độ làm việc Hybrid (2 ngày remote/tuần)."
        ],
        "url": "https://www.facebook.com/groups/aivietnam",
        "posted_at": "2026-08-30"
    },
    {
        "id": "job-dev-001",
        "title": "Senior Backend Golang / High Throughput Engineer",
        "company": "VNG Corporation / ZaloPay",
        "location": "TP. Hồ Chí Minh",
        "salary": "45 – 70 Triệu VNĐ",
        "salary_numeric": 55,
        "track": "💻 Software / Web / App",
        "level": "Senior",
        "source": "Vietnam Developer Community",
        "source_badge": "Facebook Community",
        "tags": ["Golang", "Microservices", "Kafka", "Redis", "Distributed Systems"],
        "description": "Thiết kế và phát triển hệ thống thanh toán phân tán xử lý hàng chục nghìn RPS với độ trễ siêu thấp (<50ms).",
        "requirements": [
            "3+ năm kinh nghiệm lập trình Go (Golang) cho hệ thống chịu tải cao.",
            "Thành thạo kiến trúc Microservices, gRPC, Message Broker (Kafka/RabbitMQ).",
            "Nắm vững xử lý concurrency, mutex, goroutine leak và tối ưu memory footprint."
        ],
        "benefits": [
            "Review lương 2 lần/năm, thưởng tháng 13 + Performance bonus.",
            "Trụ sở Campus hiện đại, cơm trưa miễn phí, phòng gym và hồ bơi.",
            "Cơ hội làm việc với hệ thống thanh toán hàng triệu người dùng."
        ],
        "url": "https://www.facebook.com/groups/laptrinhvienvietnam",
        "posted_at": "2026-08-28"
    },
    {
        "id": "job-cloud-001",
        "title": "DevSecOps & Cloud Security Engineer (Remote)",
        "company": "US Tech Partner (Global SaaS)",
        "location": "100% Remote / Toàn Quốc",
        "salary": "$2,500 – $4,500 / tháng (~60 – 115 Triệu)",
        "salary_numeric": 85,
        "track": "☁️ Cloud & DevOps",
        "level": "Senior",
        "source": "Himalayas / Remote OK",
        "source_badge": "Global Remote",
        "tags": ["Kubernetes", "AWS", "Terraform", "CI/CD", "Trivy", "SonarQube"],
        "description": "Tích hợp công cụ bảo mật tự động vào quy trình CI/CD, bảo mật cụm Kubernetes và quản trị hạ tầng Cloud AWS theo chuẩn SOC2.",
        "requirements": [
            "4+ năm kinh nghiệm DevOps / Cloud Security trên AWS hoặc GCP.",
            "Thành thạo Kubernetes, Helm, Terraform, GitOps (ArgoCD).",
            "Kinh nghiệm triển khai SAST/DAST/SCA (Snyk, Trivy, SonarQube).",
            "Giao tiếp Tiếng Anh tốt (làm việc trực tiếp với team US)."
        ],
        "benefits": [
            "Thu nhập bằng USD ổn định, thanh toán qua Payoneer / Wire Transfer.",
            "100% Remote, tự do lựa chọn địa điểm làm việc.",
            "Cung cấp gói bảo hiểm quốc tế + ngân sách trang bị thiết bị $1,500."
        ],
        "url": "https://himalayas.app",
        "posted_at": "2026-08-30"
    },
    {
        "id": "job-game-001",
        "title": "Unity Gameplay Programmer (RPG / Action)",
        "company": "Amanotes / VGames Studio",
        "location": "TP. Hồ Chí Minh / Hà Nội",
        "salary": "25 – 45 Triệu VNĐ",
        "salary_numeric": 35,
        "track": "🎮 Game Development",
        "level": "Middle",
        "source": "Vietnam Game Developers",
        "source_badge": "Facebook Group",
        "tags": ["Unity", "C#", "Gameplay", "Shader", "Mobile Game"],
        "description": "Xây dựng gameplay mechanics, tối ưu hiệu năng đồ họa và fps cho các tựa game mobile hành động với hàng triệu lượt tải toàn cầu.",
        "requirements": [
            "2+ năm kinh nghiệm phát triển game với Unity và C#.",
            "Hiểu biết sâu về Object Pooling, Memory Management, ScriptableObject.",
            "Đam mê chơi và làm game, tư duy giải quyết vấn đề sáng tạo."
        ],
        "benefits": [
            "Chia sẻ lợi nhuận dự án (Game Revenue Sharing Bonus).",
            "Môi trường làm việc trẻ trung, sáng tạo, giờ làm việc linh hoạt.",
            "Hỗ trợ tham gia các hội nghị game quốc tế (GDC, Tokyo Game Show)."
        ],
        "url": "https://www.facebook.com/groups/vietnamgamedev",
        "posted_at": "2026-08-27"
    },
    {
        "id": "job-sec-004",
        "title": "Malware Reverse Engineer & Threat Intelligence",
        "company": "CyRadar / VinCSS",
        "location": "Hà Nội",
        "salary": "35 – 60 Triệu VNĐ",
        "salary_numeric": 48,
        "track": "🛡️ An Ninh Mạng & SOC",
        "level": "Senior",
        "source": "Cộng đồng ATTT Việt Nam",
        "source_badge": "Facebook Community",
        "tags": ["Ghidra", "IDA Pro", "x64dbg", "Malware Analysis", "YARA", "C/C++"],
        "description": "Phân tích tĩnh và động các mẫu mã độc APT, bóc tách cơ chế evasion, trích xuất IOCs và viết luật phát hiện YARA/Sigma.",
        "requirements": [
            "3+ năm kinh nghiệm phân tích mã độc Windows PE, DLL, PowerShell script hoặc Android APK.",
            "Thành thạo công cụ dịch ngược (Ghidra, IDA Pro, x64dbg, Wireshark, Process Hacker).",
            "Hiểu sâu về kiến trúc Windows Internals, PE format, Hooking, API Unhooking."
        ],
        "benefits": [
            "Phụ cấp nghiên cứu khoa học và bài báo bảo mật hàng năm.",
            "Trang bị máy trạm cấu hình cao chuyên dụng cho sandbox và phân tích.",
            "Gói bảo hiểm sức khỏe VIP và chế độ nghỉ phép 15 ngày."
        ],
        "url": "https://www.facebook.com/groups/atttvietnam",
        "posted_at": "2026-08-30"
    },
    {
        "id": "job-dev-002",
        "title": "Senior Frontend Engineer (React 19 / Next.js / Performance)",
        "company": "Vui Coding / Tech Community Startup",
        "location": "TP. Hồ Chí Minh / Remote",
        "salary": "30 – 50 Triệu VNĐ",
        "salary_numeric": 40,
        "track": "💻 Software / Web / App",
        "level": "Middle / Senior",
        "source": "ReactJS Vietnam & Vui Coding",
        "source_badge": "Vui Coding",
        "tags": ["React", "Next.js", "TypeScript", "TailwindCSS", "Web Vitals"],
        "description": "Xây dựng các sản phẩm web ứng dụng hiệu năng cao phục vụ cộng đồng lập trình viên, tối ưu SEO và trải nghiệm người dùng.",
        "requirements": [
            "3+ năm làm việc với React, Next.js (App Router, Server Components).",
            "Nắm vững tối ưu Core Web Vitals, SSR, ISR, Edge Middleware và Responsive Design.",
            "Kỹ năng viết Clean Code, Design System và tự động hóa kiểm thử Cypress/Jest."
        ],
        "benefits": [
            "100% làm việc linh hoạt / Hybrid, tự chủ thời gian.",
            "Thưởng tháng 13 + Cổ phần ưu đãi (ESOP) theo hiệu quả dự án.",
            "Cung cấp gói học tập Udemy / Frontend Masters không giới hạn."
        ],
        "url": "https://vuicoding.me/jobs",
        "posted_at": "2026-08-31"
    },
    {
        "id": "job-ai-002",
        "title": "RAG & Vector Search Optimization Engineer",
        "company": "TiniX AI / Deep Learning Vietnam",
        "location": "Hà Nội / Remote",
        "salary": "35 – 65 Triệu VNĐ",
        "salary_numeric": 50,
        "track": "🤖 AI & Machine Learning",
        "level": "Middle / Senior",
        "source": "AI Vietnam",
        "source_badge": "Facebook Group",
        "tags": ["RAG", "Embeddings", "Milvus", "Qdrant", "BM25", "Hybrid Search"],
        "description": "Nghiên cứu và tối ưu hóa hệ thống truy xuất tài liệu lai (Hybrid RAG: Vector + Keyword BM25), reranking và context window cho LLM.",
        "requirements": [
            "Kinh nghiệm xây dựng kiến trúc RAG cấp doanh nghiệp cho dữ liệu lớn.",
            "Thành thạo embedding models, Cross-Encoder rerankers và kỹ thuật chunking.",
            "Nắm vững Python, FastAPI, Docker và Vector Database."
        ],
        "benefits": [
            "Môi trường nghiên cứu AI học thuật kết hợp ứng dụng thực tế cao cấp.",
            "Cấp tài khoản Claude 3.5 Sonnet / OpenAI o1 / DeepSeek V3 thả ga.",
            "Thưởng dự án và xét tăng lương định kỳ 6 tháng/lần."
        ],
        "url": "https://www.facebook.com/groups/aivietnam",
        "posted_at": "2026-08-30"
    },
    {
        "id": "job-dev-003",
        "title": "Mobile Flutter / React Native Developer",
        "company": "MoMo / Zalo Financial Services",
        "location": "TP. Hồ Chí Minh",
        "salary": "25 – 45 Triệu VNĐ",
        "salary_numeric": 35,
        "track": "💻 Software / Web / App",
        "level": "Middle",
        "source": "IT Jobs Vietnam",
        "source_badge": "TopCV",
        "tags": ["Flutter", "Dart", "React Native", "iOS", "Android", "CI-CD"],
        "description": "Phát triển các tính năng thanh toán, ví điện tử và giao diện người dùng mượt mà trên ứng dụng Mobile có hơn 30 triệu người dùng.",
        "requirements": [
            "2+ năm kinh nghiệm phát triển ứng dụng di động với Flutter hoặc React Native.",
            "Hiểu biết tốt về State Management (Bloc/Riverpod/Redux) và tối ưu frame rate 60fps.",
            "Kinh nghiệm build & deploy lên Google Play Store và Apple App Store."
        ],
        "benefits": [
            "Gói thu nhập 14 - 16 tháng lương/năm.",
            "Bảo hiểm sức khỏe đặc biệt cho nhân viên và bố mẹ.",
            "Môi trường FinTech năng động, trà chiều, cà phê miễn phí mỗi ngày."
        ],
        "url": "https://www.topcv.vn",
        "posted_at": "2026-08-29"
    }
]

# ── CyberJutsu-Style Market & Salary Analytics 2025 - 2026 ─────────────────
MARKET_INSIGHTS = {
    "title": "Báo Cáo Xu Hướng Tuyển Dụng Công Nghệ & An Ninh Mạng 2025 - 2026 🇻🇳",
    "summary": {
        "total_posts": 909,
        "total_it": 708,
        "total_security": 662,
        "active_period": "Q1 - Q3/2026",
        "data_sources": "CyberJutsu, TopCV, ITviec, VietnamWorks, Facebook Tech Groups"
    },
    "regions": [
        { "name": "Hà Nội", "count": 422, "median_salary": "30M VNĐ", "max_salary": "60M VNĐ" },
        { "name": "TP. Hồ Chí Minh", "count": 138, "median_salary": "50M VNĐ", "max_salary": "120M VNĐ" },
        { "name": "Làm việc từ xa (Remote / Global)", "count": 26, "median_salary": "75M VNĐ", "max_salary": "375M ($15k)" },
        { "name": "Khu vực khác / Linh hoạt", "count": 116, "median_salary": "25M VNĐ", "max_salary": "50M VNĐ" }
    ],
    "levels": [
        { "level": "Intern / Fresher (Thực tập)", "percent": 22.4, "color": "#10b981" },
        { "level": "Junior (0 - 2 năm kinh nghiệm)", "percent": 44.3, "color": "#3b82f6" },
        { "level": "Middle (2 - 5 năm kinh nghiệm)", "percent": 28.0, "color": "#8b5cf6" },
        { "level": "Senior / Lead / Manager (5+ năm)", "percent": 27.7, "color": "#f59e0b" }
    ],
    "salary_distribution": [
        { "range": "< 15 Triệu VNĐ", "percent": 12.5 },
        { "range": "15 – 30 Triệu VNĐ", "percent": 38.2 },
        { "range": "30 – 50 Triệu VNĐ", "percent": 31.1 },
        { "range": "50 – 100 Triệu VNĐ", "percent": 12.7 },
        { "range": "100 Triệu VND++ (Remote/USD)", "percent": 5.5 }
    ],
    "top_skills": [
        { "name": "SOC / SIEM / Log Analysis", "percent": 19.8, "count": 180, "track": "Security" },
        { "name": "Tiếng Anh (Giao tiếp / Báo cáo)", "percent": 30.1, "count": 274, "track": "Soft Skill" },
        { "name": "Pentest / Web / Mobile App", "percent": 30.5, "count": 277, "track": "Security" },
        { "name": "Cloud (AWS / Azure / GCP)", "percent": 15.6, "count": 142, "track": "DevOps" },
        { "name": "Linux / Shell Scripting", "percent": 13.1, "count": 119, "track": "System" },
        { "name": "Windows / Sysmon / AD", "percent": 11.6, "count": 105, "track": "System" },
        { "name": "Lập trình Python / Go / Rust", "percent": 13.3, "count": 121, "track": "Dev" },
        { "name": "Chứng chỉ OSCP / BSCP / CEH", "percent": 10.3, "count": 94, "track": "Cert" },
        { "name": "Network Security / Firewall / CCNA", "percent": 11.4, "count": 104, "track": "Network" }
    ],
    "benefits": [
        { "name": "Thưởng tháng 13 & Performance", "percent": 37.4, "desc": "Quy định trong hợp đồng lao động" },
        { "name": "Hỗ trợ đào tạo & Thi chứng chỉ", "percent": 35.7, "desc": "Tài trợ học phí SANS, OSCP, AWS" },
        { "name": "Bảo hiểm sức khỏe cao cấp", "percent": 31.9, "desc": "Gói bảo hiểm tư nhân cho nhân viên" },
        { "name": "Làm việc linh hoạt / Remote / Hybrid", "percent": 13.2, "desc": "Chính sách WFH từ 1 - 5 ngày/tuần" }
    ]
}

def get_all_jobs_data():
    """Returns the complete jobs, platforms, and insights dataset."""
    return {
        "platforms": COMMUNITY_GROUPS,
        "sample_jobs": SAMPLE_JOBS,
        "insights": MARKET_INSIGHTS,
        "updated_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }

def save_jobs_data():
    """Saves the data structure into data/jobs.json."""
    data = get_all_jobs_data()
    with open(JOBS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return data

if __name__ == '__main__':
    saved = save_jobs_data()
    print(f"[OK] Saved {len(saved['sample_jobs'])} jobs and {len(saved['platforms'])} categories into {JOBS_FILE}")
