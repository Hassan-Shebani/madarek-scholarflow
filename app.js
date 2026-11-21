// ==========================================
// MADARKS SCHOLARFLOW - SMART QUERY v11
// Main Application JavaScript (ES Module)
// Author: د. حسن الشيباني
// ==========================================

/**
 * Configuration for search engines
 * Placeholder configurations - add real API keys for production
 */
export const ENGINE_CONFIG = {
    openalex: {
        name: "OpenAlex",
        baseUrl: "https://api.openalex.org/search",
        enabled: true,
        // apiKey: "YOUR_OPEN_ALEX_KEY", // Add your key here
    },
    crossref: {
        name: "Crossref",
        baseUrl: "https://api.crossref.org/works",
        enabled: true,
        // apiKey: "YOUR_CROSSREF_KEY", // Add your key here
    },
    core: {
        name: "CORE",
        baseUrl: "https://api.core.ac.uk/openalex/search/works",
        enabled: true,
        // apiKey: "YOUR_CORE_KEY", // Add your key here
    },
    google: {
        name: "Google Scholar",
        baseUrl: "",
        enabled: false, // Requires different approach
    }
};

/**
 * Application State
 */
export let appState = {
    currentSection: "explore",
    currentEngine: "all",
    searchQuery: "",
    searchResults: [],
    savedPapers: JSON.parse(localStorage.getItem("scholarflow_papers") || "[]"),
    searchHistory: JSON.parse(localStorage.getItem("scholarflow_history") || "[]"),
    theme: localStorage.getItem("scholarflow_theme") || "default"
};

/**
 * Theme System
 */
export function initTheme() {
    // Apply saved theme
    document.documentElement.dataset.theme = appState.theme;
    updateThemeButton();

    // Theme toggle handler
    const themeToggle = document.querySelector(".theme-toggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", toggleTheme);
    }
}

function toggleTheme() {
    const themes = ["default", "v5", "v6", "v7", "v8", "v10", "v11"];
    const currentIndex = themes.indexOf(appState.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];

    appState.theme = nextTheme;
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("scholarflow_theme", nextTheme);
    updateThemeButton();
}

function updateThemeButton() {
    const themeToggle = document.querySelector(".theme-toggle");
    if (!themeToggle) return;

    const theme = appState.theme;
    const icons = {
        default: "fa-sun",
        v5: "fa-cloud-sun",
        v6: "fa-brightness-high",
        v7: "fa-moon",
        v8: "fa-solar",
        v10: "fa-star",
        v11: "fa-project-diagram"
    };

    themeToggle.innerHTML = `<i class="fa-solid ${icons[theme]}" aria-label="تغيير مظهر الثيم إلى ${theme}"></i>`;
}

/**
 * Navigation Between Sections
 */
export function initNavigation() {
    const navButtons = document.querySelectorAll(".nav-btn");

    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const section = btn.dataset.section;

            // Update active state
            navButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // Hide all sections, show target
            document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
            document.querySelector(`#${section}`).classList.add("active");

            // Update state
            appState.currentSection = section;

            // Initialize section-specific functionality
            if (section === "explore") {
                setupSearchFocus();
            } else if (section === "screen") {
                updatePrismaFlow();
            } else if (section === "matrix") {
                loadMatrixView();
            } else if (section === "citations") {
                initCitationTools();
            } else if (section === "reader") {
                initReaderTools();
            } else if (section === "synth") {
                initSynthesisTools();
            } else if (section === "refs") {
                initRefTools();
            }
        });
    });
}

/**
 * Search Functionality with Debounce
 */
