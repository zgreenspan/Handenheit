from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error
import base64

def get_extraction_prompt():
    """Returns the prompt for extracting profile data from a resume PDF"""
    return """Extract structured profile data from this resume. Return a JSON object with the following structure:

{
  "name": "Full name",
  "headline": "Current role or professional summary (synthesize from most recent position)",
  "location": "Location if mentioned",
  "about": "Personal statement, mission statement, or summary section if present",
  "experience": [
    {
      "title": "Job title",
      "company": "Company name",
      "duration": "Date range (e.g., 'June 2021 - Present')",
      "description": "Job description/bullet points combined"
    }
  ],
  "education": [
    {
      "school": "School name",
      "degree": "Degree type and field (e.g., 'BA in Philosophy')",
      "duration": "Date range"
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "role": "Role on project",
      "duration": "Date range",
      "description": "Project description"
    }
  ],
  "awards": [
    {
      "name": "Award name",
      "date": "Date or year",
      "description": "Award description"
    }
  ],
  "skills": ["skill1", "skill2", ...],
  "interests": ["interest1", "interest2", ...],
  "organizations": [
    {
      "name": "Organization name",
      "role": "Role",
      "duration": "Date range"
    }
  ],
  "volunteering": [
    {
      "role": "Volunteer role",
      "organization": "Organization name",
      "duration": "Date range"
    }
  ]
}

IMPORTANT GUIDELINES:
1. Only include sections that are present in the resume. Omit empty arrays.
2. For "experience", only include actual jobs/employment. Put side projects, personal projects in "projects".
3. For "skills", extract technical skills, tools, programming languages. Keep as simple strings.
4. For "interests", extract hobbies, extracurriculars, personal interests if mentioned.
5. For "about", look for personal statements, mission statements, objective sections, or any narrative text about the person.
6. Synthesize a "headline" from the most recent/prominent role if not explicitly stated.
7. Preserve the original text as much as possible - don't paraphrase excessively.
8. If a section header doesn't match exactly (e.g., "Work History" instead of "Experience"), map it to the appropriate field.

Return ONLY valid JSON, no markdown code blocks, no explanations."""

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
            'max_tokens': 4000,
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
