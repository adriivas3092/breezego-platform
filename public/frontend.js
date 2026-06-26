/**
 * BreezeGo Frontend Engineering spec board JS
 * Controls folder expanding toggles, smooth scroll index targets, and active ScrollSpy trackers.
 */
(function() {

    const scrollContainer = document.getElementById('fe-scroll-container');
    const tocLinks = document.querySelectorAll('#fe-sidebar-toc .toc-link');
    const sections = document.querySelectorAll('.spec-section');

    if (!scrollContainer || tocLinks.length === 0 || sections.length === 0) return;

    // 1. DYNAMIC DIRECTORY FOLDER COLLAPSE/EXPAND CONTROLLERS
    const folderButtons = document.querySelectorAll('.tree-folder');

    folderButtons.forEach(folder => {
        folder.addEventListener('click', () => {
            const folderKey = folder.getAttribute('data-folder');
            const targetChildList = document.getElementById(`tree-child-${folderKey}`);

            if (targetChildList) {
                folder.classList.toggle('closed');
                targetChildList.classList.toggle('collapsed');
                
                // Toggle arrow symbol
                const toggleSym = folder.querySelector('.folder-toggle');
                if (toggleSym) {
                    if (folder.classList.contains('closed')) {
                        toggleSym.textContent = '▶';
                    } else {
                        toggleSym.textContent = '▼';
                    }
                }
            }
        });
    });

    // 2. SMOOTH SCROLLING INDEX NAVIGATION
    tocLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSec = document.querySelector(targetId);

            if (targetSec) {
                // Remove active classes
                tocLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                // Scroll smoothly
                const scrollOffset = targetSec.offsetTop - scrollContainer.offsetTop - 10;
                scrollContainer.scrollTo({
                    top: scrollOffset,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 3. HIGH PERFORMANCE SCROLLSPY
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

        // Check if bottomed out
        if (containerTop + containerHeight >= scrollHeight - 20) {
            tocLinks.forEach(l => l.classList.remove('active'));
            tocLinks[tocLinks.length - 1].classList.add('active');
            return;
        }

        let currentSectionId = '';

        sections.forEach(sec => {
            const secTop = sec.offsetTop - scrollContainer.offsetTop;
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
