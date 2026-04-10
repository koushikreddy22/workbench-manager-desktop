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

        // Find Windows executable in assets
        const windowsAsset = data.assets.find(asset => 
            asset.name.toLowerCase().endsWith('.exe')
        );

        if (windowsAsset) {
            const downloadUrl = windowsAsset.browser_download_url;
            
            // Update buttons
            const mainBtn = document.getElementById('main-download-btn');
            const navBtn = document.getElementById('nav-download-btn');
            const downloadText = document.getElementById('download-text');
            const versionText = document.getElementById('version-text');

            if (mainBtn) mainBtn.href = downloadUrl;
            if (navBtn) navBtn.href = downloadUrl;
            if (downloadText) downloadText.textContent = `Download Vantage ${version}`;
            if (versionText) versionText.textContent = `Latest Stable: ${version} (${publishDate})`;
            
            console.log(`Updated to latest version: ${version}`);
        }
    } catch (error) {
        console.error("Error fetching latest release:", error);
        // Fallback behavior: keep the static links defined in HTML
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