export function initSearch() {
    const queryInput = document.getElementById("query");
    const searchBtn = document.querySelector(".btn-hero");

    if (!queryInput || !searchBtn) return;

    // Debounce function
    const debounce = (fn, delay) => {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    };

    // Perform search function
    const performSearch = debounce(async () => {
        const query = queryInput.value.trim();
        if (!query) return;

        // Add to history
        appState.searchHistory = appState.searchHistory.filter(h => h !== query);
        appState.searchHistory.unshift(query);
        if (appState.searchHistory.length > 10) {
            appState.searchHistory = appState.searchHistory.slice(0, 10);
        }
        localStorage.setItem("scholarflow_history", JSON.stringify(appState.searchHistory));

        // Update UI
        showSearchLoading(true);
        document.getElementById("matrixResults").innerHTML = "";
        document.getElementById("readerResults").innerHTML = "";

        // Perform search based on selected engine
        try {
            const results = await performSearchEngines(query);
            appState.searchResults = results;
            displaySearchResults(results);
            showSearchLoading(false);
        } catch (error) {
            console.error("Search error:", error);
            showSearchError("حدث خطأ في البحث، حاول مرة أخرى");
            showSearchLoading(false);
        }
    }, 300); // 300ms debounce

    // Event listeners
    queryInput.addEventListener("input", performSearch);
    searchBtn.addEventListener("click", performSearch);

    // Allow Enter key
    queryInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            performSearch();
        }
    });
}

async function performSearchEngines(query) {
    const engine = document.getElementById("engineSelector")?.value || "all";
    const results = [];

    // Search with selected engine
    if (engine === "all" || engine === "openalex") {
        const openalexResults = await searchOpenAlex(query);
        results.push(...openalexResults.map(r => ({ ...r, source: "OpenAlex" })));
    }

    if (engine === "all" || engine === "crossref") {
        const crossrefResults = await searchCrossref(query);
        results.push(...crossrefResults.map(r => ({ ...r, source: "Crossref" })));
    }

    if (engine === "all" || engine === "core") {
        const coreResults = await searchCore(query);
        results.push(...coreResults.map(r => ({ ...r, source: "CORE" })));
    }

    // Remove duplicates based on DOI
    const seen = new Set();
    return results.filter(r => {
        if (!r.doi && !r.id) return true;
        const key = r.doi || r.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

async function searchOpenAlex(query) {
    if (!ENGINE_CONFIG.openalex.enabled) return [];

    try {
        const url = `${ENGINE_CONFIG.openalex.baseUrl}?query=${encodeURIComponent(query)}&per=10`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) throw new Error("OpenAlex API error");

        const data = await response.json();
        return (data.results || []).map(paper => ({
            id: paper.id,
            doi: paper.doi || "",
            title: paper.title || "عنوان غير متوفر",
            authors: (paper.authors || []).map(a => a.name || "مؤلف مجهول").join(", "),
            year: paper.year || null,
            venue: paper.host_venue_name || "",
            abstract: paper.abstract || "",
            url: paper.url || `#`
        }));
    } catch (error) {
        console.error("OpenAlex search error:", error);
        return [];
    }
}

async function searchCrossref(query) {
    if (!ENGINE_CONFIG.crossref.enabled) return [];

    try {
        const url = `${ENGINE_CONFIG.crossref.baseUrl}?query=${encodeURIComponent(query)}&rows=10`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) throw new Error("Crossref API error");

        const data = await response.json();
        return (data.message?.["has part"] || []).map(paper => ({
            id: paper.DOI || "",
            doi: paper.DOI || "",
            title: paper.title?.[0] || "عنوان غير متوفر",
            authors: (paper.author || []).map(a => a.name || "مؤلف").join(", "),
            year: paper["published-print"]?.date-parts?.[0]?.[0] || null,
            venue: paper.journal || "",
            abstract: "",
            url: `https://doi.org/${paper.DOI}`
        }));
    } catch (error) {
        console.error("Crossref search error:", error);
        return [];
    }
}

async function searchCore(query) {
    if (!ENGINE_CONFIG.core.enabled) return [];

    try {
        const url = `${ENGINE_CONFIG.core.baseUrl}?query=${encodeURIComponent(query)}&limit=10`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) throw new Error("CORE API error");

        const data = await response.json();
        return (data.results || []).map(paper => ({
            id: paper.id || "",
            doi: paper.doi || "",
            title: paper.title || "عنوان غير متوفر",
            authors: (paper.author || []).map(a => a.name || "مؤلف").join(", "),
            year: paper.year || null,
            venue: paper.venue || "",
            abstract: paper.abstract || "",
            url: paper.url || `#`
        }));
    } catch (error) {
        console.error("CORE search error:", error);
        return [];
    }
}

