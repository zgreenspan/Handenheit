#!/usr/bin/env python3
"""
Authentication endpoint for Handenheit
Verifies password against environment variable
"""

import json
import os
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle password authentication"""
        try:
            # Get password from environment variable
            correct_password = os.environ.get('HANDENHEIT_PASSWORD', '')

            if not correct_password:
                self.send_error_response({'error': 'Authentication not configured'}, 500)
                return

            # Parse request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body)

            submitted_password = data.get('password', '')

            # Verify password
            if submitted_password == correct_password:
                self.send_json_response({'success': True}, 200)
            else:
                self.send_json_response({'error': 'Invalid password'}, 401)

        except Exception as e:
            self.send_error_response({'error': str(e)}, 500)

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def send_json_response(self, data, status_code):
        """Send JSON response with CORS headers"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_error_response(self, error_data, status_code):
        """Send error response"""
        self.send_json_response(error_data, status_code)
