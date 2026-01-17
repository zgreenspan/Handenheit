from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error

def get_base_prompt():
    """Returns the base prompt text used for all models"""
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

def call_anthropic_api(api_key, search_query, attendees_data):
    """Call Anthropic API with prompt caching"""
    base_prompt = get_base_prompt()

    req_data = {
        'model': 'claude-sonnet-4-20250514',
        'max_tokens': 4000,
        'temperature': 0.5,
        'system': [{
            'type': 'text',
            'text': 'You are a precise JSON generator. You MUST include a "score" field (integer 0-100) for every match object. This field is absolutely mandatory and cannot be omitted under any circumstances.',
            'cache_control': {'type': 'ephemeral'}
        }],
        'messages': [{
            'role': 'user',
            'content': [
                {
                    'type': 'text',
                    'text': f"""*** CRITICAL: Every match object MUST include a "score" field (integer 0-100). DO NOT OMIT THIS FIELD. ***

Attendee database:
{attendees_data}

{base_prompt}""",
                    'cache_control': {'type': 'ephemeral'}
                },
                {
                    'type': 'text',
                    'text': f'Search query: "{search_query}"'
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

    return urllib.request.urlopen(req, timeout=30)

def call_gemini_api(api_key, search_query, attendees_data, model_id):
    """Call Google Gemini API

    Note: Gemini's automatic caching works when the same prompt prefix is used.
    Google caches content automatically when it detects repeated patterns.
    The cache duration is 5 minutes for free tier, up to 1 hour for paid.
    """
    base_prompt = get_base_prompt()

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

Attendee database:
{attendees_data}

{base_prompt}

Search query: "{search_query}"
"""
            }],
            'role': 'user'
        }],
        'generationConfig': {
            'temperature': 0.5,
            'maxOutputTokens': 4000
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(req_data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )

    return urllib.request.urlopen(req, timeout=30)

def call_openai_api(api_key, search_query, attendees_data, model_id):
    """Call OpenAI API with prompt caching

    OpenAI's prompt caching automatically caches the system message and
    early parts of the conversation. Cache is valid for 5-10 minutes.
    To maximize caching, we put the large attendee database early in the prompt.
    """
    base_prompt = get_base_prompt()

    req_data = {
        'model': model_id,
        'messages': [
            {
                'role': 'system',
                'content': f"""You are a precise JSON generator. You MUST include a "score" field (integer 0-100) for every match object. This field is absolutely mandatory and cannot be omitted under any circumstances.

Attendee database:
{attendees_data}

{base_prompt}"""
            },
            {
                'role': 'user',
                'content': f"""*** CRITICAL: Every match object MUST include a "score" field (integer 0-100). DO NOT OMIT THIS FIELD. ***

Search query: "{search_query}"
"""
            }
        ],
        'temperature': 0.5,
        'max_tokens': 4000
    }

    req = urllib.request.Request(
        'https://api.openai.com/v1/chat/completions',
        data=json.dumps(req_data).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        }
    )

    return urllib.request.urlopen(req, timeout=30)

def parse_gemini_response(response_json):
    """Parse Gemini API response to match Anthropic format"""
    try:
        # Check if we have candidates at all
        if 'candidates' not in response_json or len(response_json['candidates']) == 0:
            # Check for error in response
            if 'error' in response_json:
                raise Exception(f"Gemini API error: {response_json['error'].get('message', 'Unknown error')}")
            # Check for prompt feedback (safety blocks, etc.)
            if 'promptFeedback' in response_json:
                feedback = response_json['promptFeedback']
                if feedback.get('blockReason'):
                    raise Exception(f"Request blocked: {feedback.get('blockReason')}")
            raise Exception("No candidates in Gemini response - the model may have hit output limits or safety filters")

        candidate = response_json['candidates'][0]

        # Check for finish reason issues
        finish_reason = candidate.get('finishReason', '')
        if finish_reason == 'MAX_TOKENS':
            raise Exception("Gemini response was cut off due to max output tokens limit. Try reducing the number of profiles or using a model with higher limits.")
        if finish_reason == 'SAFETY':
            raise Exception("Gemini blocked the response due to safety filters")
        if finish_reason == 'RECITATION':
            raise Exception("Gemini blocked the response due to recitation concerns")

        # Check if content exists
        if 'content' not in candidate or 'parts' not in candidate['content']:
            raise Exception(f"Unexpected response structure. Finish reason: {finish_reason}")

        text = candidate['content']['parts'][0]['text']

        # Check if Gemini returned an error message instead of JSON
        text_lower = text.strip().lower()
        if text_lower.startswith('an error') or text_lower.startswith('i apologize') or text_lower.startswith('i cannot') or text_lower.startswith('sorry'):
            raise Exception(f"Gemini returned an error message instead of JSON: {text[:200]}...")

        # Remove markdown code blocks if present
        text = text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()

        # Try to parse JSON, with fallback repairs for common issues
        try:
            result_json = json.loads(text)
        except json.JSONDecodeError as parse_error:
            # Try to fix common JSON issues from LLM responses
            import re

            # Fix unescaped newlines in strings
            fixed_text = re.sub(r'(?<!\\)\n(?=[^"]*"[^"]*$)', '\\n', text)

            # Try again with fixed text
            try:
                result_json = json.loads(fixed_text)
            except json.JSONDecodeError:
                # If still failing, try to extract just the JSON object
                match = re.search(r'\{[\s\S]*\}', text)
                if match:
                    try:
                        result_json = json.loads(match.group())
                    except json.JSONDecodeError:
                        # Last resort: return an error response that won't crash the UI
                        raise parse_error
                else:
                    raise parse_error

        # Return in Anthropic format
        return {
            'content': [{
                'type': 'text',
                'text': json.dumps(result_json)
            }],
            'usage': response_json.get('usageMetadata', {})
        }
    except Exception as e:
        raise Exception(f"Failed to parse Gemini response: {str(e)}")

def parse_openai_response(response_json):
    """Parse OpenAI API response to match Anthropic format"""
    try:
        text = response_json['choices'][0]['message']['content']

        # Remove markdown code blocks if present
        text = text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()

        result_json = json.loads(text)

        # Return in Anthropic format
        return {
            'content': [{
                'type': 'text',
                'text': json.dumps(result_json)
            }],
            'usage': response_json.get('usage', {})
        }
    except Exception as e:
        raise Exception(f"Failed to parse OpenAI response: {str(e)}")

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle POST requests for AI search"""
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            search_query = data.get('query')
            attendees_data = data.get('attendees')
            model = data.get('model', 'gemini-3-flash')  # Default to Gemini 3 Flash

            # Get API keys from environment variables
            google_api_key = os.environ.get('GOOGLE_API_KEY', '')
            anthropic_api_key = os.environ.get('ANTHROPIC_API_KEY', '')

            if not search_query:
                self.send_error_response({'error': 'Search query is required'}, 400)
                return

            # Determine which API key to use
            if model == 'claude-sonnet':
                if not anthropic_api_key:
                    self.send_error_response({'error': 'Anthropic API key not configured on server'}, 500)
                    return
                api_key = anthropic_api_key
            elif model.startswith('gemini'):
                if not google_api_key:
                    self.send_error_response({'error': 'Google API key not configured on server'}, 500)
                    return
                api_key = google_api_key
            else:
                self.send_error_response({'error': f'Invalid model: {model}'}, 400)
                return

            # Call the appropriate API based on model
            if model == 'claude-sonnet':
                response = call_anthropic_api(api_key, search_query, attendees_data)
            elif model == 'gemini-3-pro':
                response = call_gemini_api(api_key, search_query, attendees_data, 'gemini-3-pro-preview')
            elif model == 'gemini-3-flash':
                response = call_gemini_api(api_key, search_query, attendees_data, 'gemini-3-flash-preview')
            else:
                self.send_error_response({'error': f'Invalid model: {model}'}, 400)
                return

            result = json.loads(response.read().decode('utf-8'))

            # Parse response based on provider
            if model.startswith('gemini'):
                result = parse_gemini_response(result)

            self.send_json_response(result, 200)

        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            try:
                error_json = json.loads(error_body)

                # Handle different error formats
                if model == 'claude-sonnet':
                    error_type = error_json.get('error', {}).get('type', 'unknown')
                    error_message = error_json.get('error', {}).get('message', 'Unknown error')
                elif model.startswith('gemini'):
                    error_message = error_json.get('error', {}).get('message', 'Unknown error')
                    error_type = 'api_error'
                else:  # OpenAI
                    error_message = error_json.get('error', {}).get('message', 'Unknown error')
                    error_type = error_json.get('error', {}).get('type', 'unknown')

                if 'authentication' in error_type.lower() or 'auth' in error_message.lower():
                    self.send_error_response({
                        'error': 'Invalid API key',
                        'details': f'Your API key is invalid. Please check your key and try again. Error: {error_message}'
                    }, 401)
                else:
                    self.send_error_response({
                        'error': f'API error ({error_type})',
                        'details': error_message
                    }, e.code)
            except:
                self.send_error_response({
                    'error': f'API request failed: {e.code}',
                    'details': error_body
                }, e.code)

        except Exception as e:
            self.send_error_response({'error': str(e)}, 500)

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
