// Conference Attendees Database Application

class AttendeesDatabase {
    constructor() {
        this.attendees = [];
        this.selectedModel = 'gemini-3-flash'; // Default model
        this.loadModelPreference();
        this.initializeEventListeners();

        // Load data (either from localStorage or initial profiles)
        this.initializeDatabase();

        // Initialize tab highlight position
        setTimeout(() => this.updateTabHighlight(), 100);

        // Update highlight on window resize
        window.addEventListener('resize', () => this.updateTabHighlight());
    }

    async initializeDatabase() {
        // Try to load from localStorage first
        const hasLocalData = this.loadFromLocalStorage();

        // If no local data, load initial profiles from server
        if (!hasLocalData) {
            await this.loadInitialProfiles();
        }

        // Update UI after data is loaded
        this.updateStats();
        this.renderAttendees();
        this.updateModelInfo();
    }

    async loadInitialProfiles() {
        try {
            console.log('No local data found. Loading initial profiles from server...');
            const response = await fetch('/data/initial-profiles.json');

            if (!response.ok) {
                console.log('No initial profiles file found on server. Starting with empty database.');
                return;
            }

            const profiles = await response.json();

            if (Array.isArray(profiles) && profiles.length > 0) {
                this.attendees = profiles;
                this.saveToLocalStorage();
                console.log(`Loaded ${profiles.length} initial profiles from server.`);

                // Show a notification to the user
                this.showNotification(`Loaded ${profiles.length} profiles into your local database.`, 'success');
            } else {
                console.log('Initial profiles file is empty.');
            }
        } catch (error) {
            console.error('Error loading initial profiles:', error);
            // Fail silently - just start with empty database
        }
    }

