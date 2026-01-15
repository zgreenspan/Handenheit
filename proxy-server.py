#!/usr/bin/env python3
"""
Simple proxy server for Anthropic API calls
This allows the frontend to make API calls without CORS issues
"""

from flask import Flask, request, jsonify, make_response
import requests
import os

app = Flask(__name__)

# Manual CORS configuration
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    return response

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
        # Get the API key and request data from the frontend
        print("Step 1: Getting JSON data...", flush=True)
        data = request.get_json(force=True)
        print(f"Step 2: Got data, keys: {list(data.keys())}", flush=True)

        api_key = data.get('apiKey')
        search_query = data.get('query')
        attendees_data = data.get('attendees')

        print(f"Step 3: API key present: {bool(api_key)}, API key starts with: {api_key[:10] if api_key else 'None'}..., Query: {search_query[:50] if search_query else None}", flush=True)

        if not api_key:
            print("ERROR: No API key provided", flush=True)
            return jsonify({'error': 'API key is required'}), 400

        if not search_query:
            print("ERROR: No search query provided", flush=True)
            return jsonify({'error': 'Search query is required'}), 400

        # Prepare the prompt for Claude
        print("Step 4: Preparing prompt...", flush=True)
        prompt = f"""*** CRITICAL: Every match object MUST include a "score" field (integer 0-100). DO NOT OMIT THIS FIELD. ***

Search query: "{search_query}"

Attendee database:
{attendees_data}

SCORING RULES (score field is REQUIRED):
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
{{
  "summary": "string",
  "matches": [
    {{
      "id": number,
      "score": number (REQUIRED - 0 to 100),
      "relevance": "string",
      "highlights": [
        {{
          "section": "string (experience/education/skills/headline/organizations/volunteering)",
          "index": number (the array index of the item to highlight, e.g., 0 for first experience, 2 for third education),
          "field": "string (optional - which specific field: title/company/school/degree/name/role/organization)",
          "reason": "string (why this specific item matches)",
          "weight": "low/medium/high"
        }}
      ]
    }}
  ]
}}

CRITICAL: For highlights with section="experience", "education", "organizations", or "volunteering":
- You MUST provide the "index" field specifying which array item (0-indexed)
- You MUST provide the "field" to specify what to highlight (e.g., "title", "company", "school", "role")
- Do NOT use vague text matching - be explicit about the exact array index
- Example: {{"section": "experience", "index": 2, "field": "company", "reason": "Worked at Twitch"}} means highlight the company field of the 3rd experience entry

Return ONLY the JSON, nothing else. THE "score" FIELD IS MANDATORY FOR EVERY MATCH.

Example format:
{{
  "summary": "Found 2 people with connection to Palantir (1 perfect match, 1 good match)",
  "matches": [
    {{
      "id": "123",
      "score": 98,
      "relevance": "Perfect match: Currently employed at Palantir Technologies as Tech Lead",
      "highlights": [
        {{
          "section": "experience",
          "index": 0,
          "field": "title",
          "reason": "Currently works at Palantir as Tech Lead",
          "weight": "high"
        }},
        {{
          "section": "headline",
          "reason": "Headline mentions Palantir",
          "weight": "high"
        }}
      ]
    }},
    {{
      "id": "456",
      "score": 88,
      "relevance": "Exceptional match: Previously worked at Palantir as Software Engineer for 2 years",
      "highlights": [
        {{
          "section": "experience",
          "index": 1,
          "field": "company",
          "reason": "Past employment at Palantir",
          "weight": "high"
        }}
      ]
    }}
  ]
}}

CRITICAL SCORING REMINDER:
- If someone CURRENTLY works at a company being searched = score 95-100 (PERFECT MATCH)
- If someone PREVIOUSLY worked at a company being searched = score 85-94 (EXCEPTIONAL MATCH)
- DO NOT give scores below 95 for current employees of companies being explicitly searched for"""

        # Make the request to Anthropic API with system prompt
        print("Step 5: Making request to Anthropic...", flush=True)
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
                'system': 'You are a precise JSON generator. You MUST include a "score" field (integer 0-100) for every match object. This field is absolutely mandatory and cannot be omitted under any circumstances.',
                'messages': [{
                    'role': 'user',
                    'content': prompt
                }]
            },
            timeout=30
        )

        print(f"Step 6: Got response, status code: {response.status_code}", flush=True)

        if response.status_code == 200:
            print("Step 7: Success! Returning response", flush=True)
            return jsonify(response.json()), 200
        else:
            error_detail = response.text
            print(f"Step 7: API error {response.status_code}: {error_detail}", flush=True)

            # Parse the error to give user better feedback
            try:
                error_json = response.json()
                error_type = error_json.get('error', {}).get('type', 'unknown')
                error_message = error_json.get('error', {}).get('message', 'Unknown error')

                if error_type == 'authentication_error':
                    return jsonify({
                        'error': 'Invalid API key',
                        'details': 'Your Anthropic API key is invalid. Please create a new one at console.anthropic.com and save it in the Import/Export tab.'
                    }), 401
                elif error_type == 'not_found_error':
                    return jsonify({
                        'error': 'Model not accessible',
                        'details': f'The AI model is not accessible with your API key. This usually means your account needs to be upgraded or the API key lacks permissions. Error: {error_message}'
                    }), 403
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
    print("Starting proxy server on http://localhost:5002")
    print("Make sure to install dependencies: pip install flask flask-cors requests")
    print("Registered routes:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.endpoint}: {rule.rule} [{', '.join(rule.methods)}]")
    app.run(host='localhost', port=5002, debug=False, use_reloader=False)
