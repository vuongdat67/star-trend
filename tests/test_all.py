"""
Automated Test Suite for Star-Trend Hub
Runs unit tests, data integrity checks, and API endpoint verification.
Usage:
    python -m unittest tests/test_all.py
"""

import unittest
import os
import sys
import json
from io import BytesIO

# Ensure repo root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from services.stars_service import load_stars_data, save_stars_data, load_notes_data
from services.stats_service import compute_stars_stats, categorize_repo
from services.jobs_service import get_all_jobs_data
from services.ai_pulse_service import get_ai_pulse_data
from services.huggingface_service import get_huggingface_trending
from services.github_trending_service import get_github_trending


class TestStarsService(unittest.TestCase):
    def test_load_stars_data_dict_format(self):
        """Kiểm tra load_stars_data đọc đúng file stars.json dạng dict."""
        data = load_stars_data()
        self.assertIsInstance(data, dict)
        self.assertIn('repos', data)
        self.assertIsInstance(data['repos'], list)
        self.assertGreater(len(data['repos']), 0)

    def test_compute_stats_resilience(self):
        """Kiểm tra compute_stars_stats không bị crash khi dữ liệu có format dị biệt."""
        # Test empty
        self.assertIsInstance(compute_stars_stats([]), dict)
        # Test dict passed instead of list
        self.assertIsInstance(compute_stars_stats({'repos': []}), dict)
        # Test corrupted items
        corrupted = ["invalid_str", 123, None, {"name": "test_repo", "language": "Python"}]
        stats = compute_stars_stats(corrupted)
        self.assertIn('languages', stats)
        self.assertIn('Python', stats['languages'])

    def test_categorize_repo(self):
        """Kiểm tra phân loại repo chính xác theo từ khóa."""
        ai_repo = {"name": "langchain", "topics": ["agent", "rag"], "description": "LLM framework"}
        sec_repo = {"name": "ghidra", "topics": ["reverse-engineering"], "description": "SRE suite"}
        
        ai_cats = categorize_repo(ai_repo)
        sec_cats = categorize_repo(sec_repo)
        
        self.assertTrue(any('AI' in c for c in ai_cats))
        self.assertTrue(any('Security' in c for c in sec_cats))


class TestJobsService(unittest.TestCase):
    def test_jobs_data_structure(self):
        """Kiểm tra toàn bộ cấu trúc dữ liệu của Job Radar."""
        jobs_data = get_all_jobs_data()
        self.assertIn('platforms', jobs_data)
        self.assertIn('sample_jobs', jobs_data)
        self.assertIn('insights', jobs_data)
        
        # Test 35+ Community Groups
        self.assertGreaterEqual(len(jobs_data['platforms']), 4)
        for cat in jobs_data['platforms']:
            self.assertIn('category', cat)
            self.assertIn('items', cat)
            for item in cat['items']:
                self.assertTrue(item['url'].startswith('http'))
                self.assertGreater(len(item['name']), 0)

        # Test Sample Jobs
        self.assertGreaterEqual(len(jobs_data['sample_jobs']), 10)
        for job in jobs_data['sample_jobs']:
            self.assertIn('id', job)
            self.assertIn('title', job)
            self.assertIn('company', job)
            self.assertIn('location', job)
            self.assertIn('salary', job)
            self.assertIn('track', job)
            self.assertIn('level', job)
            self.assertIsInstance(job['requirements'], list)
            self.assertIsInstance(job['benefits'], list)


class TestDataFilesIntegrity(unittest.TestCase):
    def test_json_files_syntax(self):
        """Kiểm tra toàn bộ các file JSON trong data/ đều hợp lệ và load được."""
        data_dir = os.path.join(BASE_DIR, 'data')
        required_files = [
            'stars.json', 'notes.json', 'trending_daily.json', 'trending_weekly.json',
            'trending_monthly.json', 'fresh.json', 'hf_trending.json', 'ai_pulse.json',
            'collections.json', 'dev_tools.json', 'weekly_digest.json', 'jobs.json'
        ]
        
        for fname in required_files:
            fpath = os.path.join(data_dir, fname)
            self.assertTrue(os.path.exists(fpath), f"Missing data file: {fname}")
            with open(fpath, 'r', encoding='utf-8') as f:
                parsed = json.load(f)
                self.assertTrue(isinstance(parsed, (dict, list)), f"File {fname} is not valid JSON object/array")


class TestAPIEndpoints(unittest.TestCase):
    def test_app_routes(self):
        """Kiểm tra các hàm handler API trong app.py hoạt động chuẩn xác."""
        import app
        from unittest.mock import MagicMock
        
        # Khởi tạo mock handler
        handler = app.AppRequestHandler.__new__(app.AppRequestHandler)
        handler.headers = {}
        
        # Mock send_json_response
        responses = []
        def mock_send_json(data, status=200):
            responses.append((status, data))
        handler.send_json_response = mock_send_json

        # 1. Test handle_api_stars
        handler.handle_api_stars()
        status, data = responses[-1]
        self.assertEqual(status, 200)
        self.assertIn('repos', data)
        self.assertIn('stats', data)

        # 2. Test handle_api_trending
        handler.handle_api_trending({'since': ['daily'], 'language': ['']})
        status, data = responses[-1]
        self.assertEqual(status, 200)
        self.assertIn('repos', data)

        # 3. Test handle_api_json_file for jobs, collections, dev_tools
        for jfile in ['jobs.json', 'collections.json', 'dev_tools.json', 'weekly_digest.json']:
            handler.handle_api_json_file(jfile)
            status, data = responses[-1]
            self.assertEqual(status, 200, f"Failed for {jfile}")


if __name__ == '__main__':
    unittest.main(verbosity=2)
