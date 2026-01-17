from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error

# Supabase configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')

def get_embedding(text, api_key):
    """Generate embedding using Gemini text-embedding-004 model"""
    url = f'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}'

    req_data = {
        'model': 'models/text-embedding-004',
        'content': {
            'parts': [{'text': text}]
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(req_data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )

    response = urllib.request.urlopen(req, timeout=30)
    result = json.loads(response.read().decode('utf-8'))

    return result['embedding']['values']

def create_attendee_text(attendee):
    """Create a text representation of an attendee for embedding"""
    parts = []

    if attendee.get('name'):
        parts.append(f"Name: {attendee['name']}")

    if attendee.get('headline'):
        parts.append(f"Headline: {attendee['headline']}")

    if attendee.get('location'):
        parts.append(f"Location: {attendee['location']}")

    if attendee.get('school'):
        parts.append(f"School: {attendee['school']}")

    # About section
    about = attendee.get('about')
    if about:
        if isinstance(about, dict):
            parts.append(f"About: {about.get('text', '')}")
        else:
            parts.append(f"About: {about}")

    # Experience
    experience = attendee.get('experience', [])
    if experience:
        exp_parts = []
        for exp in experience:
            exp_str = f"{exp.get('title', '')} at {exp.get('company', '')}"
            if exp.get('description'):
                exp_str += f" - {exp['description']}"
            exp_parts.append(exp_str)
        parts.append(f"Experience: {'; '.join(exp_parts)}")

    # Education
    education = attendee.get('education', [])
    if education:
        edu_parts = []
        for edu in education:
            edu_parts.append(f"{edu.get('degree', '')} from {edu.get('school', '')}")
        parts.append(f"Education: {'; '.join(edu_parts)}")

    # Skills
    skills = attendee.get('skills', [])
    if skills:
        parts.append(f"Skills: {', '.join(skills)}")

    # Interests
    interests = attendee.get('interests', [])
    if interests:
        parts.append(f"Interests: {', '.join(interests)}")

    # Projects
    projects = attendee.get('projects', [])
    if projects:
        proj_parts = []
        for proj in projects:
            proj_str = proj.get('name', '')
            if proj.get('description'):
                proj_str += f" - {proj['description']}"
            proj_parts.append(proj_str)
        parts.append(f"Projects: {'; '.join(proj_parts)}")

    # Organizations
    organizations = attendee.get('organizations', [])
    if organizations:
        org_parts = []
        for org in organizations:
            org_str = org.get('name', '')
            if org.get('role'):
                org_str += f" ({org['role']})"
            org_parts.append(org_str)
        parts.append(f"Organizations: {'; '.join(org_parts)}")

    return '\n'.join(parts)

def upsert_attendee(attendee, embedding):
    """Insert or update an attendee in Supabase"""
    url = f'{SUPABASE_URL}/rest/v1/attendees'

    # Handle about field - convert object to string if needed
    about = attendee.get('about')
    if isinstance(about, dict):
        about = about.get('text', '')

    # Prepare the data
    data = {
        'id': str(attendee.get('id')),
        'name': attendee.get('name'),
        'headline': attendee.get('headline'),
        'location': attendee.get('location'),
        'school': attendee.get('school'),
        'url': attendee.get('url'),
        'image': attendee.get('image'),
        'about': about,
        'experience': json.dumps(attendee.get('experience', [])),
        'education': json.dumps(attendee.get('education', [])),
        'skills': attendee.get('skills', []),
        'languages': attendee.get('languages', []),
        'interests': attendee.get('interests', []),
        'organizations': json.dumps(attendee.get('organizations', [])),
        'volunteering': json.dumps(attendee.get('volunteering', [])),
        'projects': json.dumps(attendee.get('projects', [])),
        'awards': json.dumps(attendee.get('awards', [])),
        'embedding': embedding
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Prefer': 'resolution=merge-duplicates'  # Upsert behavior
        }
    )

    response = urllib.request.urlopen(req, timeout=30)
    return response.status

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle POST requests to sync attendees"""
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            attendees = data.get('attendees', [])
            google_api_key = os.environ.get('GOOGLE_API_KEY', '')

            if not attendees:
                self.send_error_response({'error': 'No attendees provided'}, 400)
                return

            if not SUPABASE_URL or not SUPABASE_KEY:
                self.send_error_response({'error': 'Supabase not configured'}, 500)
                return

            if not google_api_key:
                self.send_error_response({'error': 'Google API key not configured'}, 500)
                return

            results = {
                'success': 0,
                'failed': 0,
                'errors': []
            }

            for attendee in attendees:
                try:
                    # Create text representation
                    text = create_attendee_text(attendee)

                    # Generate embedding
                    embedding = get_embedding(text, google_api_key)

                    # Upsert to Supabase
                    upsert_attendee(attendee, embedding)

                    results['success'] += 1

                except Exception as e:
                    results['failed'] += 1
                    results['errors'].append({
                        'id': attendee.get('id'),
                        'name': attendee.get('name'),
                        'error': str(e)
                    })

            self.send_json_response(results, 200)

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