    showNotification(message, type = 'info') {
        // Create a temporary notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#34A853' : '#0071E3'};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-size: 0.875rem;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Local Storage Methods
    loadFromLocalStorage() {
        const stored = localStorage.getItem('attendeesDatabase');
        if (stored) {
            try {
                this.attendees = JSON.parse(stored);
                return true; // Data was loaded from localStorage
            } catch (e) {
                console.error('Error loading from localStorage:', e);
                this.attendees = [];
                return false;
            }
        }
        return false; // No data in localStorage
    }

    saveToLocalStorage() {
        localStorage.setItem('attendeesDatabase', JSON.stringify(this.attendees));
    }

    loadModelPreference() {
        const stored = localStorage.getItem('selectedModel');
        if (stored) {
            this.selectedModel = stored;
            const select = document.getElementById('modelSelect');
            if (select) select.value = stored;
        }
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
            'vector-search': {
                quality: '⭐⭐⭐⭐ Great (Vector pre-filter + AI scoring)',
                cost: '~$0.01 per search (50 candidates to AI)',
                speed: 'Fast (2-4s)'
            },
            'gemini-3-flash': {
                quality: '⭐⭐⭐⭐ Excellent (Newest, Dec 2025)',
                cost: 'First: $0.23, Then: $0.003 each (60min Pro cache FREE)',
                speed: 'Very Fast (1-2s)'
            },
            'gemini-3-pro': {
                quality: '⭐⭐⭐⭐⭐ World-class (Best Multimodal)',
                cost: 'First: $0.90, Then: $0.012 each (60min Pro cache FREE)',
                speed: 'Fast (2-3s)'
            },
            'claude-sonnet': {
                quality: '⭐⭐⭐⭐⭐ Excellent (Best Reasoning)',
                cost: 'First: $1.35, Then: $0.14 each (5min cache, 90% off)',
                speed: 'Fast (2-3s)'
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

        // Data collection - LinkedIn method
        document.getElementById('addProfileBtn').addEventListener('click', () => this.addProfile());
        document.getElementById('clearFormBtn').addEventListener('click', () => this.clearForm());

        // Data collection - PDF method
        this.setupPdfUpload();
        document.getElementById('extractPdfBtn').addEventListener('click', () => this.extractFromPdf());
        document.getElementById('clearPdfFormBtn').addEventListener('click', () => this.clearPdfForm());

        // Collection method tabs
        document.querySelectorAll('.method-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchCollectionMethod(e.target.dataset.method));
        });

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

        // Cloud Sync
        document.getElementById('syncToCloudBtn').addEventListener('click', () => this.syncToCloud());
        document.getElementById('checkSyncBtn').addEventListener('click', () => this.checkSyncStatus());

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
            const pillBorder = tabsContainer.querySelector('.tabs::before') || tabsContainer;

            // Detect if we're on mobile (width <= 768px)
            const isMobile = window.innerWidth <= 768;
            const padding = isMobile ? 20 : 64;

            // Calculate position - create equal 1px gaps on left and right
            const btnLeft = btnRect.left - containerRect.left;
            const btnWidth = btnRect.width;

            // Calculate the desired position
            let highlightLeft = btnLeft + 2;
            let highlightWidth = btnWidth - 3;

            // On mobile, constrain the highlight to stay within the pill border
            if (isMobile) {
                const pillLeft = padding; // 20px on mobile
                const pillRight = containerRect.width - padding; // Container width - 20px
                const highlightRight = highlightLeft + highlightWidth;

                // If highlight would extend beyond the right edge of the pill, clamp it
                if (highlightRight > pillRight - 2) {
                    highlightWidth = pillRight - highlightLeft - 2;
                }

                // If highlight starts before the left edge of the pill, clamp it
                if (highlightLeft < pillLeft + 2) {
                    const diff = (pillLeft + 2) - highlightLeft;
                    highlightLeft = pillLeft + 2;
                    highlightWidth = Math.max(highlightWidth - diff, 50); // Minimum 50px width
                }
            }

            highlight.style.left = `${highlightLeft}px`;
            highlight.style.width = `${highlightWidth}px`;
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

    showToast(message, type = 'success') {
        // Remove any existing toast
        const existing = document.querySelector('.toast-notification');
        if (existing) {
            existing.remove();
        }

        // Create toast
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;

        const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
        toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;

        document.body.appendChild(toast);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    clearForm() {
        document.getElementById('jsonInput').value = '';
        document.getElementById('schoolInput').value = '';
        document.getElementById('imageInput').value = '';
        document.getElementById('formStatus').className = 'status-message';
        document.getElementById('formStatus').textContent = '';
    }

    // Collection Method Switching
    switchCollectionMethod(method) {
        // Update tabs
        document.querySelectorAll('.method-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.method === method);
        });

        // Update content
        document.querySelectorAll('.method-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${method}-method`).classList.add('active');
    }

    // PDF Upload Setup
    setupPdfUpload() {
        const uploadArea = document.getElementById('pdfUploadArea');
        const fileInput = document.getElementById('pdfInput');
        const placeholder = uploadArea.querySelector('.upload-placeholder');
        const preview = uploadArea.querySelector('.upload-preview');
        const fileName = preview.querySelector('.file-name');
        const removeBtn = preview.querySelector('.remove-file');

        // Click to upload
        uploadArea.addEventListener('click', (e) => {
            if (e.target !== removeBtn) {
                fileInput.click();
            }
        });

        // File selected
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                this.showPdfFile(fileInput.files[0]);
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0 && e.dataTransfer.files[0].type === 'application/pdf') {
                fileInput.files = e.dataTransfer.files;
                this.showPdfFile(e.dataTransfer.files[0]);
            }
        });

        // Remove file
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearPdfFile();
        });
    }

    showPdfFile(file) {
        const uploadArea = document.getElementById('pdfUploadArea');
        const placeholder = uploadArea.querySelector('.upload-placeholder');
        const preview = uploadArea.querySelector('.upload-preview');
        const fileName = preview.querySelector('.file-name');

        placeholder.style.display = 'none';
        preview.style.display = 'flex';
        fileName.textContent = file.name;
        uploadArea.classList.add('has-file');
    }

    clearPdfFile() {
        const uploadArea = document.getElementById('pdfUploadArea');
        const fileInput = document.getElementById('pdfInput');
        const placeholder = uploadArea.querySelector('.upload-placeholder');
        const preview = uploadArea.querySelector('.upload-preview');

        fileInput.value = '';
        placeholder.style.display = 'flex';
        preview.style.display = 'none';
        uploadArea.classList.remove('has-file');
    }

    clearPdfForm() {
        this.clearPdfFile();
        document.getElementById('pdfSchoolInput').value = '';
        document.getElementById('formStatus').className = 'status-message';
        document.getElementById('formStatus').textContent = '';
    }

    async extractFromPdf() {
        const fileInput = document.getElementById('pdfInput');
        const schoolInput = document.getElementById('pdfSchoolInput').value.trim();

        if (!fileInput.files.length) {
            this.showStatus('Please select a PDF file.', 'error');
            return;
        }

        const file = fileInput.files[0];

        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            this.showStatus('File size exceeds 10MB limit.', 'error');
            return;
        }

        this.showStatus('Extracting profile data from PDF...', 'info');

        try {
            // Convert file to base64
            const base64 = await this.fileToBase64(file);

            // Call API
            const response = await fetch('/api/extract-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pdf: base64,
                    school: schoolInput
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to extract profile');
            }

            const profileData = await response.json();

            // Debug: log the extracted data
            console.log('Extracted profile data:', profileData);
            console.log('About field:', profileData.about);

            // Generate ID if not present
            if (!profileData.id) {
                profileData.id = Date.now().toString();
            }

            // Add to database
            this.attendees.push(profileData);
            this.saveToLocalStorage();
            this.updateStats();
            this.renderAttendees();

            // Show success feedback
            const name = profileData.name || 'Unknown';
            this.showStatus(`Profile for ${name} added successfully!`, 'success');
            this.showToast(`Added: ${name}`, 'success');
            this.clearPdfForm();

        } catch (error) {
            console.error('PDF extraction error:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
            this.showToast(`Failed to extract profile`, 'error');
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Remove the data URL prefix to get just the base64 data
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
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
                <div class="skills-list" data-expanded="false" data-id="skills-${attendee.id}">
                    ${attendee.skills.slice(0, 8).map(skill => `
                        <span class="skill-tag">${this.escapeHtml(skill)}</span>
                    `).join('')}
                    ${attendee.skills.length > 8 ? `<span class="skill-tag skill-more" onclick="window.db.expandSkills('skills-${attendee.id}', ${JSON.stringify(attendee.skills).replace(/'/g, "&#39;")})">+${attendee.skills.length - 8} more</span>` : ''}
                </div>
            </div>`
            : '';

        const languagesHTML = attendee.languages && attendee.languages.length > 0
            ? `<div class="attendee-section">
                <h4>Languages</h4>
                <div class="skills-list">
                    ${attendee.languages.map(lang => `
                        <span class="skill-tag">${this.escapeHtml(lang)}</span>
                    `).join('')}
                </div>
            </div>`
            : '';

        const interestsHTML = attendee.interests && attendee.interests.length > 0
            ? `<div class="attendee-section">
                <h4>Interests</h4>
                <div class="skills-list">
                    ${attendee.interests.slice(0, 8).map(interest => `
                        <span class="skill-tag">${this.escapeHtml(interest)}</span>
                    `).join('')}
                    ${attendee.interests.length > 8 ? `<span class="skill-tag">+${attendee.interests.length - 8} more</span>` : ''}
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

        const allProjectsHTML = attendee.projects && attendee.projects.length > 0
            ? attendee.projects.map(proj => `
                <div class="experience-item">
                    <div class="item-title">${this.escapeHtml(proj.name)}</div>
                    ${proj.role ? `<div class="item-company">${this.escapeHtml(proj.role)}</div>` : ''}
                    ${proj.duration ? `<div class="item-duration">${this.escapeHtml(proj.duration)}</div>` : ''}
                    ${proj.description ? `<div class="item-description">${this.escapeHtml(proj.description)}</div>` : ''}
                </div>
            `).join('')
            : '';

        const projectsHTML = attendee.projects && attendee.projects.length > 0
            ? `<div class="attendee-section">
                <h4>Projects</h4>
                <div class="projects-list" data-id="projects-${attendee.id}">
                    ${attendee.projects.slice(0, 2).map(proj => `
                        <div class="experience-item">
                            <div class="item-title">${this.escapeHtml(proj.name)}</div>
                            ${proj.role ? `<div class="item-company">${this.escapeHtml(proj.role)}</div>` : ''}
                            ${proj.duration ? `<div class="item-duration">${this.escapeHtml(proj.duration)}</div>` : ''}
                            ${proj.description ? `<div class="item-description">${this.escapeHtml(proj.description)}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                ${attendee.projects.length > 2 ? `
                    <button class="expand-btn" onclick="window.db.toggleSection('projects-${attendee.id}')">
                        Show ${attendee.projects.length - 2} more
                    </button>
                    <div class="projects-list-full" data-id="projects-${attendee.id}" style="display: none;">
                        ${allProjectsHTML}
                    </div>
                ` : ''}
            </div>`
            : '';

        const allAwardsHTML = attendee.awards && attendee.awards.length > 0
            ? attendee.awards.map(award => `
                <div class="experience-item">
                    <div class="item-title">${this.escapeHtml(award.name)}</div>
                    ${award.date ? `<div class="item-duration">${this.escapeHtml(award.date)}</div>` : ''}
                    ${award.description ? `<div class="item-description">${this.escapeHtml(award.description)}</div>` : ''}
                </div>
            `).join('')
            : '';

        const awardsHTML = attendee.awards && attendee.awards.length > 0
            ? `<div class="attendee-section">
                <h4>Awards</h4>
                <div class="awards-list" data-id="awards-${attendee.id}">
                    ${attendee.awards.slice(0, 2).map(award => `
                        <div class="experience-item">
                            <div class="item-title">${this.escapeHtml(award.name)}</div>
                            ${award.date ? `<div class="item-duration">${this.escapeHtml(award.date)}</div>` : ''}
                            ${award.description ? `<div class="item-description">${this.escapeHtml(award.description)}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                ${attendee.awards.length > 2 ? `
                    <button class="expand-btn" onclick="window.db.toggleSection('awards-${attendee.id}')">
                        Show ${attendee.awards.length - 2} more
                    </button>
                    <div class="awards-list-full" data-id="awards-${attendee.id}" style="display: none;">
                        ${allAwardsHTML}
                    </div>
                ` : ''}
            </div>`
            : '';

        // Handle both string and object formats for about field
        const aboutHTML = attendee.about
            ? (() => {
                const isObject = typeof attendee.about === 'object';
                const title = isObject && attendee.about.title ? attendee.about.title : 'About';
                const text = isObject ? attendee.about.text : attendee.about;
                const isLong = text && text.length > 300;
                return `<div class="attendee-section about-section">
                    <h4>${this.escapeHtml(title)}</h4>
                    <div class="about-text ${isLong ? 'collapsed' : ''}" data-id="about-${attendee.id}">${this.escapeHtml(text)}</div>
                    ${isLong ? `<button class="expand-btn" onclick="window.db.toggleAbout('about-${attendee.id}')">Read more</button>` : ''}
                </div>`;
            })()
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
                ${projectsHTML}
                ${organizationsHTML}
                ${volunteeringHTML}
                ${awardsHTML}
                ${skillsHTML}
                ${languagesHTML}
                ${interestsHTML}
                ${aboutHTML}
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
                <div class="skills-list" data-expanded="false" data-id="skills-${attendee.id}">
                    ${attendee.skills.slice(0, 8).map((skill, skillIndex) => {
                        const match = shouldHighlight('skills', skillIndex);
                        return `<span class="skill-tag">${this.escapeHtml(skill)}${match ? createBadge(match) : ''}</span>`;
                    }).join('')}
                    ${attendee.skills.length > 8 ? `<span class="skill-tag skill-more" onclick="window.db.expandSkills('skills-${attendee.id}', ${JSON.stringify(attendee.skills).replace(/'/g, "&#39;")})">+${attendee.skills.length - 8} more</span>` : ''}
                </div>
            </div>`
            : '';

        const languagesHTML = attendee.languages && attendee.languages.length > 0
            ? `<div class="attendee-section">
                <h4>Languages</h4>
                <div class="skills-list">
                    ${attendee.languages.map((lang, langIndex) => {
                        const match = shouldHighlight('languages', langIndex);
                        return `<span class="skill-tag">${this.escapeHtml(lang)}${match ? createBadge(match) : ''}</span>`;
                    }).join('')}
                </div>
            </div>`
            : '';

        const interestsHTML = attendee.interests && attendee.interests.length > 0
            ? `<div class="attendee-section">
                <h4>Interests</h4>
                <div class="skills-list">
                    ${attendee.interests.slice(0, 8).map((interest, interestIndex) => {
                        const match = shouldHighlight('interests', interestIndex);
                        return `<span class="skill-tag">${this.escapeHtml(interest)}${match ? createBadge(match) : ''}</span>`;
                    }).join('')}
                    ${attendee.interests.length > 8 ? `<span class="skill-tag">+${attendee.interests.length - 8} more</span>` : ''}
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

        const projectsHTML = attendee.projects && attendee.projects.length > 0
            ? `<div class="attendee-section">
                <h4>Projects</h4>
                ${attendee.projects.map((proj, projIndex) => {
                    const nameMatch = shouldHighlight('projects', projIndex, 'name');
                    const roleMatch = shouldHighlight('projects', projIndex, 'role');
                    const descMatch = shouldHighlight('projects', projIndex, 'description');
                    const anyMatch = shouldHighlight('projects', projIndex, 'all');
                    const showBadge = (nameMatch || roleMatch || descMatch || anyMatch)
                        ? createBadge(nameMatch || roleMatch || descMatch || anyMatch)
                        : '';

                    return `
                        <div class="experience-item">
                            <div class="item-title">
                                ${this.escapeHtml(proj.name)}
                                ${showBadge}
                            </div>
                            ${proj.role ? `<div class="item-company">${this.escapeHtml(proj.role)}</div>` : ''}
                            ${proj.duration ? `<div class="item-duration">${this.escapeHtml(proj.duration)}</div>` : ''}
                            ${proj.description ? `<div class="item-description">${this.escapeHtml(proj.description)}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>`
            : '';

        const awardsHTML = attendee.awards && attendee.awards.length > 0
            ? `<div class="attendee-section">
                <h4>Awards</h4>
                ${attendee.awards.map((award, awardIndex) => {
                    const nameMatch = shouldHighlight('awards', awardIndex, 'name');
                    const descMatch = shouldHighlight('awards', awardIndex, 'description');
                    const anyMatch = shouldHighlight('awards', awardIndex, 'all');
                    const showBadge = (nameMatch || descMatch || anyMatch)
                        ? createBadge(nameMatch || descMatch || anyMatch)
                        : '';

                    return `
                        <div class="experience-item">
                            <div class="item-title">
                                ${this.escapeHtml(award.name)}
                                ${showBadge}
                            </div>
                            ${award.date ? `<div class="item-duration">${this.escapeHtml(award.date)}</div>` : ''}
                            ${award.description ? `<div class="item-description">${this.escapeHtml(award.description)}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>`
            : '';

        const headlineMatch = shouldHighlight('headline');
        const schoolMatch = shouldHighlight('school');
        const aboutMatch = shouldHighlight('about');

        // Only show badge on headline if school doesn't match (avoid duplicates)
        const showHeadlineBadge = headlineMatch && !schoolMatch;

        // Handle both string and object formats for about field
        const aboutHTML = attendee.about
            ? (() => {
                const isObject = typeof attendee.about === 'object';
                const title = isObject && attendee.about.title ? attendee.about.title : 'About';
                const text = isObject ? attendee.about.text : attendee.about;
                const isLong = text && text.length > 300;
                // If there's a match in about, don't collapse it
                const shouldCollapse = isLong && !aboutMatch;
                return `<div class="attendee-section about-section">
                    <h4>${this.escapeHtml(title)} ${aboutMatch ? createBadge(aboutMatch) : ''}</h4>
                    <div class="about-text ${shouldCollapse ? 'collapsed' : ''}" data-id="about-${attendee.id}">${this.escapeHtml(text)}</div>
                    ${shouldCollapse ? `<button class="expand-btn" onclick="window.db.toggleAbout('about-${attendee.id}')">Read more</button>` : ''}
                </div>`;
            })()
            : '';

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
            ${projectsHTML}
            ${organizationsHTML}
            ${volunteeringHTML}
            ${awardsHTML}
            ${skillsHTML}
            ${languagesHTML}
            ${interestsHTML}
            ${aboutHTML}
            ${attendee.url ? `<a href="${this.escapeHtml(attendee.url)}" target="_blank" class="linkedin-link">View LinkedIn Profile →</a>` : ''}
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    expandSkills(containerId, skills) {
        const container = document.querySelector(`[data-id="${containerId}"]`);
        if (!container) return;

        const isExpanded = container.dataset.expanded === 'true';

        if (isExpanded) {
            // Collapse: show only first 8
            container.innerHTML = skills.slice(0, 8).map(skill =>
                `<span class="skill-tag">${this.escapeHtml(skill)}</span>`
            ).join('') +
            `<span class="skill-tag skill-more" onclick="window.db.expandSkills('${containerId}', ${JSON.stringify(skills).replace(/'/g, "&#39;")})">+${skills.length - 8} more</span>`;
            container.dataset.expanded = 'false';
        } else {
            // Expand: show all
            container.innerHTML = skills.map(skill =>
                `<span class="skill-tag">${this.escapeHtml(skill)}</span>`
            ).join('') +
            `<span class="skill-tag skill-more" onclick="window.db.expandSkills('${containerId}', ${JSON.stringify(skills).replace(/'/g, "&#39;")})">Show less</span>`;
            container.dataset.expanded = 'true';
        }
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

    // Toggle generic section expansion (projects, awards)
    toggleSection(sectionId) {
        const prefix = sectionId.split('-')[0]; // e.g., "projects" or "awards"
        const shortList = document.querySelector(`.${prefix}-list[data-id="${sectionId}"]`);
        const fullList = document.querySelector(`.${prefix}-list-full[data-id="${sectionId}"]`);
        const btn = event && event.target ? event.target : null;

        if (!shortList || !fullList) return;

        if (fullList.style.display === 'none') {
            shortList.style.display = 'none';
            fullList.style.display = 'block';
            if (btn) btn.textContent = 'Show less';
        } else {
            shortList.style.display = 'block';
            fullList.style.display = 'none';
            // Extract attendee ID and section type from sectionId
            const attendeeId = sectionId.substring(prefix.length + 1);
            const attendee = this.attendees.find(a => a.id == attendeeId);
            const items = attendee?.[prefix];
            const hiddenCount = items ? items.length - 2 : 0;
            if (btn && hiddenCount) btn.textContent = `Show ${hiddenCount} more`;
        }
    }

    // Toggle about section expansion
    toggleAbout(aboutId) {
        const aboutText = document.querySelector(`.about-text[data-id="${aboutId}"]`);
        const btn = event && event.target ? event.target : null;

        if (!aboutText) return;

        if (aboutText.classList.contains('collapsed')) {
            aboutText.classList.remove('collapsed');
            if (btn) btn.textContent = 'Show less';
        } else {
            aboutText.classList.add('collapsed');
            if (btn) btn.textContent = 'Read more';
        }
    }

    // Delete individual attendee
    deleteAttendee(attendeeId) {
        const attendee = this.attendees.find(a => a.id == attendeeId);
        const name = attendee ? attendee.name : 'this profile';

        this.showDeleteModal(name, () => {
            this.attendees = this.attendees.filter(a => a.id != attendeeId);
            this.saveToLocalStorage();
            this.updateStats();
            this.renderAttendees();
            this.updateSchoolFilter();
        });
    }

    // Show custom delete confirmation modal
    showDeleteModal(name, onConfirm) {
        // Remove any existing modal
        const existing = document.querySelector('.delete-modal-overlay');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'delete-modal-overlay';
        modal.innerHTML = `
            <div class="delete-modal">
                <div class="delete-modal-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                </div>
                <h3>Delete Profile</h3>
                <p>Are you sure you want to delete <strong>${this.escapeHtml(name)}</strong>? This action cannot be undone.</p>
                <div class="delete-modal-actions">
                    <button class="delete-modal-cancel">Cancel</button>
                    <button class="delete-modal-confirm">Delete</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Focus trap and animations
        requestAnimationFrame(() => modal.classList.add('visible'));

        const closeModal = () => {
            modal.classList.remove('visible');
            setTimeout(() => modal.remove(), 200);
        };

        modal.querySelector('.delete-modal-cancel').addEventListener('click', closeModal);
        modal.querySelector('.delete-modal-confirm').addEventListener('click', () => {
            closeModal();
            onConfirm();
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    // Cloud Sync Methods
    async syncToCloud() {
        const statusDiv = document.getElementById('syncStatus');
        const syncBtn = document.getElementById('syncToCloudBtn');

        if (this.attendees.length === 0) {
            statusDiv.className = 'sync-status error';
            statusDiv.textContent = 'No attendees to sync. Add some profiles first.';
            return;
        }

        syncBtn.disabled = true;
        syncBtn.textContent = 'Syncing...';
        statusDiv.className = 'sync-status syncing';
        statusDiv.textContent = `Syncing ${this.attendees.length} profiles to cloud (this may take a few minutes)...`;

        try {
            // Sync in batches of 10 to avoid timeout
            const batchSize = 10;
            let synced = 0;
            let failed = 0;

            for (let i = 0; i < this.attendees.length; i += batchSize) {
                const batch = this.attendees.slice(i, i + batchSize);

                const response = await fetch('/api/sync-attendees', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ attendees: batch })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Sync failed');
                }

                synced += result.success;
                failed += result.failed;

                statusDiv.textContent = `Syncing... ${synced}/${this.attendees.length} profiles complete`;
            }

            statusDiv.className = 'sync-status success';
            statusDiv.textContent = `Sync complete! ${synced} profiles synced${failed > 0 ? `, ${failed} failed` : ''}.`;

        } catch (error) {
            statusDiv.className = 'sync-status error';
            statusDiv.textContent = `Sync failed: ${error.message}`;
        } finally {
            syncBtn.disabled = false;
            syncBtn.textContent = 'Sync to Cloud';
        }
    }

    async checkSyncStatus() {
        const statusDiv = document.getElementById('syncStatus');
        statusDiv.className = 'sync-status';
        statusDiv.textContent = `Local database: ${this.attendees.length} profiles. Cloud sync available.`;
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

        // For vector search, we don't need local attendees
        if (this.selectedModel !== 'vector-search' && this.attendees.length === 0) {
            statusDiv.className = 'ai-search-status error';
            statusDiv.textContent = 'No attendees in database yet';
            return;
        }

        // Show loading state with pulsating glow
        searchInput.classList.add('searching');
        statusDiv.className = 'ai-search-status searching';
        statusDiv.textContent = this.selectedModel === 'vector-search'
            ? '🔍 Searching cloud database with vector similarity...'
            : '🤔 AI is searching through profiles...';
        resultsDiv.innerHTML = '';

        try {
            // Determine API endpoint based on model
            let apiUrl;
            let requestBody;

            if (this.selectedModel === 'vector-search') {
                apiUrl = '/api/vector-search';
                requestBody = JSON.stringify({
                    query: query,
                    match_count: 20
                });
            } else {
                apiUrl = window.location.hostname === 'localhost'
                    ? 'http://localhost:8000/api/search'
                    : '/api/search';
                requestBody = JSON.stringify({
                    model: this.selectedModel,
                    query: query,
                    attendees: JSON.stringify(this.attendees, null, 2)
                });
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: requestBody
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
