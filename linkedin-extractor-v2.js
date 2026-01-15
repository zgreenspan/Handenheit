// LinkedIn Profile Data Extractor - Version 2
// More robust selectors that work with LinkedIn's current structure

(function extractLinkedInProfile() {
  try {
    console.log('%cStarting LinkedIn extraction...', 'color: blue; font-weight: bold;');

    // Helper function to try multiple selectors
    const getTextBySelectorList = (selectors) => {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          return element.textContent.trim();
        }
      }
      return '';
    };

    // Extract profile data with multiple selector options
    const profileData = {
      timestamp: new Date().toISOString(),
      url: window.location.href,

      // Basic info - try multiple selectors
      name: getTextBySelectorList([
        'h1.text-heading-xlarge',
        '.pv-text-details__left-panel h1',
        'h1[class*="inline"]',
        '.ph5 h1'
      ]),

      headline: getTextBySelectorList([
        '.text-body-medium.break-words',
        '.pv-text-details__left-panel .text-body-medium',
        'div[class*="headline"]',
        '.ph5 .text-body-medium'
      ]),

      location: getTextBySelectorList([
        '.text-body-small.inline.t-black--light.break-words',
        '.pv-text-details__left-panel .text-body-small',
        'span[class*="location"]',
        '.ph5 .text-body-small'
      ]),

      about: '',
      experience: [],
      education: [],
      skills: [],
    };

    // Extract About section
    const aboutSelectors = [
      '#about ~ div .display-flex.ph5.pv3',
      '.pv-about-section .pv-about__summary-text',
      '[data-section="summary"] .pv-shared-text-with-see-more',
      '.pv-about__summary-text .lt-line-clamp__raw-line'
    ];
    profileData.about = getTextBySelectorList(aboutSelectors);

    // Extract Experience - look for the experience section
    const experienceSection = document.querySelector('#experience') ||
                             document.querySelector('[data-section="experience"]');

    if (experienceSection) {
      // Find the parent container and get all experience items
      const container = experienceSection.closest('section') || experienceSection.parentElement;
      const experienceItems = container.querySelectorAll('li.pvs-list__paged-list-item, li.artdeco-list__item');

      experienceItems.forEach((item, index) => {
        // Skip if it looks like a nested item
        if (index > 10) return; // Limit to prevent over-extraction

        const getItemText = (selectors) => {
          for (const sel of selectors) {
            const el = item.querySelector(sel);
            if (el && el.textContent.trim()) {
              return el.textContent.trim();
            }
          }
          return '';
        };

        const title = getItemText([
          '.mr1.t-bold span[aria-hidden="true"]',
          '.t-bold span:first-child',
          '[data-field="experience-position-title"]',
          '.hoverable-link-text.t-bold span'
        ]);

        const company = getItemText([
          '.t-14.t-normal span[aria-hidden="true"]',
          '.t-normal span',
          '[data-field="experience-company-name"]'
        ]);

        const duration = getItemText([
          '.t-14.t-normal.t-black--light span[aria-hidden="true"]',
          '.t-black--light span',
          '[data-field="experience-date-range"]'
        ]);

        if (title || company) {
          profileData.experience.push({
            title: title,
            company: company,
            duration: duration,
            description: ''
          });
        }
      });
    }

    // Extract Education
    const educationSection = document.querySelector('#education') ||
                            document.querySelector('[data-section="education"]');

    if (educationSection) {
      const container = educationSection.closest('section') || educationSection.parentElement;
      const educationItems = container.querySelectorAll('li.pvs-list__paged-list-item, li.artdeco-list__item');

      educationItems.forEach((item, index) => {
        if (index > 10) return;

        const getItemText = (selectors) => {
          for (const sel of selectors) {
            const el = item.querySelector(sel);
            if (el && el.textContent.trim()) {
              return el.textContent.trim();
            }
          }
          return '';
        };

        const school = getItemText([
          '.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]',
          '.t-bold span:first-child',
          '[data-field="school-name"]'
        ]);

        const degree = getItemText([
          '.t-14.t-normal span[aria-hidden="true"]',
          '.t-normal span',
          '[data-field="degree-name"]'
        ]);

        const duration = getItemText([
          '.t-14.t-normal.t-black--light span[aria-hidden="true"]',
          '.t-black--light span',
          '[data-field="education-date-range"]'
        ]);

        if (school) {
          profileData.education.push({
            school: school,
            degree: degree,
            duration: duration
          });
        }
      });
    }

    // Log what we found
    console.log('%cExtracted data:', 'color: blue; font-weight: bold;');
    console.log('Name:', profileData.name || '❌ NOT FOUND');
    console.log('Headline:', profileData.headline || '❌ NOT FOUND');
    console.log('Location:', profileData.location || '❌ NOT FOUND');
    console.log('Experience items:', profileData.experience.length);
    console.log('Education items:', profileData.education.length);

    // Convert to JSON string
    const jsonOutput = JSON.stringify(profileData, null, 2);

    // Try to copy to clipboard
    navigator.clipboard.writeText(jsonOutput).then(() => {
      console.log('%c✓ Profile data extracted and copied to clipboard!', 'color: green; font-size: 16px; font-weight: bold;');
      console.log('%cYou can now paste this into the data collection interface.', 'color: gray;');
    }).catch(err => {
      console.log('%c✓ Profile data extracted!', 'color: green; font-size: 16px; font-weight: bold;');
      console.log('%cCopy the text below (click to select all, then Cmd+C):', 'color: blue; font-weight: bold;');
    });

    // Always log the JSON output
    console.log(jsonOutput);

    return profileData;

  } catch (error) {
    console.error('Error extracting profile:', error);
    console.log('If this is not a LinkedIn profile page, please navigate to one first.');
    return null;
  }
})();
