// Conference Attendees Database Application

class AttendeesDatabase {
    constructor() {
        this.attendees = [];
        this.apiKeys = {
            anthropic: '',
            google: '',
            openai: ''
        };
        this.selectedModel = 'gemini-pro'; // Default model
        this.loadFromLocalStorage();
        this.loadApiKeys();
        this.loadModelPreference();
        this.initializeEventListeners();
        this.updateStats();
        this.renderAttendees();
        this.updateModelInfo();

        // Initialize tab highlight position
        setTimeout(() => this.updateTabHighlight(), 100);

        // Update highlight on window resize
        window.addEventListener('resize', () => this.updateTabHighlight());
    }

    // Local Storage Methods
    loadFromLocalStorage() {
        const stored = localStorage.getItem('attendeesDatabase');
        if (stored) {
            try {
                this.attendees = JSON.parse(stored);
            } catch (e) {
                console.error('Error loading from localStorage:', e);
                this.attendees = [];
            }
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('attendeesDatabase', JSON.stringify(this.attendees));
    }

    loadApiKeys() {
        // Load all API keys
        const anthropicKey = localStorage.getItem('anthropicApiKey');
        const googleKey = localStorage.getItem('googleApiKey');
        const openaiKey = localStorage.getItem('openaiApiKey');

        if (anthropicKey) {
            this.apiKeys.anthropic = anthropicKey;
            const input = document.getElementById('anthropicApiKeyInput');
            if (input) input.value = '••••••••';
        }

        if (googleKey) {
            this.apiKeys.google = googleKey;
            const input = document.getElementById('googleApiKeyInput');
            if (input) input.value = '••••••••';
        }

        if (openaiKey) {
            this.apiKeys.openai = openaiKey;
            const input = document.getElementById('openaiApiKeyInput');
            if (input) input.value = '••••••••';
        }

        // Backwards compatibility: load old single API key as anthropic key
        const oldKey = localStorage.getItem('anthropicApiKey');
        if (oldKey && !this.apiKeys.anthropic) {
            this.apiKeys.anthropic = oldKey;
        }
    }

    loadModelPreference() {
        const stored = localStorage.getItem('selectedModel');
        if (stored) {
            this.selectedModel = stored;
            const select = document.getElementById('modelSelect');
            if (select) select.value = stored;
        }
    }

    saveApiKey(provider) {
        const inputId = `${provider}ApiKeyInput`;
        const statusId = `${provider}ApiKeyStatus`;
        const input = document.getElementById(inputId);
        const key = input.value.trim();

        if (!key || key === '••••••••') {
            document.getElementById(statusId).innerHTML = '<span style="color: #FF3B30;">Please enter a valid API key</span>';
            return;
        }

        // Validate key format
        if (provider === 'anthropic' && !key.startsWith('sk-ant-')) {
            document.getElementById(statusId).innerHTML = '<span style="color: #FF3B30;">Invalid key format. Should start with sk-ant-</span>';
            return;
        } else if (provider === 'openai' && !key.startsWith('sk-')) {
            document.getElementById(statusId).innerHTML = '<span style="color: #FF3B30;">Invalid key format. Should start with sk-</span>';
            return;
        } else if (provider === 'google' && !key.startsWith('AIza')) {
            document.getElementById(statusId).innerHTML = '<span style="color: #FF3B30;">Invalid key format. Should start with AIza</span>';
            return;
        }

        this.apiKeys[provider] = key;
        localStorage.setItem(`${provider}ApiKey`, key);
        input.value = '••••••••';
        document.getElementById(statusId).innerHTML = '<span style="color: #006B3D;">✓ API key saved successfully</span>';

        setTimeout(() => {
            document.getElementById(statusId).innerHTML = '';
        }, 3000);
    }

    changeModel() {
        const select = document.getElementById('modelSelect');
        this.selectedModel = select.value;
        localStorage.setItem('selectedModel', this.selectedModel);
        this.updateModelInfo();
    }

    updateModelInfo() {
        const qualitySpan = document.getElementById('modelQuality');
        const costSpan = document.getElementById('modelCost');
        const speedSpan = document.getElementById('modelSpeed');

        const modelInfo = {
            'gemini-pro': {
                quality: '⭐⭐⭐⭐ Very Good',
                cost: 'First: $1.25, Then: $0.001 each (cache: 5-60min, FREE)',
                speed: 'Medium (3-5s)'
            },
            'gemini-flash': {
                quality: '⭐⭐⭐ Good',
                cost: 'First: $0.30, Then: $0.003 each (cache: 5-60min, FREE)',
                speed: 'Fast (1-2s)'
            },
            'claude-sonnet': {
                quality: '⭐⭐⭐⭐⭐ Excellent',
                cost: 'First: $1.35, Then: $0.14 each (cache: 5min, 90% off)',
                speed: 'Fast (2-3s)'
            },
            'gpt-4o': {
                quality: '⭐⭐⭐⭐ Very Good',
                cost: 'First: $2.25, Then: $1.13 each (cache: 5-10min, 50% off)',
                speed: 'Fast (2-3s)'
            },
            'gpt-4o-mini': {
                quality: '⭐⭐⭐ Good',
                cost: 'First: $0.07, Then: $0.035 each (cache: 5-10min, 50% off)',
                speed: 'Very Fast (1-2s)'
            }
        };

        const info = modelInfo[this.selectedModel];
        if (info && qualitySpan && costSpan && speedSpan) {
            qualitySpan.textContent = info.quality;
            costSpan.textContent = info.cost;
            speedSpan.textContent = info.speed;
        }
    }

    // Initialize Event Listeners
    initializeEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Data collection
        document.getElementById('addProfileBtn').addEventListener('click', () => this.addProfile());
        document.getElementById('clearFormBtn').addEventListener('click', () => this.clearForm());

        // Filters and search
        document.getElementById('searchInput').addEventListener('input', () => this.renderAttendees());
        document.getElementById('schoolFilter').addEventListener('change', () => this.renderAttendees());
        document.getElementById('sortBy').addEventListener('change', () => this.renderAttendees());
        document.getElementById('clearFiltersBtn').addEventListener('click', () => this.clearFilters());

        // AI Search
        document.getElementById('aiSearchBtn').addEventListener('click', () => this.performAISearch());
        document.getElementById('clearSearchBtn').addEventListener('click', () => this.clearSearchResults());
        document.getElementById('aiSearchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performAISearch();
        });

