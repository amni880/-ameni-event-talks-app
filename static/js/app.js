document.addEventListener('DOMContentLoaded', () => {
    // Application State
    let rawEntries = [];
    let parsedNotes = [];
    let selectedNotes = new Set();
    let currentFilter = 'all';
    let searchQuery = '';
    
    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const timelineContainer = document.getElementById('timeline-container');
    const floatingBar = document.getElementById('floating-bar');
    const selectedCountSpan = document.getElementById('selected-count');
    const tweetSelectedBtn = document.getElementById('tweet-selected-btn');
    const deselectAllBtn = document.getElementById('deselect-all-btn');
    
    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const modalClose = document.getElementById('modal-close');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const sendTweetBtn = document.getElementById('send-tweet-btn');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');

    // Initialize the app
    function init() {
        // Event Listeners
        refreshBtn.addEventListener('click', fetchReleaseNotes);
        searchInput.addEventListener('input', handleSearch);
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter = e.target.dataset.filter;
                renderNotes();
            });
        });

        // Floating action bar events
        tweetSelectedBtn.addEventListener('click', shareSelectedNotes);
        deselectAllBtn.addEventListener('click', deselectAll);

        // Modal events
        modalClose.addEventListener('click', closeTweetModal);
        cancelTweetBtn.addEventListener('click', closeTweetModal);
        tweetTextarea.addEventListener('input', updateCharCount);
        sendTweetBtn.addEventListener('click', publishTweet);

        // Close modal on click outside window
        tweetModal.addEventListener('click', (e) => {
            if (e.target === tweetModal) {
                closeTweetModal();
            }
        });

        // Load data on start
        fetchReleaseNotes();
    }

    // Fetch feed from Flask proxy
    async function fetchReleaseNotes() {
        setLoading(true);
        timelineContainer.innerHTML = '';
        deselectAll();
        
        try {
            const response = await fetch('/api/release-notes');
            const data = await response.json();
            
            if (data.success) {
                rawEntries = data.entries;
                processReleaseNotes(rawEntries);
                renderNotes();
            } else {
                renderError(data.error || 'Failed to fetch release notes.');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            renderError('Connection lost. Please check if your server is running.');
        } finally {
            setLoading(false);
        }
    }

    function setLoading(isLoading) {
        if (isLoading) {
            refreshBtn.classList.add('loading');
            refreshBtn.disabled = true;
            timelineContainer.innerHTML = `
                <div class="loader-container fade-in">
                    <div class="spinner"></div>
                    <div class="loader-text">FETCHING BIGQUERY RELEASE NOTES...</div>
                </div>
            `;
        } else {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }
    }

    // Process raw RSS entries into sub-items based on heading tags
    function processReleaseNotes(entries) {
        parsedNotes = [];
        
        entries.forEach((entry, entryIndex) => {
            const dateStr = entry.title; // e.g. "July 01, 2026"
            const entryLink = entry.link;
            const entryId = entry.id;
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(entry.summary, 'text/html');
            const nodes = doc.body.childNodes;
            
            let currentItem = null;
            let noteIndex = 0;

            const pushCurrentItem = () => {
                if (currentItem) {
                    currentItem.id = `${entryId}-${noteIndex}`;
                    currentItem.date = dateStr;
                    currentItem.link = entryLink;
                    // Auto detect type class
                    currentItem.typeClass = currentItem.type.toLowerCase();
                    if (!['feature', 'change', 'fix'].includes(currentItem.typeClass)) {
                        currentItem.typeClass = 'general';
                    }
                    parsedNotes.push(currentItem);
                    noteIndex++;
                }
            };

            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const tag = node.tagName;
                    
                    if (['H1', 'H2', 'H3', 'H4', 'H5'].includes(tag)) {
                        pushCurrentItem();
                        
                        currentItem = {
                            type: node.textContent.trim(),
                            contentHtml: ''
                        };
                    } else {
                        if (!currentItem) {
                            currentItem = {
                                type: 'General',
                                contentHtml: ''
                            };
                        }
                        // Modify link anchors inside HTML to open in new tab
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = node.outerHTML;
                        const links = tempDiv.querySelectorAll('a');
                        links.forEach(a => a.setAttribute('target', '_blank'));
                        currentItem.contentHtml += tempDiv.innerHTML;
                    }
                } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
                    if (!currentItem) {
                        currentItem = {
                            type: 'General',
                            contentHtml: ''
                        };
                    }
                    currentItem.contentHtml += node.textContent;
                }
            }
            // Push the last item
            pushCurrentItem();
        });
    }

    // Filter, group, and render release notes
    function renderNotes() {
        let filtered = parsedNotes.filter(note => {
            // Type filter
            if (currentFilter !== 'all') {
                if (currentFilter === 'features' && note.typeClass !== 'feature') return false;
                if (currentFilter === 'changes' && note.typeClass !== 'change') return false;
                if (currentFilter === 'fixes' && note.typeClass !== 'fix') return false;
            }
            
            // Search filter
            if (searchQuery) {
                const text = extractTextFromHtml(note.contentHtml).toLowerCase();
                const type = note.type.toLowerCase();
                const date = note.date.toLowerCase();
                const query = searchQuery.toLowerCase();
                return text.includes(query) || type.includes(query) || date.includes(query);
            }
            
            return true;
        });

        if (filtered.length === 0) {
            timelineContainer.innerHTML = `
                <div class="empty-state fade-in">
                    <i class="fas fa-search-minus"></i>
                    <h3>No release notes match your criteria</h3>
                    <p>Try modifying your search queries or category filters.</p>
                </div>
            `;
            return;
        }

        // Group by date
        const grouped = {};
        filtered.forEach(note => {
            if (!grouped[note.date]) {
                grouped[note.date] = [];
            }
            grouped[note.date].push(note);
        });

        // Generate HTML
        let html = '<div class="timeline">';
        
        Object.keys(grouped).forEach(date => {
            html += `
                <div class="date-group fade-in">
                    <div class="date-header">
                        <div class="date-node"></div>
                        <div class="date-text">${date}</div>
                    </div>
                    <div class="date-content">
            `;
            
            grouped[date].forEach(note => {
                const isSelected = selectedNotes.has(note.id);
                html += `
                    <div class="note-card ${isSelected ? 'selected' : ''}" data-id="${note.id}">
                        <div class="card-header">
                            <div class="card-header-left">
                                <div class="card-checkbox">
                                    <i class="fas fa-check"></i>
                                </div>
                                <span class="badge badge-${note.typeClass}">${note.type}</span>
                            </div>
                        </div>
                        <div class="card-content">
                            ${note.contentHtml}
                        </div>
                        <div class="card-actions">
                            <button class="card-action-btn copy-btn" data-id="${note.id}">
                                <i class="far fa-copy"></i> Copy Text
                            </button>
                            <button class="card-action-btn tweet-btn" data-id="${note.id}">
                                <i class="fab fa-x-twitter"></i> Tweet This
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        timelineContainer.innerHTML = html;

        // Attach listeners to cards
        document.querySelectorAll('.note-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Avoid triggers when clicking links or buttons inside cards
                if (e.target.tagName === 'A' || e.target.closest('.card-action-btn')) {
                    return;
                }
                const noteId = card.dataset.id;
                toggleSelectNote(noteId);
            });
        });

        // Attach listeners to action buttons
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const noteId = btn.dataset.id;
                const note = parsedNotes.find(n => n.id === noteId);
                if (note) {
                    const text = extractTextFromHtml(note.contentHtml);
                    copyToClipboard(text, btn);
                }
            });
        });

        document.querySelectorAll('.tweet-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const noteId = btn.dataset.id;
                const note = parsedNotes.find(n => n.id === noteId);
                if (note) {
                    openTweetModal([note]);
                }
            });
        });
    }

    // Toggle selection
    function toggleSelectNote(id) {
        if (selectedNotes.has(id)) {
            selectedNotes.delete(id);
        } else {
            selectedNotes.add(id);
        }
        
        // Update DOM visually without full render
        const card = document.querySelector(`.note-card[data-id="${id}"]`);
        if (card) {
            card.classList.toggle('selected');
        }
        
        updateFloatingBar();
    }

    function deselectAll() {
        selectedNotes.clear();
        document.querySelectorAll('.note-card').forEach(c => c.classList.remove('selected'));
        updateFloatingBar();
    }

    function updateFloatingBar() {
        const count = selectedNotes.size;
        selectedCountSpan.textContent = count;
        
        if (count > 0) {
            floatingBar.classList.add('show');
        } else {
            floatingBar.classList.remove('show');
        }
    }

    function shareSelectedNotes() {
        const notesToShare = parsedNotes.filter(n => selectedNotes.has(n.id));
        if (notesToShare.length > 0) {
            openTweetModal(notesToShare);
        }
    }

    // Compose Tweet Drafting logic
    function openTweetModal(notes) {
        let draft = '';
        if (notes.length === 1) {
            const note = notes[0];
            const cleanText = extractTextFromHtml(note.contentHtml)
                .replace(/\s+/g, ' ')
                .trim();
            
            const prefix = `📢 BigQuery [${note.type}] (${note.date}):\n`;
            const suffix = `\n\nDetails: ${note.link} #GCP #BigQuery`;
            
            const availableChar = 280 - prefix.length - suffix.length;
            let body = cleanText;
            if (body.length > availableChar) {
                body = body.substring(0, availableChar - 3) + '...';
            }
            
            draft = `${prefix}${body}${suffix}`;
        } else {
            // Multi updates
            const itemsText = notes.map(n => `• [${n.type}] ${extractTextFromHtml(n.contentHtml).replace(/\s+/g, ' ').substring(0, 50)}...`).join('\n');
            const prefix = `📢 Multiple BigQuery Updates:\n`;
            const suffix = `\n\nRead all: https://cloud.google.com/bigquery/docs/release-notes #GCP`;
            
            draft = `${prefix}${itemsText}${suffix}`;
            if (draft.length > 280) {
                draft = draft.substring(0, 277) + '...';
            }
        }

        tweetTextarea.value = draft;
        updateCharCount();
        tweetModal.classList.add('show');
    }

    function closeTweetModal() {
        tweetModal.classList.remove('show');
    }

    function updateCharCount() {
        const len = tweetTextarea.value.length;
        charCounter.textContent = `${len} / 280`;
        
        charCounter.className = 'character-counter';
        if (len > 250 && len <= 280) {
            charCounter.classList.add('warning');
            sendTweetBtn.disabled = false;
        } else if (len > 280) {
            charCounter.classList.add('danger');
            sendTweetBtn.disabled = true;
        } else {
            sendTweetBtn.disabled = false;
        }
    }

    function publishTweet() {
        const tweetText = tweetTextarea.value;
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterIntentUrl, '_blank', 'width=550,height=420');
        closeTweetModal();
    }

    // Helper functions
    function handleSearch(e) {
        searchQuery = e.target.value;
        renderNotes();
    }

    function extractTextFromHtml(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
    }

    function renderError(message) {
        timelineContainer.innerHTML = `
            <div class="empty-state fade-in">
                <i class="fas fa-exclamation-triangle" style="color: var(--badge-fix)"></i>
                <h3>An error occurred</h3>
                <p>${message}</p>
                <button id="retry-btn" class="btn btn-secondary" style="margin-top: 1rem;">
                    <i class="fas fa-redo"></i> Retry Fetch
                </button>
            </div>
        `;
        document.getElementById('retry-btn')?.addEventListener('click', fetchReleaseNotes);
    }

    async function copyToClipboard(text, buttonElement) {
        try {
            await navigator.clipboard.writeText(text);
            const originalHtml = buttonElement.innerHTML;
            buttonElement.innerHTML = `<i class="fas fa-check"></i> Copied!`;
            buttonElement.style.color = 'var(--badge-feature)';
            setTimeout(() => {
                buttonElement.innerHTML = originalHtml;
                buttonElement.style.color = '';
            }, 2000);
        } catch (err) {
            console.error('Could not copy text: ', err);
        }
    }

    // Launch
    init();
});