function displaySearchResults(results) {
    const container = document.getElementById("matrixResults");
    if (!container) return;

    if (results.length === 0) {
        container.innerHTML = `<p class="m">لا توجد نتائج مطابقة. جرب كلمات مفتاحية مختلفة.</p>`;
        return;
    }

    container.innerHTML = `
        <div class="results-summary">
            <span>تم العثور على ${results.length} نتيجة</span>
        </div>
        <div class="results-list">
            ${results.slice(0, 10).map((paper, i) => `
                <div class="result-item" data-index="${i}" tabindex="0" role="button" aria-label="دراسة ${i + 1}: ${paper.title}">
                    <div class="result-header">
                        <h4 class="result-title" title="${paper.title}">${truncateText(paper.title, 60)}</h4>
                        <div class="result-meta">
                            <span>${paper.year || "لا تاريخ"} • ${paper.source}</span>
                            <span>${paper.authors || "مؤلفون غير معروفون"}</span>
                        </div>
                    </div>
                    <div class="result-desc">
                        ${paper.abstract ? `<p>${truncateText(paper.abstract, 120)}</p>` : ""}
                    </div>
                    <div class="result-actions">
                        <button class="btn btn-small btn-outline" onclick="savePaper(${i})">حفظ</button>
                        <button class="btn btn-small btn-outline" onclick="exportCitation(${i})">تنسيق</button>
                    </div>
                </div>
            `).join("")}
        </div>
    `;

    // Add click handlers to result items
    container.querySelectorAll(".result-item").forEach((item, i) => {
        item.addEventListener("click", () => selectPaper(i));
        item.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                selectPaper(i);
            }
        });
    });
}

function truncateText(text, maxLength) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
}

function showSearchLoading(isLoading) {
    const loadingSpinner = document.getElementById("searchLoading");
    if (loadingSpinner) {
        loadingSpinner.style.display = isLoading ? "block" : "none";
    }
}

function showSearchError(message) {
    // Show error toast/alert
    alert(message);
}

/**
 * Paper Management
 */
export function savePaper(index) {
    if (index < 0 || index >= appState.searchResults.length) return;

    const paper = appState.searchResults[index];
    // Check if already saved
    const alreadySaved = appState.savedPapers.some(p => p.doi === paper.doi);

    if (!alreadySaved) {
        const paperToSave = {
            id: crypto.randomUUID(),
            doi: paper.doi,
            title: paper.title,
            authors: paper.authors,
            year: paper.year,
            venue: paper.venue,
            abstract: paper.abstract,
            source: paper.source,
            addedDate: new Date().toISOString()
        };

        appState.savedPapers.unshift(paperToSave);
        localStorage.setItem("scholarflow_papers", JSON.stringify(appState.savedPapers));

        // Update UI
        updateSavedPapersCount();
        showToast("تمت إضافة الدراسة للمكتبة");

        // Refresh matrix view if in matrix section
        if (appState.currentSection === "matrix") {
            loadMatrixView();
        }
    } else {
        showToast("هذه الدراسة موجودة بالفعل في المكتبة");
    }
}

function updateSavedPapersCount() {
    const countBadge = document.getElementById("savedPapersCount");
    if (countBadge) {
        countBadge.textContent = appState.savedPapers.length;
    }
}

function exportCitation(index) {
    if (index < 0 || index >= appState.searchResults.length) return;

    const paper = appState.searchResults[index];
    const format = document.getElementById("exportFormat")?.value || "apa";

    let citation;
    switch (format) {
        case "apa":
            citation = formatAPA(paper);
            break;
        case "mla":
            citation = formatMLA(paper);
            break;
        case "ieee":
            citation = formatIEEE(paper);
            break;
        case "bibtex":
            citation = formatBibTex(paper);
            break;
        default:
            citation = formatAPA(paper);
    }

    // Show in preview
    const preview = document.getElementById("formatPreview");
    if (preview) {
        preview.textContent = citation;
    }
}

