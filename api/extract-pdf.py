from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error
import base64

def get_extraction_prompt():
    """Returns the prompt for extracting profile data from a resume PDF"""
    return """STEP 1: First, read through the ENTIRE PDF document from start to finish, including ALL pages. Pay special attention to:
- The very END of the document (last page, bottom sections)
- Any paragraphs of prose/essay text anywhere in the document
- Text that may appear in different formatting or smaller font

STEP 2: Extract and categorize ALL text into this JSON structure:

{
  "name": "Full name",
  "headline": "Current role or professional summary",
  "location": "Location if mentioned",
  "about": {"title": "Original section title if any (e.g., 'Postscript - The Socratic Virtue of a Chief of Staff')", "text": "The full prose text"},
  "experience": [{"title": "Job title", "company": "Company name", "duration": "Date range", "description": "Description"}],
  "education": [{"school": "School name", "degree": "Degree", "duration": "Date range"}],
  "projects": [{"name": "Project name", "role": "Role", "duration": "Date range", "description": "Description"}],
  "awards": [{"name": "Award name", "date": "Date", "description": "Description"}],
  "skills": ["skill1", "skill2"],
  "languages": ["English (Native)", "Spanish (Conversational)"],
  "interests": ["interest1", "interest2"],
  "organizations": [{"name": "Org name", "role": "Role", "duration": "Date range"}],
  "volunteering": [{"role": "Role", "organization": "Org name", "duration": "Date range"}]
}

CATEGORIZATION:
- experience = jobs, internships, employment
- projects = personal/academic projects (not jobs)
- education = schools, degrees
- skills = technical tools (Figma, Python, etc.) - NOT spoken languages
- languages = spoken languages WITH proficiency in parentheses exactly as written
- interests = hobbies, extracurriculars
- organizations = clubs, memberships
- volunteering = volunteer work
- awards = honors, achievements
- about = ANY AND ALL paragraph/prose text that isn't a bullet point job description. This includes text at the END of the resume. PRESERVE the original section title/header if there is one.

CRITICAL RULES:
1. Preserve ALL text exactly - no paraphrasing
2. Keep parentheticals like "English (Native)" or "Hebrew (Proficient/B2)"
3. The "about" field is your CATCH-ALL - if text doesn't fit elsewhere, it goes here
4. CHECK THE LAST PAGE CAREFULLY - essays/postscripts often appear at the end

Return ONLY valid JSON, no markdown code blocks."""

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle POST requests for PDF extraction"""
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            pdf_base64 = data.get('pdf')
            school = data.get('school', '')

            if not pdf_base64:
                self.send_error_response({'error': 'PDF data is required'}, 400)
                return

            # Get API key from environment
            anthropic_api_key = os.environ.get('ANTHROPIC_API_KEY', '')

            if not anthropic_api_key:
                self.send_error_response({'error': 'Anthropic API key not configured on server'}, 500)
                return

            # Call Claude API with PDF
            result = self.extract_from_pdf(anthropic_api_key, pdf_base64)

            # Add school if provided
            if school and result:
                result['school'] = school

            # Add timestamp
            if result:
                from datetime import datetime
                result['timestamp'] = datetime.utcnow().isoformat() + 'Z'

            self.send_json_response(result, 200)

        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            try:
                error_json = json.loads(error_body)
                error_message = error_json.get('error', {}).get('message', 'Unknown error')
                self.send_error_response({
                    'error': f'API error: {error_message}'
                }, e.code)
            except:
                self.send_error_response({
                    'error': f'API request failed: {e.code}',
                    'details': error_body
                }, e.code)

        except Exception as e:
            self.send_error_response({'error': str(e)}, 500)

    def extract_from_pdf(self, api_key, pdf_base64):
        """Call Claude API to extract profile data from PDF"""
        prompt = get_extraction_prompt()

        req_data = {
            'model': 'claude-sonnet-4-20250514',
            'max_tokens': 8000,
            'messages': [{
                'role': 'user',
                'content': [
                    {
                        'type': 'document',
                        'source': {
                            'type': 'base64',
                            'media_type': 'application/pdf',
                            'data': pdf_base64
                        }
                    },
                    {
                        'type': 'text',
                        'text': prompt
                    }
                ]
            }]
        }

        req = urllib.request.Request(
            'https://api.anthropic.com/v1/messages',
            data=json.dumps(req_data).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'x-api-key': api_key,
                'anthropic-version': '2023-06-01'
            }
        )

        response = urllib.request.urlopen(req, timeout=60)
        result = json.loads(response.read().decode('utf-8'))

        # Extract the text content from Claude's response
        text = result['content'][0]['text']

        # Remove markdown code blocks if present
        text = text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()

        # Parse the JSON
        profile_data = json.loads(text)

        return profile_data

    def send_json_response(self, data, status_code):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_error_response(self, error_data, status_code):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(error_data).encode('utf-8'))

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
