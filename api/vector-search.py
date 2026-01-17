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

def search_supabase(query_embedding, match_count=50, match_threshold=0.3):
    """Search Supabase for similar attendees using vector similarity

    Using a low threshold (0.3) to cast a wide net - the AI will do the real filtering.
    Fetching up to 50 candidates to ensure we don't miss relevant matches.
    """
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

def get_base_prompt():
    """Returns the base prompt text - same as search.py for consistency"""
    return """SCORING RULES (score field is REQUIRED):
Assign scores based on how well they satisfy the search criteria:
- 95-100: Perfect match - directly and explicitly meets the search criteria (e.g., currently works at the company being searched for)
- 85-94: Exceptional match - meets all or nearly all criteria with strong, direct evidence
- 75-84: Strong match - meets most criteria with good evidence
- 60-74: Good match - meets several criteria or partially meets many criteria
- 40-59: Moderate match - meets some criteria or weakly meets several criteria
- 20-39: Weak match - barely meets criteria or only tangentially related
- 0-19: Very weak match - minimal relevance

SCORING EXAMPLES:
- Searching for "connection to Company X" + person currently works at Company X = 95-100
- Searching for "connection to Company X" + person previously worked at Company X = 85-94
- Searching for "experience in field Y" + person has 3+ years direct experience = 90-100
- Searching for "experience in field Y" + person has 1 year direct experience = 75-85

MATCHING GUIDELINES:
- Direct matches: The search term appears explicitly in the text (e.g., searching "Boston" and finding "Boston University")
- Inferred matches: Requires factual knowledge (e.g., searching "Maine" and finding "Berwick Academy" which is actually located in Maine)
- For INFERRED matches, you MUST be certain of the connection - do NOT guess or make assumptions
- For INFERRED matches, always provide the factual context in the reason field
- Partial matches: The profile satisfies some but not all of the search parameters

SCORING CRITERIA:
- Weight matches based on relevance and directness
- Consider the strength of evidence for each criterion
- Account for multiple parameters in complex queries
- Penalize profiles that only weakly satisfy criteria
- Reward profiles that exceed expectations

CRITICAL RULES FOR HIGHLIGHTS:
- ONLY highlight experiences/sections that DIRECTLY relate to the search query
- If searching for "investing experience", ONLY highlight roles explicitly involving investing (e.g., "Investor", "Investment Analyst")
- Do NOT highlight "Co-Founder" just because the person is an investor elsewhere
- If searching for a location like "Maine or New Hampshire":
  * ONLY highlight schools/companies actually located in those states
  * Do NOT highlight schools just because they're in the same region (e.g., Boston University is NOT in Maine/New Hampshire)
  * You MUST know the actual location - if uncertain, do NOT highlight it
- If searching for "connection to Company X" or "experience at Company X":
  * ONLY highlight experiences at Company X itself
  * Do NOT highlight other companies, even if they're in the same industry
  * Do NOT highlight unrelated experiences just because the person worked at Company X elsewhere
  * Example: If searching for "Twitch experience", only highlight the Twitch role, NOT MongoDB roles
- If searching for "experience with Technology Y":
  * ONLY highlight experiences explicitly involving Technology Y
  * Do NOT highlight unrelated roles at companies that use Technology Y
- Be PRECISE and CONSERVATIVE with highlights - when in doubt, don't highlight it
- Be rigorous with scoring - don't inflate scores without strong justification

Return a JSON object with this EXACT structure:
{
  "summary": "string",
  "matches": [
    {
      "id": number,
      "score": number (REQUIRED - 0 to 100),
      "relevance": "string",
      "highlights": [
        {
          "section": "string (experience/education/skills/languages/headline/organizations/volunteering/projects/awards/interests)",
          "index": number (the array index of the item to highlight, e.g., 0 for first experience, 2 for third education),
          "field": "string (optional - which specific field: title/company/school/degree/name/role/organization)",
          "reason": "string (why this specific item matches)",
          "weight": "low/medium/high"
        }
      ]
    }
  ]
}

CRITICAL: For highlights with section="experience", "education", "organizations", "volunteering", "projects", or "awards":
- You MUST provide the "index" field specifying which array item (0-indexed)
- You MUST provide the "field" to specify what to highlight (e.g., "title", "company", "school", "role", "name", "description")
- Do NOT use vague text matching - be explicit about the exact array index
- Example: {"section": "experience", "index": 2, "field": "company", "reason": "Worked at Twitch"} means highlight the company field of the 3rd experience entry

Return ONLY the JSON, nothing else. THE "score" FIELD IS MANDATORY FOR EVERY MATCH.

Example format:
{
  "summary": "Found 2 people with connection to Palantir (1 perfect match, 1 good match)",
  "matches": [
    {
      "id": "123",
      "score": 98,
      "relevance": "Perfect match: Currently employed at Palantir Technologies as Tech Lead",
      "highlights": [
        {
          "section": "experience",
          "index": 0,
          "field": "title",
          "reason": "Currently works at Palantir as Tech Lead",
          "weight": "high"
        },
        {
          "section": "headline",
          "reason": "Headline mentions Palantir",
          "weight": "high"
        }
      ]
    },
    {
      "id": "456",
      "score": 88,
      "relevance": "Exceptional match: Previously worked at Palantir as Software Engineer for 2 years",
      "highlights": [
        {
          "section": "experience",
          "index": 1,
          "field": "company",
          "reason": "Past employment at Palantir",
          "weight": "high"
        }
      ]
    }
  ]
}

CRITICAL SCORING REMINDER:
- If someone CURRENTLY works at a company being searched = score 95-100 (PERFECT MATCH)
- If someone PREVIOUSLY worked at a company being searched = score 85-94 (EXCEPTIONAL MATCH)
- DO NOT give scores below 95 for current employees of companies being explicitly searched for"""

