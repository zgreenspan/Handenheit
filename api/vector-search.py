from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error

# Supabase configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')  # Use service key for server-side

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

def search_supabase(query_embedding, match_count=20, match_threshold=0.5):
    """Search Supabase for similar attendees using vector similarity"""
    # Use Supabase's RPC to call a vector similarity function
    url = f'{SUPABASE_URL}/rest/v1/rpc/match_attendees'

    req_data = {
        'query_embedding': query_embedding,
        'match_threshold': match_threshold,
        'match_count': match_count
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(req_data).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}'
        }
    )

    response = urllib.request.urlopen(req, timeout=30)
    return json.loads(response.read().decode('utf-8'))

def get_ai_analysis(search_query, attendees_data, api_key):
    """Use Gemini to analyze and score the vector search results"""
    url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}'

    prompt = """You are analyzing pre-filtered search results. These attendees were selected by vector similarity search.

Your job is to:
1. Score each attendee on how well they match the search query (0-100)
2. Provide a relevance explanation
3. Highlight specific matching sections

SCORING RULES:
- 95-100: Perfect match - directly and explicitly meets the search criteria
- 85-94: Exceptional match - meets all or nearly all criteria with strong evidence
- 75-84: Strong match - meets most criteria with good evidence
- 60-74: Good match - meets several criteria
- 40-59: Moderate match - meets some criteria
- 20-39: Weak match - barely meets criteria
- 0-19: Very weak match - minimal relevance

Return a JSON object with this structure:
{
  "summary": "Brief summary of results",
  "matches": [
    {
      "id": "attendee_id",
      "score": 85,
      "relevance": "Explanation of why they match",
      "highlights": [
        {
          "section": "experience",
          "index": 0,
          "field": "title",
          "reason": "Why this matches"
        }
      ]
    }
  ]
}

Return ONLY valid JSON, nothing else."""

    req_data = {
        'contents': [{
            'parts': [{
                'text': f"""{prompt}

Search query: "{search_query}"

Attendees to analyze:
{json.dumps(attendees_data, indent=2)}"""
            }],
            'role': 'user'
        }],
        'generationConfig': {
            'temperature': 0.3,
            'maxOutputTokens': 8000
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(req_data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )

    response = urllib.request.urlopen(req, timeout=45)
    result = json.loads(response.read().decode('utf-8'))

    # Parse Gemini response
    text = result['candidates'][0]['content']['parts'][0]['text']

    # Clean up markdown if present
    text = text.strip()
    if text.startswith('```json'):
        text = text[7:]
    if text.startswith('```'):
        text = text[3:]
    if text.endswith('```'):
        text = text[:-3]

    return json.loads(text.strip())

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle POST requests for vector search"""
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            search_query = data.get('query')
            match_count = data.get('match_count', 20)

            google_api_key = os.environ.get('GOOGLE_API_KEY', '')

            if not search_query:
                self.send_error_response({'error': 'Search query is required'}, 400)
                return

            if not SUPABASE_URL or not SUPABASE_KEY:
                self.send_error_response({'error': 'Supabase not configured'}, 500)
                return

            if not google_api_key:
                self.send_error_response({'error': 'Google API key not configured'}, 500)
                return

            # Step 1: Generate embedding for the search query
            query_embedding = get_embedding(search_query, google_api_key)

            # Step 2: Search Supabase for similar attendees
            similar_attendees = search_supabase(query_embedding, match_count)

            if not similar_attendees:
                self.send_json_response({
                    'content': [{
                        'type': 'text',
                        'text': json.dumps({
                            'summary': 'No matching attendees found',
                            'matches': []
                        })
                    }]
                }, 200)
                return

            # Step 3: Use AI to analyze and score the results
            analysis = get_ai_analysis(search_query, similar_attendees, google_api_key)

            # Return in the format expected by the frontend
            self.send_json_response({
                'content': [{
                    'type': 'text',
                    'text': json.dumps(analysis)
                }]
            }, 200)

        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            self.send_error_response({
                'error': f'API error: {e.code}',
                'details': error_body
            }, e.code)

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
