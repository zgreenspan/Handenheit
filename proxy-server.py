#!/usr/bin/env python3
"""
Multi-model proxy server for AI search
Supports: Claude Sonnet, Gemini Pro/Flash, GPT-4o/mini with caching
"""

from flask import Flask, request, jsonify, make_response
import requests
import json
import os

app = Flask(__name__)

# Manual CORS configuration
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    return response

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
          "section": "string (experience/education/skills/headline/organizations/volunteering)",
          "index": number (the array index of the item to highlight, e.g., 0 for first experience, 2 for third education),
          "field": "string (optional - which specific field: title/company/school/degree/name/role/organization)",
          "reason": "string (why this specific item matches)",
          "weight": "low/medium/high"
        }
      ]
    }
  ]
}

CRITICAL: For highlights with section="experience", "education", "organizations", or "volunteering":
- You MUST provide the "index" field specifying which array item (0-indexed)
- You MUST provide the "field" to specify what to highlight (e.g., "title", "company", "school", "role")
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

    response = requests.post(
        'https://api.anthropic.com/v1/messages',
        headers={
            'Content-Type': 'application/json',
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01'
        },
        json={
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
        },
        timeout=30
    )
    return response

def call_gemini_api(api_key, search_query, attendees_data, model_id):
    """Call Google Gemini API (caching handled automatically by Google)"""
    base_prompt = get_base_prompt()

    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={api_key}'

    response = requests.post(
        url,
        headers={'Content-Type': 'application/json'},
        json={
            'contents': [{
                'parts': [{
                    'text': f"""*** CRITICAL: Every match object MUST include a "score" field (integer 0-100). DO NOT OMIT THIS FIELD. ***

You are a precise JSON generator. You MUST include a "score" field (integer 0-100) for every match object.

Attendee database:
{attendees_data}

{base_prompt}

Search query: "{search_query}"
"""
                }]
            }],
            'generationConfig': {
                'temperature': 0.5,
                'maxOutputTokens': 4000
            }
        },
        timeout=30
    )
    return response

def call_openai_api(api_key, search_query, attendees_data, model_id):
    """Call OpenAI API with prompt caching"""
    base_prompt = get_base_prompt()

    response = requests.post(
        'https://api.openai.com/v1/chat/completions',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        },
        json={
            'model': model_id,
            'messages': [
                {
                    'role': 'system',
                    'content': 'You are a precise JSON generator. You MUST include a "score" field (integer 0-100) for every match object. This field is absolutely mandatory and cannot be omitted under any circumstances.'
                },
                {
                    'role': 'user',
                    'content': f"""*** CRITICAL: Every match object MUST include a "score" field (integer 0-100). DO NOT OMIT THIS FIELD. ***

Attendee database:
{attendees_data}

{base_prompt}

Search query: "{search_query}"
"""
                }
            ],
            'temperature': 0.5,
            'max_tokens': 4000
        },
        timeout=30
    )
    return response

def parse_gemini_response(response_json):
    """Parse Gemini API response to match Anthropic format"""
    try:
        # Extract text from Gemini response
        text = response_json['candidates'][0]['content']['parts'][0]['text']

        # Try to parse as JSON
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
            'usage': response_json.get('usageMetadata', {})
        }
    except Exception as e:
        raise Exception(f"Failed to parse Gemini response: {str(e)}")

def parse_openai_response(response_json):
    """Parse OpenAI API response to match Anthropic format"""
    try:
        text = response_json['choices'][0]['message']['content']

        # Try to parse as JSON
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

@app.route('/api/search', methods=['POST', 'OPTIONS'])
def proxy_search():
    """Proxy endpoint for AI search requests"""
    print(f"===== ROUTE HIT: {request.method} request to /api/search =====", flush=True)

    # Handle preflight
    if request.method == 'OPTIONS':
        print("Handling OPTIONS preflight", flush=True)
        return make_response('', 200)

    print(f"Handling POST request, Content-Type: {request.content_type}", flush=True)

    try:
        # Get the request data from the frontend
        print("Step 1: Getting JSON data...", flush=True)
        data = request.get_json(force=True)
        print(f"Step 2: Got data, keys: {list(data.keys())}", flush=True)

        api_key = data.get('apiKey')
        search_query = data.get('query')
        attendees_data = data.get('attendees')
        model = data.get('model', 'gemini-pro')  # Default to Gemini Pro

        print(f"Step 3: Model: {model}, API key present: {bool(api_key)}, Query: {search_query[:50] if search_query else None}", flush=True)

        if not api_key:
            print("ERROR: No API key provided", flush=True)
            return jsonify({'error': 'API key is required'}), 400

        if not search_query:
            print("ERROR: No search query provided", flush=True)
            return jsonify({'error': 'Search query is required'}), 400

        # Call the appropriate API based on model
        print(f"Step 4: Calling {model} API...", flush=True)

        if model == 'claude-sonnet':
            response = call_anthropic_api(api_key, search_query, attendees_data)
        elif model == 'gemini-pro':
            response = call_gemini_api(api_key, search_query, attendees_data, 'gemini-1.5-pro-latest')
        elif model == 'gemini-flash':
            response = call_gemini_api(api_key, search_query, attendees_data, 'gemini-1.5-flash-latest')
        elif model == 'gpt-4o':
            response = call_openai_api(api_key, search_query, attendees_data, 'gpt-4o')
        elif model == 'gpt-4o-mini':
            response = call_openai_api(api_key, search_query, attendees_data, 'gpt-4o-mini')
        else:
            return jsonify({'error': f'Invalid model: {model}'}), 400

        print(f"Step 5: Got response, status code: {response.status_code}", flush=True)

        if response.status_code == 200:
            response_json = response.json()

            # Parse response based on provider
            if model.startswith('gemini'):
                response_json = parse_gemini_response(response_json)
            elif model.startswith('gpt'):
                response_json = parse_openai_response(response_json)

            print("Step 6: Success! Returning response", flush=True)
            return jsonify(response_json), 200
        else:
            error_detail = response.text
            print(f"Step 6: API error {response.status_code}: {error_detail}", flush=True)

            # Parse the error to give user better feedback
            try:
                error_json = response.json()

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
                    return jsonify({
                        'error': 'Invalid API key',
                        'details': f'Your API key is invalid. Please check your key and try again. Error: {error_message}'
                    }), 401
                else:
                    return jsonify({
                        'error': f'API error ({error_type})',
                        'details': error_message
                    }), response.status_code
            except:
                return jsonify({
                    'error': f'API request failed: {response.status_code}',
                    'details': error_detail
                }), response.status_code

    except Exception as e:
        print(f"EXCEPTION in proxy_search: {type(e).__name__}: {str(e)}", flush=True)
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    print("Starting multi-model proxy server on http://localhost:8000")
    print("Supported models: claude-sonnet, gemini-pro, gemini-flash, gpt-4o, gpt-4o-mini")
    print("Make sure to install dependencies: pip install flask requests")
    print("Registered routes:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.endpoint}: {rule.rule} [{', '.join(rule.methods)}]")
    app.run(host='localhost', port=8000, debug=False, use_reloader=False)
