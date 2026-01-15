# Conference Attendees Database

A simple, private tool for collecting and organizing LinkedIn profile data for 700 conference attendees.

## Overview

This tool helps you efficiently collect professional information from LinkedIn profiles and display it in a searchable, filterable interface. All data is stored locally in your browser - nothing is sent to any server.

## Features

- **LinkedIn Data Extraction**: Copy/paste JavaScript snippet to extract profile data from LinkedIn
- **Local Storage**: All data stored in browser localStorage (completely private)
- **Search & Filter**: Search by name, company, or school; filter by school
- **Import/Export**: Backup and restore your database as JSON files
- **Progress Tracking**: Visual progress bar showing how many profiles collected (out of 700)

## How to Use

### Step 1: Set Up

1. Open `index.html` in your web browser (double-click the file)
2. You'll see three tabs: **Collect Data**, **View Attendees**, and **Import/Export**

### Step 2: Extract LinkedIn Data

For each attendee:

1. Open their LinkedIn profile in a new browser tab
2. Press `F12` (Windows/Linux) or `Cmd+Option+I` (Mac) to open DevTools
3. Click on the **Console** tab
4. Open the `linkedin-extractor.js` file in a text editor
5. Copy the entire contents of that file
6. Paste it into the Console and press `Enter`
7. You'll see a success message, and the data will be copied to your clipboard

### Step 3: Add to Database

1. Return to the Conference Attendees Database tab
2. Go to the **Collect Data** tab
3. Paste the copied JSON data into the text area
4. Enter the student's school/university (from your Airtable)
5. Click **Add Profile to Database**
6. The profile is now saved! Repeat for the next attendee.

### Step 4: View and Search

1. Go to the **View Attendees** tab
2. Use the search box to find specific people, companies, or schools
3. Filter by school using the dropdown
4. Sort by name, school, or recently added

## Data Collected

The extraction script collects the following publicly visible information from LinkedIn profiles:

- Name
- Headline (current position/title)
- Location
- About section
- Work Experience (company, title, duration, description)
- Education (school, degree, duration)
- Skills (if visible on the profile)

## Import/Export

### Export Database
- Go to the **Import/Export** tab
- Click **Export to JSON**
- This downloads a JSON file with all collected data
- Use this to backup your work or share with others

### Import Database
- Go to the **Import/Export** tab
- Click **Choose File** and select a previously exported JSON file
- Click **Import from JSON**
- New profiles will be merged with existing ones (duplicates avoided)

## Tips

1. **Work in batches**: Collect 20-30 profiles, then take a break
2. **Export regularly**: Backup your database every 50-100 profiles
3. **Multiple computers**: Export from one computer and import on another to continue work
4. **Browser storage**: Data persists in localStorage, so closing the browser won't lose your data
5. **Private browsing**: Don't use private/incognito mode - it won't save data between sessions

## Technical Details

- **Frontend Only**: Pure HTML/CSS/JavaScript - no server required
- **Storage**: Browser localStorage (5-10MB limit, plenty for 700 profiles)
- **Privacy**: All data stays on your computer
- **Compatibility**: Works in Chrome, Firefox, Safari, Edge (modern browsers)

## File Structure

```
Attendees/
├── index.html              # Main application interface
├── styles.css              # Styling
├── app.js                  # Application logic
├── linkedin-extractor.js   # DevTools script for extracting LinkedIn data
└── README.md              # This file
```

## Troubleshooting

**Q: The LinkedIn extraction script doesn't work**
- Make sure you're on an actual LinkedIn profile page (URL should be linkedin.com/in/...)
- Some profiles may have privacy settings that limit visible information
- Try refreshing the page and running the script again

**Q: I lost my data**
- Check if you're in the same browser where you collected the data
- Private/incognito mode doesn't persist localStorage
- Try importing a previously exported JSON file

**Q: The JSON data won't paste**
- Make sure you copied the entire output from the DevTools console
- Check that the data starts with `{` and ends with `}`
- If clipboard didn't work, you can manually copy the console output

**Q: How do I share this with my friend?**
- Send them the entire folder (all 5 files)
- Or export your database and send them the JSON file along with the HTML files
- They can import the JSON file into their own instance

## Legal & Ethical Notes

- Only collect data from publicly visible LinkedIn profiles
- This tool is for private, internal conference organization only
- Do not share collected data publicly without attendees' consent
- Respect LinkedIn's Terms of Service regarding automated data collection
- Consider asking attendees for permission before collecting their information

## Support

If you encounter any issues, check:
1. Browser console for error messages (F12 → Console)
2. That you're using a modern browser (Chrome, Firefox, Safari, Edge)
3. That JavaScript is enabled in your browser