def format_attendees_for_ai(attendees):
    """Format Supabase attendees data for AI consumption"""
    formatted = []
    for a in attendees:
        profile = {
            'id': a.get('id'),
            'name': a.get('name'),
            'headline': a.get('headline'),
            'location': a.get('location'),
            'school': a.get('school'),
            'url': a.get('url'),
            'image': a.get('image'),
            'about': a.get('about'),
        }

        # Parse JSON fields
        for field in ['experience', 'education', 'organizations', 'volunteering', 'projects', 'awards']:
            val = a.get(field)
            if val:
                if isinstance(val, str):
                    try:
                        profile[field] = json.loads(val)
                    except:
                        profile[field] = val
                else:
                    profile[field] = val

        # Array fields
        for field in ['skills', 'languages', 'interests']:
            if a.get(field):
                profile[field] = a.get(field)

        formatted.append(profile)

    return formatted

def call_gemini_api(api_key, search_query, attendees_data, model='gemini-flash'):
    """Call Gemini API with the pre-filtered attendees from vector search"""
    base_prompt = get_base_prompt()

    # Map model names to Gemini model IDs
    model_map = {
        'gemini-flash': 'gemini-2.0-flash',
        'gemini-pro': 'gemini-2.5-pro-preview-06-05'
    }
    model_id = model_map.get(model, 'gemini-2.0-flash')

    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={api_key}'

    req_data = {
        'systemInstruction': {
            'parts': [{
                'text': 'You are a precise JSON generator. You MUST include a "score" field (integer 0-100) for every match object. This field is absolutely mandatory and cannot be omitted under any circumstances.'
            }]
        },
        'contents': [{
            'parts': [{
                'text': f"""*** CRITICAL: Every match object MUST include a "score" field (integer 0-100). DO NOT OMIT THIS FIELD. ***

These attendees were pre-filtered by vector similarity search. Analyze them carefully for the search query.

Attendee database:
{json.dumps(attendees_data, indent=2)}

{base_prompt}

Search query: "{search_query}"
"""
            }],
            'role': 'user'
        }],
        'generationConfig': {
            'temperature': 0.5,
            'maxOutputTokens': 16000
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(req_data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )

    return urllib.request.urlopen(req, timeout=55)

def call_anthropic_api(api_key, search_query, attendees_data):
    """Call Anthropic Claude API with the pre-filtered attendees"""
    base_prompt = get_base_prompt()

    req_data = {
        'model': 'claude-sonnet-4-20250514',
        'max_tokens': 16000,
        'temperature': 0.5,
        'system': [{
            'type': 'text',
            'text': 'You are a precise JSON generator. You MUST include a "score" field (integer 0-100) for every match object. This field is absolutely mandatory and cannot be omitted under any circumstances.'
        }],
        'messages': [{
            'role': 'user',
            'content': [{
                'type': 'text',
                'text': f"""*** CRITICAL: Every match object MUST include a "score" field (integer 0-100). DO NOT OMIT THIS FIELD. ***

These attendees were pre-filtered by vector similarity search. Analyze them carefully for the search query.

Attendee database:
{json.dumps(attendees_data, indent=2)}

{base_prompt}

Search query: "{search_query}"
"""
            }]
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

    return urllib.request.urlopen(req, timeout=55)

def parse_anthropic_response(response_json):
    """Parse Anthropic API response"""
    try:
        text = response_json['content'][0]['text']

        # Clean markdown
        text = text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()

        result_json = json.loads(text)

        return {
            'content': [{
                'type': 'text',
                'text': json.dumps(result_json)
            }],
            'usage': response_json.get('usage', {})
        }
    except Exception as e:
        raise Exception(f"Failed to parse Anthropic response: {str(e)}")

def parse_gemini_response(response_json):
    """Parse Gemini API response"""
    try:
        if 'candidates' not in response_json or len(response_json['candidates']) == 0:
            if 'error' in response_json:
                raise Exception(f"Gemini API error: {response_json['error'].get('message', 'Unknown error')}")
            if 'promptFeedback' in response_json:
                feedback = response_json['promptFeedback']
                if feedback.get('blockReason'):
                    raise Exception(f"Request blocked: {feedback.get('blockReason')}")
            raise Exception("No candidates in Gemini response")

        candidate = response_json['candidates'][0]
        finish_reason = candidate.get('finishReason', '')

        if finish_reason == 'MAX_TOKENS':
            raise Exception("Response was cut off due to max tokens limit")
        if finish_reason == 'SAFETY':
            raise Exception("Response blocked due to safety filters")

        if 'content' not in candidate or 'parts' not in candidate['content']:
            raise Exception(f"Unexpected response structure. Finish reason: {finish_reason}")

        text = candidate['content']['parts'][0]['text']

        # Check for error messages
        text_lower = text.strip().lower()
        if text_lower.startswith('an error') or text_lower.startswith('i apologize') or text_lower.startswith('i cannot'):
            raise Exception(f"Gemini returned an error: {text[:200]}...")

        # Clean markdown
        text = text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()

        result_json = json.loads(text)

        return {
            'content': [{
                'type': 'text',
                'text': json.dumps(result_json)
            }],
            'usage': response_json.get('usageMetadata', {})
        }
    except json.JSONDecodeError as e:
        raise Exception(f"Failed to parse JSON: {str(e)}")
    except Exception as e:
        raise Exception(f"Failed to parse Gemini response: {str(e)}")

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle POST requests for vector search"""
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            search_query = data.get('query')
            match_count = data.get('match_count', 50)
            ai_model = data.get('model', 'gemini-flash')  # gemini-flash, gemini-pro, or claude

            google_api_key = os.environ.get('GOOGLE_API_KEY', '')
            anthropic_api_key = os.environ.get('ANTHROPIC_API_KEY', '')

            if not search_query:
                self.send_error_response({'error': 'Search query is required'}, 400)
                return

            if not SUPABASE_URL or not SUPABASE_KEY:
                self.send_error_response({'error': 'Supabase not configured'}, 500)
                return

            if not google_api_key:
                self.send_error_response({'error': 'Google API key not configured'}, 500)
                return

            if ai_model == 'claude' and not anthropic_api_key:
                self.send_error_response({'error': 'Anthropic API key not configured'}, 500)
                return

            # Step 1: Generate embedding for the search query
            query_embedding = get_embedding(search_query, google_api_key)

            # Step 2: Search Supabase for similar attendees (wide net with low threshold)
            similar_attendees = search_supabase(query_embedding, match_count, match_threshold=0.2)

            if not similar_attendees:
                self.send_json_response({
                    'content': [{
                        'type': 'text',
                        'text': json.dumps({
                            'summary': 'No matching attendees found in cloud database. Make sure you have synced your profiles.',
                            'matches': []
                        })
                    }]
                }, 200)
                return

            # Step 3: Format attendees for AI
            formatted_attendees = format_attendees_for_ai(similar_attendees)

            # Step 4: Use AI to analyze and score the results
            if ai_model == 'claude':
                response = call_anthropic_api(anthropic_api_key, search_query, formatted_attendees)
                result = json.loads(response.read().decode('utf-8'))
                parsed = parse_anthropic_response(result)
            else:
                response = call_gemini_api(google_api_key, search_query, formatted_attendees, ai_model)
                result = json.loads(response.read().decode('utf-8'))
                parsed = parse_gemini_response(result)

            self.send_json_response(parsed, 200)

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
