from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error
import base64

def get_extraction_prompt():
    """Returns the prompt for extracting profile data from a resume PDF"""
    return """Your task is to extract and categorize ALL text from this resume into a structured JSON format.

CRITICAL RULE: Every piece of text in the resume MUST appear somewhere in your output. Do not skip or omit ANY text. Your job is to categorize and format the text, not to selectively extract it.

Return a JSON object with this structure:

{
  "name": "Full name",
  "headline": "Current role or professional summary (synthesize from most recent position if not explicit)",
  "location": "Location if mentioned",
  "about": "ALL prose text, essays, personal statements, reflections, postscripts, summaries, or any narrative text that doesn't fit other categories - INCLUDE THE COMPLETE TEXT VERBATIM",
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
  "skills": ["tool1", "tool2", ...],
  "languages": ["English (Native)", "Spanish (Conversational)", ...],
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

CATEGORIZATION RULES:
1. "experience" = paid jobs, internships, employment positions
2. "projects" = side projects, personal projects, academic projects, anything project-based that isn't a job
3. "education" = schools, degrees, certifications
4. "skills" = tools, technologies, software, technical skills (Figma, Python, Excel, etc.) - NOT spoken languages
5. "languages" = spoken/written languages WITH proficiency levels preserved exactly as written (e.g., "English (Native)", "Hebrew (Proficient/B2)", "Latin (Intermediate)")
6. "interests" = hobbies, extracurriculars, personal interests
7. "organizations" = clubs, associations, memberships
8. "volunteering" = volunteer work, community service
9. "awards" = honors, awards, achievements, scholarships
10. "about" = THIS IS YOUR CATCH-ALL. Any prose, essays, paragraphs, narrative text, personal statements, reflections, postscripts, summaries, mission statements, or ANY other text that doesn't fit the above categories MUST go here. Include the COMPLETE text word-for-word.

TEXT PRESERVATION RULES:
- Preserve original text exactly - do not paraphrase or summarize
- Keep all parentheticals (e.g., proficiency levels, dates, clarifications)
- Include full descriptions, not abbreviated versions
- If text appears at the end of the resume (common for personal statements/postscripts), it MUST be captured in "about"

SECTION HEADER FLEXIBILITY:
- Map any section to the appropriate field regardless of what it's titled
- "Work History" → experience, "Academic Projects" → projects, "Activities" → could be interests or organizations depending on content
- When in doubt about where text belongs, put it in "about"

FINAL CHECK: Before returning, verify that ALL visible text from the resume appears somewhere in your JSON output. Missing text is a failure.

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
