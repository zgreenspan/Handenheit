# Initial Profiles Data

This directory contains the initial profiles that will be loaded for new users.

## How It Works

1. When a user visits the site for the first time (no localStorage data), the app automatically fetches `/data/initial-profiles.json`
2. These profiles are loaded into their browser's localStorage
3. From that point on, they have their own independent copy
4. They can add, edit, or delete profiles without affecting other users
5. If you update `initial-profiles.json`, only NEW users (or users who clear their localStorage) will see the updated profiles

## How to Update Initial Profiles

### Method 1: Export from Your Browser (Recommended)

1. Visit your Handenheit site
2. Make sure your profiles are up to date
3. Go to **Import/Export** tab
4. Click **Export to JSON**
5. Save the downloaded file
6. Replace `initial-profiles.json` with the downloaded file
7. Commit and push to GitHub

### Method 2: Manual Edit

You can manually edit `initial-profiles.json` with your profile data.

**Format:**
```json
[
  {
    "name": "John Doe",
    "headline": "Software Engineer at Company",
    "location": "San Francisco, CA",
    "school": "Stanford University",
    "url": "https://www.linkedin.com/in/johndoe",
    "image": "https://...",
    "experience": [...],
    "education": [...],
    "skills": [],
    "id": 1234567890.123,
    "addedAt": "2026-01-15T12:00:00.000Z"
  },
  ...
]
```

## Current Status

- **Current file**: `initial-profiles.json`
- **Number of profiles**: Check the file to see
- **Last updated**: Check git commit history

## Important Notes

⚠️ **Privacy Consideration**: These profiles will be publicly accessible at `/data/initial-profiles.json` on your site. Anyone can view this file. Only include profiles you're comfortable being public.

⚠️ **User Independence**: Once users load these profiles, they work with their own local copy. Updating this file won't affect existing users - only new users who visit for the first time.

⚠️ **Size Consideration**: Keep in mind that all users will download this file on first visit. With 1,300 profiles, this file will be ~500KB-1MB. This is acceptable but keep it in mind.

## Testing

To test the initial profile loading:

1. Open your site in an **incognito/private browser window**
2. You should see a notification: "Loaded X profiles into your local database"
3. Verify the profiles appear in the "View Attendees" tab
4. Try adding/editing a profile - it should work normally
5. Close and reopen the browser - your changes should persist (localStorage)

## Troubleshooting

**Profiles not loading?**
- Check browser console (F12 → Console) for errors
- Verify `initial-profiles.json` is valid JSON (use jsonlint.com)
- Make sure the file is deployed (check https://your-site.vercel.app/data/initial-profiles.json)

**Want to reset and reload fresh profiles?**
Users can:
1. Open browser console (F12)
2. Run: `localStorage.clear()`
3. Refresh the page
4. Initial profiles will reload from server
