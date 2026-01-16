// Quick token counter for analyzing prompt structure

const basePrompt = `SCORING RULES (score field is REQUIRED):
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
- DO NOT give scores below 95 for current employees of companies being explicitly searched for`;

// Sample 5-profile database
const sampleProfiles = [
  {
    "name": "Jacob Neplokh",
    "headline": "Student at University of Chicago",
    "location": "San Francisco, California, United States",
    "school": "University of Chicago",
    "experience": [
      {
        "title": "Legal Research Intern",
        "company": "Fluel",
        "duration": "Oct 2025 - Present · 4 mos"
      },
      {
        "title": "Research Assistant",
        "company": "University of Chicago",
        "duration": "Nov 2024 - Present · 1 yr 3 mos"
      }
    ],
    "education": [
      {
        "school": "University of Chicago",
        "degree": "Bachelor of Arts - BA, Fundamentals",
        "duration": "Sep 2023 - Dec 2026"
      }
    ]
  },
  {
    "name": "Max Greenspan",
    "headline": "Forward Deployed Engineer @ Palantir",
    "location": "Boston, Massachusetts, United States",
    "experience": [
      {
        "title": "Tech Lead",
        "company": "Palantir Technologies",
        "duration": "Nov 2025 - Present"
      }
    ],
    "education": [
      {
        "school": "Boston University",
        "degree": "Bachelor of Arts - BA, Mathematics and Computer Science",
        "duration": "Sep 2021 - May 2025"
      }
    ]
  },
  {
    "name": "Ted Tuckman",
    "headline": "Software Engineering Lead at MongoDB",
    "location": "New York, New York, United States",
    "experience": [
      {
        "title": "Software Engineering Lead",
        "company": "MongoDB",
        "duration": "Feb 2023 - Present"
      }
    ],
    "education": [
      {
        "school": "Yale University",
        "degree": "Computer Science",
        "duration": "2014 - 2018"
      }
    ]
  },
  {
    "name": "Jake Greenspan",
    "headline": "Investor & Entrepreneur",
    "location": "New York, New York, United States",
    "experience": [
      {
        "title": "Investor",
        "company": "My own book",
        "duration": "2005 - Present"
      }
    ],
    "education": [
      {
        "school": "University of Chicago",
        "degree": "AB, Fundamentals"
      }
    ]
  },
  {
    "name": "Samantha Greenspan",
    "headline": "Co-Founder at Skolay",
    "location": "New York, New York, United States",
    "experience": [
      {
        "title": "Co-Founder and COO",
        "company": "Skolay",
        "duration": "Sep 2021 - Present"
      }
    ],
    "education": [
      {
        "school": "Barnard College",
        "degree": "Bachelor of Arts with Honors, Anthropology"
      }
    ]
  }
];

const sampleQuery = "Who has experience at Palantir?";

// Rough token estimation (1 token ≈ 4 characters for English text)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

const basePromptTokens = estimateTokens(basePrompt);
const profilesText = JSON.stringify(sampleProfiles, null, 2);
const profilesTokens = estimateTokens(profilesText);
const queryTokens = estimateTokens(sampleQuery);

console.log('=== TOKEN BREAKDOWN (5 profiles) ===');
console.log(`Base Prompt: ~${basePromptTokens} tokens`);
console.log(`Profile Database (5 profiles): ~${profilesTokens} tokens`);
console.log(`Search Query: ~${queryTokens} tokens`);
console.log(`Total Input: ~${basePromptTokens + profilesTokens + queryTokens} tokens`);
console.log('');
console.log('=== EXTRAPOLATION TO 1300 PROFILES ===');
const tokensPerProfile = profilesTokens / 5;
console.log(`Tokens per profile (avg): ~${Math.ceil(tokensPerProfile)} tokens`);
const profiles1300Tokens = Math.ceil(tokensPerProfile * 1300);
console.log(`Profile Database (1300 profiles): ~${profiles1300Tokens} tokens`);
console.log(`Total Input (1300 profiles): ~${basePromptTokens + profiles1300Tokens + queryTokens} tokens`);
console.log('');
console.log('=== PERCENTAGE BREAKDOWN ===');
const total1300 = basePromptTokens + profiles1300Tokens + queryTokens;
console.log(`Base Prompt: ${((basePromptTokens / total1300) * 100).toFixed(1)}%`);
console.log(`Profile Database: ${((profiles1300Tokens / total1300) * 100).toFixed(1)}%`);
console.log(`Search Query: ${((queryTokens / total1300) * 100).toFixed(1)}%`);
