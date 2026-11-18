// Sound & Signal — Shared Navbar and Footer Components

class SiteComponents {
  static renderNavbar(currentPage = '') {
    const nav = document.createElement('nav');
    nav.innerHTML = `
      <div class="navbar">
        <a href="index.html" class="navbar-brand">
          ♪ Sound & Signal
        </a>
        <ul class="navbar-links">
          <li><a href="index.html" class="${currentPage === 'home' ? 'active' : ''}">Home</a></li>
          <li><a href="waves.html" class="${currentPage === 'waves' ? 'active' : ''}">Sound Waves</a></li>
          <li><a href="filters.html" class="${currentPage === 'filters' ? 'active' : ''}">Filters</a></li>
          <li class="navbar-github">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" title="View on GitHub">GitHub</a>
          </li>
        </ul>
      </div>
    `;
    return nav;
  }

  static renderFooter() {
    const footer = document.createElement('footer');
    footer.innerHTML = `
      <div class="footer-content">
        <div class="footer-branding">♪ Sound & Signal</div>
        <div class="footer-credit">
          Built with VS Code + GitHub Copilot
        </div>
      </div>
    `;
    return footer;
  }

  static init(currentPage = '') {
    // Insert navbar at the top
    const navContainer = document.createElement('div');
    navContainer.appendChild(this.renderNavbar(currentPage));
    document.body.insertBefore(navContainer, document.body.firstChild);

    // Insert footer at the bottom
    const footerContainer = document.createElement('div');
    footerContainer.appendChild(this.renderFooter());
    document.body.appendChild(footerContainer);

    // Set active link based on current page
    this.setActivePage(currentPage);
  }

  static setActivePage(currentPage) {
    const links = document.querySelectorAll('.navbar-links a');
    links.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (currentPage === 'home' && href === 'index.html') {
        link.classList.add('active');
      } else if (currentPage === 'waves' && href === 'waves.html') {
        link.classList.add('active');
      } else if (currentPage === 'filters' && href === 'filters.html') {
        link.classList.add('active');
      }
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Get current page from data attribute or window location
  const currentPage = document.body.getAttribute('data-page') || 'home';
  SiteComponents.init(currentPage);
});
