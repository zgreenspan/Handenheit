// LinkedIn Profile Data Extractor
// Instructions:
// 1. Navigate to a LinkedIn profile page
// 2. Open DevTools (F12 or Cmd+Option+I on Mac)
// 3. Go to Console tab
// 4. Paste this entire script and press Enter
// 5. The extracted data will be copied to your clipboard

(function extractLinkedInProfile() {
  try {
    // Helper function to extract text content safely
    const getText = (selector) => {
      const element = document.querySelector(selector);
      return element ? element.textContent.trim() : '';
    };

    const getAll = (selector) => {
      return Array.from(document.querySelectorAll(selector)).map(el => el.textContent.trim());
    };

    // Extract profile image
    const getImage = () => {
      const imgElement = document.querySelector('.pv-top-card-profile-picture__image') ||
                        document.querySelector('img[data-anonymize="headshot-photo"]') ||
                        document.querySelector('.profile-photo-edit__preview');
      return imgElement ? imgElement.src : '';
    };

    // Extract profile data
    const profileData = {
      timestamp: new Date().toISOString(),
      url: window.location.href,

      // Basic info
      name: getText('h1.text-heading-xlarge') || getText('.pv-text-details__left-panel h1'),
      headline: getText('.text-body-medium.break-words') || getText('.pv-text-details__left-panel .text-body-medium'),
      location: getText('.text-body-small.inline.t-black--light.break-words') || getText('.pv-text-details__left-panel .text-body-small'),
      image: getImage(),

      // About section
      about: getText('#about ~ div .display-flex.ph5.pv3') || getText('.pv-about-section .pv-about__summary-text'),

      // Experience
      experience: [],

      // Education
      education: [],

      // Skills (if visible)
      skills: [],

      // Organizations
      organizations: [],

      // Volunteering
      volunteering: [],
    };

    // Extract experience
    const experienceSection = document.querySelector('#experience');
    if (experienceSection) {
      const experienceItems = experienceSection.parentElement.querySelectorAll('ul > li.artdeco-list__item');

      experienceItems.forEach(item => {
        const titleElement = item.querySelector('.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]');
        const companyElement = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
        const durationElement = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');
        const descriptionElement = item.querySelector('.pv-shared-text-with-see-more span[aria-hidden="true"]');

        if (titleElement) {
          profileData.experience.push({
            title: titleElement.textContent.trim(),
            company: companyElement ? companyElement.textContent.trim() : '',
            duration: durationElement ? durationElement.textContent.trim() : '',
            description: descriptionElement ? descriptionElement.textContent.trim() : ''
          });
        }
      });
    }

    // Extract education
    const educationSection = document.querySelector('#education');
    if (educationSection) {
      const educationItems = educationSection.parentElement.querySelectorAll('ul > li.artdeco-list__item');

      educationItems.forEach(item => {
        const schoolElement = item.querySelector('.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]');
        const degreeElement = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
        const durationElement = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');

        if (schoolElement) {
          profileData.education.push({
            school: schoolElement.textContent.trim(),
            degree: degreeElement ? degreeElement.textContent.trim() : '',
            duration: durationElement ? durationElement.textContent.trim() : ''
          });
        }
      });
    }

    // Extract skills (if available on page)
    const skillsSection = document.querySelector('#skills');
    if (skillsSection) {
      const skillItems = skillsSection.parentElement.querySelectorAll('ul > li.artdeco-list__item span[aria-hidden="true"]');
      profileData.skills = Array.from(skillItems).map(skill => skill.textContent.trim()).filter(s => s);
    }

    // Extract organizations
    const organizationsSection = document.querySelector('#organizations');
    if (organizationsSection) {
      const orgItems = organizationsSection.parentElement.querySelectorAll('ul > li.artdeco-list__item');

      orgItems.forEach(item => {
        const nameElement = item.querySelector('.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]');
        const roleElement = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
        const durationElement = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');

        if (nameElement) {
          profileData.organizations.push({
            name: nameElement.textContent.trim(),
            role: roleElement ? roleElement.textContent.trim() : '',
            duration: durationElement ? durationElement.textContent.trim() : ''
          });
        }
      });
    }

    // Extract volunteering
    const volunteeringSection = document.querySelector('#volunteering_experience');
    if (volunteeringSection) {
      const volItems = volunteeringSection.parentElement.querySelectorAll('ul > li.artdeco-list__item');

      volItems.forEach(item => {
        const roleElement = item.querySelector('.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]');
        const orgElement = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
        const durationElement = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');

        if (roleElement) {
          profileData.volunteering.push({
            role: roleElement.textContent.trim(),
            organization: orgElement ? orgElement.textContent.trim() : '',
            duration: durationElement ? durationElement.textContent.trim() : ''
          });
        }
      });
    }

    // Convert to JSON string
    const jsonOutput = JSON.stringify(profileData, null, 2);

    // Try to copy to clipboard
    navigator.clipboard.writeText(jsonOutput).then(() => {
      console.log('%c✓ Profile data extracted and copied to clipboard!', 'color: green; font-size: 16px; font-weight: bold;');
      console.log('%cYou can now paste this into the data collection interface.', 'color: gray;');
    }).catch(err => {
      // If clipboard fails, show the data in a way that's easy to copy
      console.log('%c✓ Profile data extracted!', 'color: green; font-size: 16px; font-weight: bold;');
      console.log('%cCopy the text below (click to select all, then Cmd+C):', 'color: blue; font-weight: bold;');
    });

    // Always log the data so user can copy it manually if needed
    console.log(jsonOutput);

    return profileData;

  } catch (error) {
    console.error('Error extracting profile:', error);
    console.log('If this is not a LinkedIn profile page, please navigate to one first.');
    return null;
  }
})();
