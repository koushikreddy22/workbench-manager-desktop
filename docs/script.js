// Initialize Lucide Icons
lucide.createIcons();

// Configuration
const GITHUB_REPO = "koushikreddy22/workbench-manager-desktop";

// Dynamic Version Fetching
async function fetchLatestRelease() {
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
        if (!response.ok) throw new Error("Failed to fetch release");
        
        const data = await response.json();
        const version = data.tag_name;
        const publishDate = new Date(data.published_at).toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        // Find assets
        const winAsset = data.assets.find(a => a.name.toLowerCase().endsWith('.exe'));
        const linuxAsset = data.assets.find(a => a.name.toLowerCase().endsWith('.appimage'));

        // Update Windows Button
        if (winAsset) {
            const btn = document.getElementById('main-download-btn');
            const text = document.getElementById('download-text');
            if (btn) btn.href = winAsset.browser_download_url;
            if (text) text.textContent = `Download Vantage ${version} for Windows`;
        }

        // Update Linux Button
        if (linuxAsset) {
            const btn = document.getElementById('linux-download-btn');
            const text = document.getElementById('linux-download-text');
            if (btn) btn.href = linuxAsset.browser_download_url;
            if (text) text.textContent = `Download Vantage ${version} for Linux (.AppImage)`;
        }

        // Update Version Badge
        const versionText = document.getElementById('version-text');
        if (versionText) versionText.textContent = `Latest Stable: ${version} (${publishDate})`;
        
        // OS Detection & Highlighting
        autoDetectOS();

    } catch (error) {
        console.error("Error fetching latest release:", error);
    }
}

function autoDetectOS() {
    const platform = window.navigator.platform.toLowerCase();
    const winBtn = document.getElementById('main-download-btn');
    const linuxBtn = document.getElementById('linux-download-btn');

    if (platform.includes('win')) {
        if (winBtn) winBtn.classList.add('highlight');
    } else if (platform.includes('linux')) {
        if (linuxBtn) linuxBtn.classList.add('highlight', 'btn-primary');
        if (linuxBtn) linuxBtn.classList.remove('btn-glass');
    }
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Dynamic Mockup UI Animation (Simulates app activity)
const cards = document.querySelectorAll('.card-mock');
const sidebars = document.querySelectorAll('.sidebar-item');

function animateMockup() {
    // Randomly highlight cards
    setInterval(() => {
        cards.forEach(card => card.classList.remove('glow-card'));
        const randomCard = cards[Math.floor(Math.random() * cards.length)];
        if (randomCard) randomCard.classList.add('glow-card');
    }, 2000);

    // Randomly switch sidebar active state
    setInterval(() => {
        sidebars.forEach(item => item.classList.remove('active'));
        const randomSidebar = sidebars[Math.floor(Math.random() * sidebars.length)];
        if (randomSidebar) randomSidebar.classList.add('active');
    }, 3500);
}

// Intersect Observer for fade-in animations
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.classList.add('fade-in-up');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card').forEach(el => {
    el.style.opacity = '0'; // Initial state before intersection
    observer.observe(el);
});

// Initialize
fetchLatestRelease();
animateMockup();

