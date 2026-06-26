/**
 * BreezeGo Premium Product Board JS
 * Controls Notion/Linear style smooth scrolling and ScrollSpy active link updates in TOC side nav.
 */
(function() {

    const scrollContainer = document.getElementById('product-scroll-container');
    const tocLinks = document.querySelectorAll('#product-sidebar-toc .toc-link');
    const sections = document.querySelectorAll('.spec-section');

    if (!scrollContainer || tocLinks.length === 0 || sections.length === 0) return;

    // 1. SMOOTH SCROLLING FOR SIDEBAR TO INDEX LINK CLICK
    tocLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSec = document.querySelector(targetId);
            
            if (targetSec) {
                // Remove active classes from all links
                tocLinks.forEach(l => l.classList.remove('active'));
                // Add active to current click
                link.classList.add('active');

                // Compute offsets
                const scrollOffset = targetSec.offsetTop - scrollContainer.offsetTop - 10;
                scrollContainer.scrollTo({
                    top: scrollOffset,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 2. SCROLLSPY CONTROLLER (High performance offset checking)
    let isScrolling = false;

    scrollContainer.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                updateActiveLinkOnScroll();
                isScrolling = false;
            });
            isScrolling = true;
        }
    });

    const updateActiveLinkOnScroll = () => {
        const containerTop = scrollContainer.scrollTop;
        const containerHeight = scrollContainer.clientHeight;
        const scrollHeight = scrollContainer.scrollHeight;

        // Special case: check if we hit the bottom
        if (containerTop + containerHeight >= scrollHeight - 20) {
            tocLinks.forEach(l => l.classList.remove('active'));
            tocLinks[tocLinks.length - 1].classList.add('active');
            return;
        }

        let currentSectionId = '';
        
        sections.forEach(sec => {
            const secTop = sec.offsetTop - scrollContainer.offsetTop;
            // Highlight section if its top is near the top of viewport container
            if (containerTop >= secTop - 80) {
                currentSectionId = sec.getAttribute('id');
            }
        });

        if (currentSectionId) {
            tocLinks.forEach(link => {
                if (link.getAttribute('href') === `#${currentSectionId}`) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }
    };

})();