function formatAPA(paper) {
    const authors = paper.authors ? paper.authors.split(", ").slice(0, 2) : ["مؤلف"];
    const year = paper.year || "n.d.";
    const title = paper.title ? `"${paper.title}"` : "";
    const journal = paper.venue ? ` ${paper.venue}` : "";
    return `${authors.join(" و")} (${year}). ${title}. ${journal}.`.trim();
}

function formatMLA(paper) {
    const title = paper.title ? `"${paper.title}"` : "";
    const container = paper.venue ? `${paper.venue}` : "";
    return `${title}. ${container}.`;
}

function formatIEEE(paper) {
    const authors = paper.authors ? paper.authors.split(", ").length : 1;
    const year = paper.year || "n.d.";
    return `[${authors}] ${year} "${paper.title}".`;
}

function formatBibTex(paper) {
    const entryType = "@article";
    const id = paper.doi ? `"${paper.doi}"` : `"${crypto.randomUUID()}"`;
    const authors = paper.authors ? paper.authors : "Author";
    const year = paper.year || "n.d.";
    const title = paper.title ? `title = "{${paper.title}}"` : "";
    const journal = paper.venue ? `journal = "{${paper.venue}}"` : "";

    return `${entryType}{${id}},\n  author = {${authors}},\n  year = {${year}},\n  ${title},\n  ${journal}\n}`;
}

/**
 * PRISMA Flow Visualization
 */
function updatePrismaFlow() {
    const container = document.getElementById("prismaFlow");
    if (!container) return;

    // Count papers at each stage
    const totalPapers = appState.savedPapers.length;

    container.innerHTML = `
        <div class="prisma-step">
            <div class="step-label">التحديد</div>
            <div class="step-number">${totalPapers}</div>
        </div>
        <div class="prisma-step">
            <div class="step-label">الفحص</div>
            <div class="step-number">—</div>
        </div>
        <div class="prisma-step">
            <div class="step-label">التأهيل</div>
            <div class="step-number">—</div>
        </div>
        <div class="prisma-step">
            <div class="step-label">الشمول</div>
            <div class="step-number">—</div>
        </div>
    `;
}

/**
 * Matrix View
 */