        // Import/Export
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importBtn').addEventListener('click', () => this.importData());
        document.getElementById('clearDbBtn').addEventListener('click', () => this.clearDatabase());

        // API Keys
        document.getElementById('saveAnthropicKeyBtn').addEventListener('click', () => this.saveApiKey('anthropic'));
        document.getElementById('saveGoogleKeyBtn').addEventListener('click', () => this.saveApiKey('google'));
        document.getElementById('saveOpenaiKeyBtn').addEventListener('click', () => this.saveApiKey('openai'));

        // Model selection
        document.getElementById('modelSelect').addEventListener('change', () => this.changeModel());

        // Allow Enter key to submit in school input
        document.getElementById('schoolInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addProfile();
        });
    }

    // Tab Management
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });

        // Animate the highlight bubble
        this.updateTabHighlight();

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        // Refresh view if switching to attendees list
        if (tabName === 'view') {
            this.renderAttendees();
            this.updateSchoolFilter();
        }
    }

    updateTabHighlight() {
        const activeBtn = document.querySelector('.tab-btn.active');
        const highlight = document.querySelector('.tab-highlight');

        if (activeBtn && highlight) {
            const tabsContainer = document.querySelector('.tabs');
            const containerRect = tabsContainer.getBoundingClientRect();
            const btnRect = activeBtn.getBoundingClientRect();

            // Calculate position - create equal 1px gaps on left and right
            const btnLeft = btnRect.left - containerRect.left;
            const btnWidth = btnRect.width;

            // Outer bubble is at 64px with 1px border, so inner edge is at 65px
            // Buttons start at 64px, overlapping the border by 1px
            // Add 2px to left (1px past border + 1px gap) and subtract 3px from width
            // (2px for the left shift + 1px for right gap)
            highlight.style.left = `${btnLeft + 2}px`;
            highlight.style.width = `${btnWidth - 3}px`;
        }
    }

    // Add Profile
    addProfile() {
        const jsonInput = document.getElementById('jsonInput').value.trim();
        const schoolInput = document.getElementById('schoolInput').value.trim();
        const imageInput = document.getElementById('imageInput').value.trim();
        const statusDiv = document.getElementById('formStatus');

        // Validate inputs
        if (!jsonInput) {
            this.showStatus('Please paste the LinkedIn profile data.', 'error');
            return;
        }

        try {
            const profileData = JSON.parse(jsonInput);

            // Add school from manual input if provided
            if (schoolInput) {
                profileData.school = schoolInput;
            }

            // Add image from manual input if provided (and not already in the data)
            if (imageInput && !profileData.image) {
                profileData.image = imageInput;
            }

            // Add unique ID and timestamp
            profileData.id = Date.now() + Math.random();
            profileData.addedAt = new Date().toISOString();

            // Check for duplicates (by URL)
            const duplicate = this.attendees.find(a => a.url === profileData.url);
            if (duplicate) {
                this.showStatus('This profile has already been added!', 'error');
                return;
            }

            // Add to database
            this.attendees.push(profileData);
            this.saveToLocalStorage();
            this.updateStats();

            this.showStatus(`Successfully added ${profileData.name}!`, 'success');
            this.clearForm();

            // Clear status after 3 seconds
            setTimeout(() => {
                statusDiv.className = 'status-message';
                statusDiv.textContent = '';
            }, 3000);

        } catch (e) {
            this.showStatus('Invalid JSON data. Please make sure you copied the entire output from the DevTools script.', 'error');
            console.error('JSON Parse Error:', e);
        }
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('formStatus');
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
    }

    clearForm() {
        document.getElementById('jsonInput').value = '';
        document.getElementById('schoolInput').value = '';
        document.getElementById('imageInput').value = '';
        document.getElementById('formStatus').className = 'status-message';
        document.getElementById('formStatus').textContent = '';
    }

    // Stats
    updateStats() {
        const count = this.attendees.length;
        document.getElementById('totalCount').textContent = count;

        const percentage = Math.min((count / 700) * 100, 100);
        const progressBar = document.getElementById('progressBar');
        progressBar.style.width = percentage + '%';
    }

    // Rendering Attendees
    renderAttendees() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const schoolFilter = document.getElementById('schoolFilter').value;
        const sortBy = document.getElementById('sortBy').value;

        // Filter attendees
        let filtered = this.attendees.filter(attendee => {
            // Search filter
            const matchesSearch = !searchTerm ||
                (attendee.name && attendee.name.toLowerCase().includes(searchTerm)) ||
                (attendee.headline && attendee.headline.toLowerCase().includes(searchTerm)) ||
                (attendee.school && attendee.school.toLowerCase().includes(searchTerm)) ||
                (attendee.experience && attendee.experience.some(exp =>
                    exp.company.toLowerCase().includes(searchTerm) ||
                    exp.title.toLowerCase().includes(searchTerm)
                ));

            // School filter
            const matchesSchool = !schoolFilter || attendee.school === schoolFilter;

            return matchesSearch && matchesSchool;
        });

        // Sort attendees
        filtered.sort((a, b) => {
            if (sortBy === 'name') {
                return (a.name || '').localeCompare(b.name || '');
            } else if (sortBy === 'school') {
                return (a.school || '').localeCompare(b.school || '');
            } else if (sortBy === 'recent') {
                return new Date(b.addedAt) - new Date(a.addedAt);
            }
            return 0;
        });

        // Render
        const container = document.getElementById('attendeesList');
        const noResults = document.getElementById('noResults');

        if (filtered.length === 0) {
            container.innerHTML = '';
            noResults.style.display = 'block';
            return;
        }

        noResults.style.display = 'none';
        container.innerHTML = filtered.map(attendee => this.renderAttendeeCard(attendee)).join('');
    }

    renderAttendeeCard(attendee) {
        const allExperienceHTML = attendee.experience && attendee.experience.length > 0
            ? attendee.experience.map(exp => `
                <div class="experience-item">
                    <div class="item-title">${this.escapeHtml(exp.title)}</div>
                    <div class="item-company">${this.escapeHtml(exp.company)}</div>
                    <div class="item-duration">${this.escapeHtml(exp.duration)}</div>
                    ${exp.description ? `<div class="item-description">${this.escapeHtml(exp.description)}</div>` : ''}
                </div>
            `).join('')
            : '';

        const experienceHTML = attendee.experience && attendee.experience.length > 0
            ? `<div class="attendee-section">
                <h4>Experience</h4>
                <div class="experience-list" data-id="${attendee.id}">
                    ${attendee.experience.slice(0, 3).map(exp => `
                        <div class="experience-item">
                            <div class="item-title">${this.escapeHtml(exp.title)}</div>
                            <div class="item-company">${this.escapeHtml(exp.company)}</div>
                            <div class="item-duration">${this.escapeHtml(exp.duration)}</div>
                            ${exp.description ? `<div class="item-description">${this.escapeHtml(exp.description)}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                ${attendee.experience.length > 3 ? `
                    <button class="expand-btn" onclick="window.db.toggleExperience('${attendee.id}')">
                        Show ${attendee.experience.length - 3} more
                    </button>
                    <div class="experience-list-full" data-id="${attendee.id}" style="display: none;">
                        ${allExperienceHTML}
                    </div>
                ` : ''}
            </div>`
            : '';

        const educationHTML = attendee.education && attendee.education.length > 0
            ? `<div class="attendee-section">
                <h4>Education</h4>
                ${attendee.education.map(edu => `
                    <div class="education-item">
                        <div class="item-title">${this.escapeHtml(edu.school)}</div>
                        <div class="item-degree">${this.escapeHtml(edu.degree)}</div>
                        <div class="item-duration">${this.escapeHtml(edu.duration)}</div>
                    </div>
                `).join('')}
            </div>`
            : '';

        const skillsHTML = attendee.skills && attendee.skills.length > 0
            ? `<div class="attendee-section">
                <h4>Skills</h4>
                <div class="skills-list">
                    ${attendee.skills.slice(0, 8).map(skill => `
                        <span class="skill-tag">${this.escapeHtml(skill)}</span>
                    `).join('')}
                    ${attendee.skills.length > 8 ? `<span class="skill-tag">+${attendee.skills.length - 8} more</span>` : ''}
                </div>
            </div>`
            : '';

        const organizationsHTML = attendee.organizations && attendee.organizations.length > 0
            ? `<div class="attendee-section">
                <h4>Organizations</h4>
                ${attendee.organizations.map(org => `
                    <div class="experience-item">
                        <div class="item-title">${this.escapeHtml(org.name)}</div>
                        ${org.role ? `<div class="item-company">${this.escapeHtml(org.role)}</div>` : ''}
                        ${org.duration ? `<div class="item-duration">${this.escapeHtml(org.duration)}</div>` : ''}
                    </div>
                `).join('')}
            </div>`
            : '';

        const volunteeringHTML = attendee.volunteering && attendee.volunteering.length > 0
            ? `<div class="attendee-section">
                <h4>Volunteering</h4>
                ${attendee.volunteering.map(vol => `
                    <div class="experience-item">
                        <div class="item-title">${this.escapeHtml(vol.role)}</div>
                        ${vol.organization ? `<div class="item-company">${this.escapeHtml(vol.organization)}</div>` : ''}
                        ${vol.duration ? `<div class="item-duration">${this.escapeHtml(vol.duration)}</div>` : ''}
                    </div>
                `).join('')}
            </div>`
            : '';

        return `
            <div class="attendee-card">
                <button class="delete-btn" onclick="window.db.deleteAttendee('${attendee.id}')" title="Delete profile">×</button>
                <div class="attendee-header">
                    ${attendee.image ? `<img src="${this.escapeHtml(attendee.image)}" alt="${this.escapeHtml(attendee.name)}" class="attendee-image">` : ''}
                    <div class="attendee-info">
                        <div class="attendee-name">${this.escapeHtml(attendee.name || 'Unknown')}</div>
                        <div class="attendee-headline">${this.escapeHtml(attendee.headline || '')}</div>
                        <div class="attendee-location">${this.escapeHtml(attendee.location || '')}</div>
                        ${attendee.school ? (() => {
                            const logoUrl = this.getSchoolLogo(attendee.school);
                            const schoolClass = this.getSchoolClass(attendee.school);
                            return `<span class="attendee-school ${schoolClass}">
                                ${logoUrl ? `<img src="${logoUrl}" alt="${this.escapeHtml(attendee.school)} logo" class="attendee-school-logo">` : ''}
                                ${this.escapeHtml(attendee.school)}
                            </span>`;
                        })() : ''}
                    </div>
                </div>
                ${experienceHTML}
                ${educationHTML}
                ${organizationsHTML}
                ${volunteeringHTML}
                ${skillsHTML}
                ${attendee.url ? `<a href="${this.escapeHtml(attendee.url)}" target="_blank" class="linkedin-link">View LinkedIn Profile →</a>` : ''}
            </div>
        `;
    }

    renderAttendeeCardWithHighlights(attendee, highlights, relevance, score, scoreClass) {
        // Create a map of section:index:field -> reason for precise highlighting
        const highlightMap = {};
        if (highlights && highlights.length > 0) {
            highlights.forEach(h => {
                const key = h.index !== undefined
                    ? `${h.section}:${h.index}:${h.field || 'all'}`
                    : h.section; // For sections without index (like headline)
                highlightMap[key] = h.reason;
            });
        }

        console.log('Highlight map:', highlightMap);

        // Add relevance explanation at the top if provided
        const relevanceHTML = relevance ? (() => {
            // Check if relevance starts with a match quality descriptor
            const match = relevance.match(/^([^:]+:)/);
            if (match) {
                const descriptor = match[1]; // e.g., "Exceptional match:"
                const rest = relevance.substring(descriptor.length).trim();
                return `
                    <div class="match-relevance">
                        <strong>${this.escapeHtml(descriptor)}</strong> ${this.escapeHtml(rest)}
                    </div>
                `;
            } else {
                return `
                    <div class="match-relevance">
                        ${this.escapeHtml(relevance)}
                    </div>
                `;
            }
        })() : '';

        // Add score badge if provided
        const scoreHTML = score !== undefined ? (() => {
            const radius = 34;
            const circumference = 2 * Math.PI * radius;
            const progress = (score / 100) * circumference;
            const dashOffset = circumference - progress;

            return `
                <div class="match-score ${scoreClass}">
                    <div class="score-circle-wrapper">
                        <svg class="score-circle" width="80" height="80" viewBox="0 0 80 80">
                            <circle class="score-circle-bg" cx="40" cy="40" r="${radius}"></circle>
                            <circle class="score-circle-progress" cx="40" cy="40" r="${radius}"
                                    stroke-dasharray="${circumference}"
                                    stroke-dashoffset="${circumference}"
                                    data-target-offset="${dashOffset}"></circle>
                        </svg>
                        <div class="score-number">${score}</div>
                    </div>
                    <div class="score-label">Match Score</div>
                </div>
            `;
        })() : '';

        // Helper function to check if a specific item should be highlighted
        const shouldHighlight = (section, index, field) => {
            const key = index !== undefined
                ? `${section}:${index}:${field || 'all'}`
                : section;
            return highlightMap[key] || null;
        };

        const createBadge = (reason) => {
            // Show reason as hover popup if it's more than just a few words (likely an inferred match with context)
            const isContextual = reason && reason.length > 30;
            if (isContextual) {
                return `<span class="match-badge-with-popup">
                    <span class="inline-match-badge">✨ Match</span>
                    <span class="match-popup">${this.escapeHtml(reason)}</span>
                </span>`;
            }
            return `<span class="inline-match-badge" title="${this.escapeHtml(reason)}">✨ Match</span>`;
        };

        const renderExpItem = (exp, expIndex) => {
            const titleMatch = shouldHighlight('experience', expIndex, 'title');
            const companyMatch = shouldHighlight('experience', expIndex, 'company');
            const descMatch = shouldHighlight('experience', expIndex, 'description');
            const anyMatch = shouldHighlight('experience', expIndex, 'all');

            // Only show ONE badge on the most relevant field
            const showBadge = (titleMatch || companyMatch || descMatch || anyMatch)
                ? createBadge(titleMatch || companyMatch || descMatch || anyMatch)
                : '';

            return `
                <div class="experience-item">
                    <div class="item-title">
                        ${this.escapeHtml(exp.title)}
                        ${showBadge}
                    </div>
                    <div class="item-company">${this.escapeHtml(exp.company)}</div>
                    <div class="item-duration">${this.escapeHtml(exp.duration)}</div>
                    ${exp.description ? `<div class="item-description">${this.escapeHtml(exp.description)}</div>` : ''}
                </div>
            `;
        };

        const allExperienceHTML = attendee.experience && attendee.experience.length > 0
            ? attendee.experience.map((exp, idx) => renderExpItem(exp, idx)).join('')
            : '';

        const experienceHTML = attendee.experience && attendee.experience.length > 0
            ? `<div class="attendee-section">
                <h4>Experience</h4>
                <div class="experience-list" data-id="${attendee.id}">
                    ${attendee.experience.slice(0, 3).map((exp, idx) => renderExpItem(exp, idx)).join('')}
                </div>
                ${attendee.experience.length > 3 ? `
                    <button class="expand-btn" onclick="window.db.toggleExperience('${attendee.id}')">
                        Show ${attendee.experience.length - 3} more
                    </button>
                    <div class="experience-list-full" data-id="${attendee.id}" style="display: none;">
                        ${allExperienceHTML}
                    </div>
                ` : ''}
            </div>`
            : '';

        const educationHTML = attendee.education && attendee.education.length > 0
            ? `<div class="attendee-section">
                <h4>Education</h4>
                ${attendee.education.map((edu, eduIndex) => {
                    const schoolMatch = shouldHighlight('education', eduIndex, 'school');
                    const degreeMatch = shouldHighlight('education', eduIndex, 'degree');
                    const anyMatch = shouldHighlight('education', eduIndex, 'all');

                    // Only show ONE badge per education item
                    const showBadge = (schoolMatch || degreeMatch || anyMatch)
                        ? createBadge(schoolMatch || degreeMatch || anyMatch)
                        : '';

                    return `
                        <div class="education-item">
                            <div class="item-title">
                                ${this.escapeHtml(edu.school)}
                                ${showBadge}
                            </div>
                            <div class="item-degree">${this.escapeHtml(edu.degree)}</div>
                            <div class="item-duration">${this.escapeHtml(edu.duration)}</div>
                        </div>
                    `;
                }).join('')}
            </div>`
            : '';

        const skillsHTML = attendee.skills && attendee.skills.length > 0
            ? `<div class="attendee-section">
                <h4>Skills</h4>
                <div class="skills-list">
                    ${attendee.skills.slice(0, 8).map((skill, skillIndex) => {
                        const match = shouldHighlight('skills', skillIndex);
                        return `<span class="skill-tag">${this.escapeHtml(skill)}${match ? createBadge(match) : ''}</span>`;
                    }).join('')}
                    ${attendee.skills.length > 8 ? `<span class="skill-tag">+${attendee.skills.length - 8} more</span>` : ''}
                </div>
            </div>`
            : '';

        const organizationsHTML = attendee.organizations && attendee.organizations.length > 0
            ? `<div class="attendee-section">
                <h4>Organizations</h4>
                ${attendee.organizations.map((org, orgIndex) => {
                    const nameMatch = shouldHighlight('organizations', orgIndex, 'name');
                    const roleMatch = shouldHighlight('organizations', orgIndex, 'role');
                    const anyMatch = shouldHighlight('organizations', orgIndex, 'all');
                    const showBadge = (nameMatch || roleMatch || anyMatch)
                        ? createBadge(nameMatch || roleMatch || anyMatch)
                        : '';

                    return `
                        <div class="experience-item">
                            <div class="item-title">
                                ${this.escapeHtml(org.name)}
                                ${showBadge}
                            </div>
                            ${org.role ? `<div class="item-company">${this.escapeHtml(org.role)}</div>` : ''}
                            ${org.duration ? `<div class="item-duration">${this.escapeHtml(org.duration)}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>`
            : '';

        const volunteeringHTML = attendee.volunteering && attendee.volunteering.length > 0
            ? `<div class="attendee-section">
                <h4>Volunteering</h4>
                ${attendee.volunteering.map((vol, volIndex) => {
                    const roleMatch = shouldHighlight('volunteering', volIndex, 'role');
                    const orgMatch = shouldHighlight('volunteering', volIndex, 'organization');
                    const anyMatch = shouldHighlight('volunteering', volIndex, 'all');
                    const showBadge = (roleMatch || orgMatch || anyMatch)
                        ? createBadge(roleMatch || orgMatch || anyMatch)
                        : '';

                    return `
                        <div class="experience-item">
                            <div class="item-title">
                                ${this.escapeHtml(vol.role)}
                                ${showBadge}
                            </div>
                            ${vol.organization ? `<div class="item-company">${this.escapeHtml(vol.organization)}</div>` : ''}
                            ${vol.duration ? `<div class="item-duration">${this.escapeHtml(vol.duration)}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>`
            : '';

        const headlineMatch = shouldHighlight('headline');
        const schoolMatch = shouldHighlight('school');

        // Only show badge on headline if school doesn't match (avoid duplicates)
        const showHeadlineBadge = headlineMatch && !schoolMatch;

        return `
            <button class="delete-btn" onclick="window.db.deleteAttendee('${attendee.id}')" title="Delete profile">×</button>
            ${scoreHTML}
            ${relevanceHTML}
            <div class="attendee-header">
                ${attendee.image ? `<img src="${this.escapeHtml(attendee.image)}" alt="${this.escapeHtml(attendee.name)}" class="attendee-image">` : ''}
                <div class="attendee-info">
                    <div class="attendee-name">${this.escapeHtml(attendee.name || 'Unknown')}</div>
                    <div class="attendee-headline">
                        ${this.escapeHtml(attendee.headline || '')}
                        ${showHeadlineBadge ? createBadge(headlineMatch) : ''}
                    </div>
                    <div class="attendee-location">${this.escapeHtml(attendee.location || '')}</div>
                    ${attendee.school ? (() => {
                        const logoUrl = this.getSchoolLogo(attendee.school);
                        const schoolClass = this.getSchoolClass(attendee.school);
                        return `<span class="attendee-school ${schoolClass}">
                            ${logoUrl ? `<img src="${logoUrl}" alt="${this.escapeHtml(attendee.school)} logo" class="attendee-school-logo">` : ''}
                            ${this.escapeHtml(attendee.school)}
                        </span>
                        ${schoolMatch ? createBadge(schoolMatch) : ''}`;
                    })() : ''}
                </div>
            </div>
            ${experienceHTML}
            ${educationHTML}
            ${organizationsHTML}
            ${volunteeringHTML}
            ${skillsHTML}
            ${attendee.url ? `<a href="${this.escapeHtml(attendee.url)}" target="_blank" class="linkedin-link">View LinkedIn Profile →</a>` : ''}
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Get CSS class for elite universities
    getSchoolClass(schoolName) {
        if (!schoolName) return '';

        const normalized = schoolName.toLowerCase();

        // Ivy League
        if (normalized.includes('harvard')) return 'harvard';
        if (normalized.includes('yale')) return 'yale';
        if (normalized.includes('princeton')) return 'princeton';
        if (normalized.includes('brown')) return 'brown';
        if (normalized.includes('dartmouth')) return 'dartmouth';
        if (normalized.includes('cornell')) return 'cornell';
        if (normalized.includes('columbia')) return 'columbia';
        if (normalized.includes('penn') || normalized.includes('university of pennsylvania')) return 'upenn';

        // Other elite universities
        if (normalized.includes('chicago') && normalized.includes('university')) return 'uchicago';
        if (normalized.includes('stanford')) return 'stanford';
        if (normalized.includes('mit') || normalized === 'massachusetts institute of technology') return 'mit';

        return '';
    }

    // Get logo URL for elite universities
    getSchoolLogo(schoolName) {
        if (!schoolName) return null;

        const normalized = schoolName.toLowerCase();

        // Ivy League
        if (normalized.includes('harvard')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Harvard_University_coat_of_arms.svg/200px-Harvard_University_coat_of_arms.svg.png';
        if (normalized.includes('yale')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Yale_University_Shield_1.svg/200px-Yale_University_Shield_1.svg.png';
        if (normalized.includes('princeton')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Princeton_seal.svg/200px-Princeton_seal.svg.png';
        if (normalized.includes('brown')) return 'https://upload.wikimedia.org/wikipedia/en/thumb/5/50/Shield_of_Brown_University.svg/200px-Shield_of_Brown_University.svg.png';
        if (normalized.includes('dartmouth')) return 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e4/Dartmouth_College_shield.svg/200px-Dartmouth_College_shield.svg.png';
        if (normalized.includes('cornell')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Cornell_University_seal.svg/200px-Cornell_University_seal.svg.png';
        if (normalized.includes('columbia')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Coat_of_Arms_of_Columbia_University.svg/200px-Coat_of_Arms_of_Columbia_University.svg.png';
        if (normalized.includes('penn') || normalized.includes('university of pennsylvania')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/UPenn_shield_with_banner.svg/200px-UPenn_shield_with_banner.svg.png';

        // Other elite universities
        if (normalized.includes('chicago') && normalized.includes('university')) return 'https://upload.wikimedia.org/wikipedia/en/thumb/7/79/University_of_Chicago_shield.svg/200px-University_of_Chicago_shield.svg.png';
        if (normalized.includes('stanford')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Seal_of_Leland_Stanford_Junior_University.svg/200px-Seal_of_Leland_Stanford_Junior_University.svg.png';
        if (normalized.includes('mit') || normalized === 'massachusetts institute of technology') return 'https://upload.wikimedia.org/wikipedia/en/thumb/4/44/MIT_Seal.svg/200px-MIT_Seal.svg.png';

        return null;
    }

    // School Filter Dropdown
    updateSchoolFilter() {
        const schools = [...new Set(this.attendees.map(a => a.school).filter(s => s))].sort();
        const select = document.getElementById('schoolFilter');

        // Keep current selection
        const currentValue = select.value;

        select.innerHTML = '<option value="">All Schools</option>' +
            schools.map(school => `<option value="${this.escapeHtml(school)}">${this.escapeHtml(school)}</option>`).join('');

        // Restore selection if it still exists
        if (schools.includes(currentValue)) {
            select.value = currentValue;
        }
    }

    clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('schoolFilter').value = '';
        document.getElementById('sortBy').value = 'name';
        this.renderAttendees();
    }

    // Toggle experience expansion
    toggleExperience(attendeeId, parentElement = null) {
        // Find the elements - either in the specified parent or globally
        const context = parentElement || document;
        const shortList = context.querySelector(`.experience-list[data-id="${attendeeId}"]`);
        const fullList = context.querySelector(`.experience-list-full[data-id="${attendeeId}"]`);
        const btn = event && event.target ? event.target : context.querySelector(`.expand-btn`);

        if (!shortList || !fullList) return;

        if (fullList.style.display === 'none') {
            shortList.style.display = 'none';
            fullList.style.display = 'block';
            if (btn) btn.textContent = 'Show less';
        } else {
            shortList.style.display = 'block';
            fullList.style.display = 'none';
            const hiddenCount = this.attendees.find(a => a.id == attendeeId)?.experience?.length - 3;
            if (btn && hiddenCount) btn.textContent = `Show ${hiddenCount} more`;
        }
    }

    // Delete individual attendee
    deleteAttendee(attendeeId) {
        const attendee = this.attendees.find(a => a.id == attendeeId);
        const name = attendee ? attendee.name : 'this profile';

        const confirm = window.confirm(`Delete ${name}? This cannot be undone.`);

        if (confirm) {
            this.attendees = this.attendees.filter(a => a.id != attendeeId);
            this.saveToLocalStorage();
            this.updateStats();
            this.renderAttendees();
            this.updateSchoolFilter();
        }
    }

    // AI Search
    async performAISearch() {
        const query = document.getElementById('aiSearchInput').value.trim();
        const searchInput = document.getElementById('aiSearchInput');
        const statusDiv = document.getElementById('aiSearchStatus');
        const resultsDiv = document.getElementById('aiSearchResults');

        if (!query) {
            statusDiv.className = 'ai-search-status error';
            statusDiv.textContent = 'Please enter a search query';
            return;
        }

        // Determine which API key to use based on selected model
        let apiKey = '';
        if (this.selectedModel === 'claude-sonnet') {
            apiKey = this.apiKeys.anthropic;
            if (!apiKey) {
                statusDiv.className = 'ai-search-status error';
                statusDiv.innerHTML = 'Please configure your Anthropic API key in the Import/Export tab first';
                return;
            }
        } else if (this.selectedModel.startsWith('gemini')) {
            apiKey = this.apiKeys.google;
            if (!apiKey) {
                statusDiv.className = 'ai-search-status error';
                statusDiv.innerHTML = 'Please configure your Google API key in the Import/Export tab first';
                return;
            }
        } else if (this.selectedModel.startsWith('gpt')) {
            apiKey = this.apiKeys.openai;
            if (!apiKey) {
                statusDiv.className = 'ai-search-status error';
                statusDiv.innerHTML = 'Please configure your OpenAI API key in the Import/Export tab first';
                return;
            }
        }

        if (this.attendees.length === 0) {
            statusDiv.className = 'ai-search-status error';
            statusDiv.textContent = 'No attendees in database yet';
            return;
        }

        // Show loading state with pulsating glow
        searchInput.classList.add('searching');
        statusDiv.className = 'ai-search-status searching';
        statusDiv.textContent = '🤔 AI is searching through profiles...';
        resultsDiv.innerHTML = '';

        try {
            // Use the proxy server - works both locally and on Vercel
            // On Vercel: /api/search points to the serverless function
            // Locally: falls back to localhost:8000 if /api/search fails
            const apiUrl = window.location.hostname === 'localhost'
                ? 'http://localhost:8000/api/search'
                : '/api/search';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey: apiKey,
                    model: this.selectedModel,
                    query: query,
                    attendees: JSON.stringify(this.attendees, null, 2)
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Show the detailed error from the proxy server
                const errorMsg = data.details || data.error || response.statusText;
                throw new Error(errorMsg);
            }

            // Log full response to debug extended thinking mode
            console.log('Full API Response:', data);

            // With extended thinking, response has multiple content blocks
            // Find the text block (not thinking block)
            const textContent = data.content.find(block => block.type === 'text');
            const aiResponse = textContent ? textContent.text : data.content[0].text;
            console.log('Raw AI Response:', aiResponse);

            // Parse AI response
            let result;
            try {
                // Try to extract JSON from the response
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    result = JSON.parse(jsonMatch[0]);
                    console.log('Parsed result:', result);
                } else {
                    throw new Error('No JSON found in response');
                }
            } catch (e) {
                // Fallback: show raw response
                console.error('Parse error:', e);
                searchInput.classList.remove('searching');
                statusDiv.className = 'ai-search-status error';
                statusDiv.textContent = 'Error parsing AI response';
                resultsDiv.innerHTML = `<div class="ai-result-summary">${aiResponse}</div>`;
                return;
            }

            // Display results - hide loading state
            searchInput.classList.remove('searching');
            statusDiv.className = 'ai-search-status';

            if (!result.matches || result.matches.length === 0) {
                resultsDiv.innerHTML = `
                    <div class="ai-result-summary">
                        ${result.summary || 'No matches found for your query.'}
                    </div>
                `;
                document.getElementById('clearSearchBtn').style.display = 'inline-block';
                return;
            }

            // First pass: calculate all scores
            const matchesWithScores = result.matches.map(match => {
                const attendee = this.attendees.find(a => a.id == match.id);
                if (!attendee) return null;

                // Debug: Log what we're getting from AI
                console.log('Match data from AI:', match);
                console.log('AI provided score?', match.score !== undefined && match.score !== null ? `YES: ${match.score}` : 'NO (undefined/null)');

                // Use the score from AI (extended thinking mode should provide it)
                const score = match.score || 0;
                if (!match.score) {
                    console.error('WARNING: AI did not provide a score for match:', match);
                }

                return {
                    match,
                    attendee,
                    score
                };
            }).filter(item => item !== null);

            // Filter out matches below minimum score threshold
            const MINIMUM_SCORE_THRESHOLD = 25;
            const filteredMatches = matchesWithScores.filter(item => item.score >= MINIMUM_SCORE_THRESHOLD);
            console.log(`Filtered out ${matchesWithScores.length - filteredMatches.length} matches below score threshold of ${MINIMUM_SCORE_THRESHOLD}`);

            // Sort by score descending (highest first)
            filteredMatches.sort((a, b) => b.score - a.score);
            console.log('Sorted matches by score:', filteredMatches.map(m => ({ name: m.attendee.name, score: m.score })));

            // Show clear button
            document.getElementById('clearSearchBtn').style.display = 'inline-block';

            // Check if we have any matches after filtering
            if (filteredMatches.length === 0) {
                resultsDiv.innerHTML = `
                    <div class="ai-result-summary">
                        ${result.summary || 'No high-quality matches found for your query.'}<br><br>
                        All matches had scores below the minimum threshold of ${MINIMUM_SCORE_THRESHOLD}.
                    </div>
                `;
                return;
            }

            // Show summary with filtered count
            let html = `<div class="ai-result-summary">
                <strong>Search Results:</strong> ${this.escapeHtml(result.summary || 'Found matching attendees')}
                <br><br>
                Found ${filteredMatches.length} high-quality ${filteredMatches.length === 1 ? 'match' : 'matches'}:
            </div>`;

            // Show matching attendees with scores
            html += '<div class="attendees-list">';
            filteredMatches.forEach(({ match, attendee, score }) => {
                const scoreClass = score >= 75 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low';

                html += `<div class="attendee-card ai-match-card">`;
                html += this.renderAttendeeCardWithHighlights(attendee, match.highlights, match.relevance, score, scoreClass);
                html += `</div>`;
            });
            html += '</div>';

            resultsDiv.innerHTML = html;

            // Trigger score circle animations after DOM is rendered
            requestAnimationFrame(() => {
                const circles = document.querySelectorAll('.score-circle-progress');
                circles.forEach(circle => {
                    const targetOffset = circle.getAttribute('data-target-offset');
                    if (targetOffset) {
                        circle.style.strokeDashoffset = targetOffset;
                    }
                });
            });

            // Auto-expand sections with matches - must happen after DOM is updated
            setTimeout(() => {
                result.matches.forEach(match => {
                    const attendee = this.attendees.find(a => a.id == match.id);
                    if (attendee && match.highlights && attendee.experience && attendee.experience.length > 3) {
                        // Check if any highlights are in the experience section beyond first 3
                        const experienceHighlights = match.highlights.filter(h => h.section === 'experience');

                        if (experienceHighlights.length > 0) {
                            // Check if any matches are in positions 3+ using the index field
                            let hasMatchInCollapsed = false;

                            experienceHighlights.forEach(h => {
                                // Use the index field directly (AI now provides exact array index)
                                if (h.index !== undefined && h.index >= 3) {
                                    hasMatchInCollapsed = true;
                                }
                            });

                            if (hasMatchInCollapsed) {
                                // Find all cards in results and expand the matching one
                                const cards = resultsDiv.querySelectorAll('.ai-match-card');
                                cards.forEach(card => {
                                    const shortList = card.querySelector(`.experience-list[data-id="${attendee.id}"]`);
                                    const fullList = card.querySelector(`.experience-list-full[data-id="${attendee.id}"]`);
                                    const btn = card.querySelector('.expand-btn');

                                    if (shortList && fullList && btn) {
                                        shortList.style.display = 'none';
                                        fullList.style.display = 'block';
                                        btn.textContent = 'Show less';
                                    }
                                });
                            }
                        }
                    }
                });
            }, 50);

        } catch (error) {
            searchInput.classList.remove('searching');
            statusDiv.className = 'ai-search-status error';
            statusDiv.textContent = `Error: ${error.message}. Please check your API key and try again.`;
            console.error('AI Search Error:', error);
        }
    }

    clearSearchResults() {
        const statusDiv = document.getElementById('aiSearchStatus');
        const resultsDiv = document.getElementById('aiSearchResults');
        const clearBtn = document.getElementById('clearSearchBtn');
        const searchInput = document.getElementById('aiSearchInput');

        // Clear all content and remove searching state
        searchInput.classList.remove('searching');
        statusDiv.className = 'ai-search-status';
        resultsDiv.innerHTML = '';
        searchInput.value = '';
        clearBtn.style.display = 'none';
    }

    // Import/Export
    exportData() {
        const dataStr = JSON.stringify(this.attendees, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `attendees-database-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        alert(`Exported ${this.attendees.length} attendee profiles!`);
    }

    importData() {
        const fileInput = document.getElementById('importFile');
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select a file to import.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);

                if (!Array.isArray(imported)) {
                    alert('Invalid file format. Expected an array of attendees.');
                    return;
                }

                const confirm = window.confirm(
                    `This will import ${imported.length} profiles. This will merge with your existing ${this.attendees.length} profiles. Continue?`
                );

                if (confirm) {
                    // Merge, avoiding duplicates by URL
                    const existingUrls = new Set(this.attendees.map(a => a.url));
                    const newProfiles = imported.filter(a => !existingUrls.has(a.url));

                    this.attendees = [...this.attendees, ...newProfiles];
                    this.saveToLocalStorage();
                    this.updateStats();
                    this.renderAttendees();

                    alert(`Successfully imported ${newProfiles.length} new profiles!`);
                }
            } catch (e) {
                alert('Error reading file. Please ensure it\'s a valid JSON file.');
                console.error('Import error:', e);
            }
        };

        reader.readAsText(file);
    }

    clearDatabase() {
        const confirm = window.confirm(
            `Are you sure you want to delete all ${this.attendees.length} attendee profiles? This cannot be undone.`
        );

        if (confirm) {
            const doubleConfirm = window.confirm('Really delete? This is your last chance to cancel!');

            if (doubleConfirm) {
                this.attendees = [];
                this.saveToLocalStorage();
                this.updateStats();
                this.renderAttendees();
                alert('Database cleared.');
            }
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.db = new AttendeesDatabase();
});