export function loadMatrixView() {
    const container = document.getElementById("matrixResults");
    if (!container) return;

    if (appState.savedPapers.length === 0) {
        container.innerHTML = `<p class="m">لا توجد دراسات في المكتبة. ابحث وأضف دراسات أولاً.</p>`;
        return;
    }

    container.innerHTML = `
        <div class="matrix-header">
            <select id="methodFilterMatrix">
                <option value="">جميع المنهجيات</option>
                <option value="article">مقالات</option>
                <option value="thesis">رسائل</option>
                <option value="book">كتب</option>
            </select>
            <span class="m">إجمالي الدراسات: ${appState.savedPapers.length}</span>
        </div>
        <div class="matrix-table">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>عنوان الدراسة</th>
                        <th>الكتاب</th>
                        <th>السنة</th>
                        <th>المنهجية</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${appState.savedPapers.map((paper, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td title="${paper.title}">${truncateText(paper.title, 50)}</td>
                            <td>${paper.venue || "—"}</td>
                            <td>${paper.year || "—"}</td>
                            <td>${paper.type || "مقال"}</td>
                            <td>
                                <button class="btn btn-small btn-outline" onclick="viewPaperDetails(${i})">عرض</button>
                                <button class="btn btn-small btn-outline" onclick="exportPaperCitation(${i})">تنسيق</button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Initialize section-specific tools
 */
function initCitationTools() {
    // Initialize citation export functionality
    const formatSelect = document.getElementById("exportFormat");
    if (formatSelect) {
        formatSelect.addEventListener("change", () => {
            const index = 0; // Placeholder - would need active paper
            exportCitation(index);
        });
    }
}

function initReaderTools() {
    // Initialize reader/critical appraisal tools
    const criteria = document.querySelectorAll('.reader-criteria input');
    criteria.forEach(cb => {
        cb.addEventListener("change", () => {
            // Filter papers based on criteria
            console.log("Criterion changed:", cb.id);
        });
    });
}

function initSynthesisTools() {
    // Initialize synthesis/tolling tools
    const synthBtn = document.querySelector('.synthesis-tools .btn:first-child');
    if (synthBtn) {
        synthBtn.addEventListener("click", generateSynthesis);
    }
}

function generateSynthesis() {
    if (appState.savedPapers.length < 3) {
        alert("يجب أن تكون لديك على الأقل 3 دراسات لإجراء синтеز");
        return;
    }

    // Simple synthesis - just list research questions
    const researchQuestions = appState.savedPapers
        .filter(p => p.abstract)
        .map(p => ({
            title: p.title,
            question: extractResearchQuestion(p.abstract)
        }));

    const output = document.getElementById("synthesisOutput");
    if (output) {
        output.innerHTML = `
            <h4>نتائج синтез</h4>
            <p>تم تحليل ${researchQuestions.length} دراسة</p>
            <ul>
                ${researchQuestions.map(rq => `<li><strong>${rq.title}</strong>: ${rq.question}</li>`).join("")}
            </ul>
        `;
    }
}

function extractResearchQuestion(abstract) {
    // Simple heuristic to extract research question
    const sentences = abstract.split(". ").slice(0, 2);
    return sentences.length > 0 ? sentences[0] : "سؤال البحث";
}

function exportSynthesis() {
    const output = document.getElementById("synthesisOutput");
    if (output && output.textContent.includes("نتائج")) {
        // Create download link
        const blob = new Blob([output.innerHTML], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "synthesis-report.html";
        a.click();
        URL.revokeObjectURL(url);
    }
}

/**
 * Reference Management
 */
function initRefTools() {
    const formatSelect = document.getElementById("exportFormat");
    if (formatSelect) {
        formatSelect.addEventListener("change", updateFormatPreview);
    }
    updateFormatPreview();
}

function updateFormatPreview() {
    const format = document.getElementById("exportFormat")?.value || "apa";
    const preview = document.getElementById("formatPreview");

    if (!preview) return;

    // Use first saved paper for preview
    if (appState.savedPapers.length > 0) {
        const paper = appState.savedPapers[0];
        let citation;

        switch (format) {
            case "apa":
                citation = formatAPA(paper);
                break;
            case "mla":
                citation = formatMLA(paper);
                break;
            case "ieee":
                citation = formatIEEE(paper);
                break;
            case "bibtex":
                citation = formatBibTex(paper);
                break;
        }

        preview.textContent = citation;
    }
}

function exportSelected() {
    const format = document.getElementById("exportFormat")?.value || "apa";
    // Get selected papers (placeholder - would need checkbox implementation)
    const papers = appState.savedPapers.slice(0, 3); // Just first 3 as example

    let output = "";
    papers.forEach(paper => {
        switch (format) {
            case "apa":
                output += formatAPA(paper) + "\n\n";
                break;
            case "mla":
                output += formatMLA(paper) + "\n\n";
                break;
            case "ieee":
                output += formatIEEE(paper) + "\n\n";
                break;
            case "bibtex":
                output += formatBibTex(paper) + "\n\n";
                break;
        }
    });

    // Create download
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "references." + (format === "bibtex" ? "bib" : "txt");
    a.click();
    URL.revokeObjectURL(url);
}

function exportAll() {
    const format = document.getElementById("exportFormat")?.value || "apa";
    let output = "";

    appState.savedPapers.forEach(paper => {
        switch (format) {
            case "apa":
                output += formatAPA(paper) + "\n\n";
                break;
            case "mla":
                output += formatMLA(paper) + "\n\n";
                break;
            case "ieee":
                output += formatIEEE(paper) + "\n\n";
                break;
            case "bibtex":
                output += formatBibTex(paper) + "\n\n";
                break;
        }
    });

    // Create download
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `references_all.${format === "bibtex" ? "bib" : "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Toast/Notification System
 */
function showToast(message, type = "success") {
    // Create toast element
    const toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) {
        const container = document.createElement("div");
        container.id = "toastContainer";
        container.style.position = "fixed";
        container.style.bottom = "20px";
        container.style.right = "20px";
        container.style.zIndex = "9999";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close" aria-label="إغلاق التنبيه">&times;</button>
    `;

    // Add styles inline for simplicity
    toast.style.position = "relative";
    toast.style.padding = "1rem 1.5rem";
    toast.style.background = type === "success" ? "var(--green)" : "var(--navy)";
    toast.style.color = "white";
    toast.style.borderRadius = "4px";
    toast.style.marginBottom = "0.5rem";
    toast.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
    toast.style.maxWidth = "300px";
    toast.style.animation = "slideIn 0.3s ease";

    // Close button
    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "0.2rem";
    closeBtn.style.right = "0.5rem";
    closeBtn.style.background = "transparent";
    closeBtn.style.border = "none";
    closeBtn.style.color = "rgba(255,255,255,0.7)";
    closeBtn.style.fontSize = "1.2rem";
    closeBtn.style.cursor = "pointer";
    closeBtn.addEventListener("click", () => toast.remove());

    // Add to container
    const existingContainer = document.getElementById("toastContainer");
    if (existingContainer.children.length >= 3) {
        existingContainer.removeChild(existingContainer.firstChild);
    }
    existingContainer.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = "slideOut 0.3s ease";
            setTimeout(() => toast.remove(), 300);
        }
    }, 3000);
}

// Add CSS for toasts
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-10px); }
    }
    .toast { animation: slideIn 0.3s ease; }
`;
document.head.appendChild(style);

/**
 * Initialization
 */
export function initApp() {
    // Initialize all components
    initTheme();
    initNavigation();
    initSearch();
    updateSavedPapersCount();

    // Set initial section
    document.querySelectorAll(".section")[0]?.classList.add("active");

    // Set up keyboard shortcuts
    document.addEventListener("keydown", (e) => {
        if (e.key === "/") {
            e.preventDefault();
            if (appState.currentSection !== "explore") {
                // Navigate to explore
                const exploreBtn = document.querySelector(`[data-section="explore"]`);
                if (exploreBtn) exploreBtn.click();
            }
        }
    });
}

// Start the application when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}

// Export for use in HTML onclick handlers
window.savePaper = savePaper;
window.exportCitation = exportCitation;
window.exportSelected = exportSelected;
window.exportAll = exportAll;
window.generateSynthesis = generateSynthesis;
window.updatePrismaFlow = updatePrismaFlow;
window.loadMatrixView = loadMatrixView;
window.viewPaperDetails = viewPaperDetails;
window.exportPaperCitation = exportPaperCitation;

// Helper functions for HTML onclick
function viewPaperDetails(index) {
    if (index < 0 || index >= appState.savedPapers.length) return;
    const paper = appState.savedPapers[index];
    // Navigate to reader section or show details
    alert(`عنوان الورقة: ${paper.title}\nالكتاب: ${paper.venue}\nالسنة: ${paper.year}\n\nالملخص: ${paper.abstract?.substring(0, 200) || "لا يوجد ملخص"}`);
}

function exportPaperCitation(index) {
    if (index < 0 || index >= appState.savedPapers.length) return;
    const paper = appState.savedPapers[index];
    const format = document.getElementById("exportFormat")?.value || "apa";
    let citation;

    switch (format) {
        case "apa":
            citation = formatAPA(paper);
            break;
        case "mla":
            citation = formatMLA(paper);
            break;
        case "ieee":
            citation = formatIEEE(paper);
            break;
        case "bibtex":
            citation = formatBibTex(paper);
            break;
    }

    if (citation) {
        prompt("نسخة الاستشهاد:", citation);
    }
}