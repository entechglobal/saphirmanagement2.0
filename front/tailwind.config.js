/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "-apple-system", "sans-serif"],
      },
    colors: {
        // Global tokens
        bg: "var(--bg)",
        card: "var(--card)",
        textPrimary: "var(--textPrimary)",
        textSecondary: "var(--textSecondary)",
        border: "var(--border)",
        primary: "var(--primary)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        purple: "var(--purple)",
        
        // Sidebar tokens
        sidebarBg: "var(--sidebar-bg)",
        sidebarBorder: "var(--sidebar-border)",
        sidebarLogoBorder: "var(--sidebar-logoBorder)",
        sidebarTextPrimary: "var(--sidebar-textPrimary)",
        sidebarTextSecondary: "var(--sidebar-textSecondary)",
        
        sidebarMenuItemActiveText: "var(--sidebar-menuItem-activeText)",
        sidebarMenuItemActiveBg: "var(--sidebar-menuItem-activeBg)",
        sidebarMenuItemHoverBg: "var(--sidebar-menuItem-hoverBg)",
        sidebarMenuItemHoverText: "var(--sidebar-menuItem-hoverText)",
        
        sidebarSubmenuBorder: "var(--sidebar-submenu-border)",
        sidebarSubmenuItemActiveBg: "var(--sidebar-submenu-itemActiveBg)",
        sidebarSubmenuItemActiveText: "var(--sidebar-submenu-itemActiveText)",
        sidebarSubmenuItemHoverBg: "var(--sidebar-submenu-itemHoverBg)",
        sidebarSubmenuItemHoverText: "var(--sidebar-submenu-itemHoverText)",
        
        sidebarMobileNavBg: "var(--sidebar-mobileNav-bg)",
        sidebarMobileNavBorder: "var(--sidebar-mobileNav-border)",
        sidebarMobileNavGradientFrom: "var(--sidebar-mobileNav-gradientFrom)",
        sidebarMobileNavItemActiveBg: "var(--sidebar-mobileNav-itemActiveBg)",
        sidebarMobileNavItemHoverBg: "var(--sidebar-mobileNav-itemHoverBg)",
        
        sidebarProfileCircleBg: "var(--sidebar-profileCircle-bg)",
        sidebarProfileCircleRingBg: "var(--sidebar-profileCircle-ringBg)",
        
        sidebarScrollbarThumb: "var(--sidebar-scrollbar-thumb)",
        sidebarScrollbarThumbHover: "var(--sidebar-scrollbar-thumbHover)",
        
        sidebarSkeletonBg: "var(--sidebar-skeleton-bg)",
        sidebarOverlay: "var(--sidebar-overlay)",
        
        // Header tokens
        headerBg: "var(--header-bg)",
        headerBorder: "var(--header-border)",
        
        headerButtonBg: "var(--header-button-bg)",
        headerButtonHoverBg: "var(--header-button-hoverBg)",
        headerButtonText: "var(--header-button-text)",
        headerButtonHoverText: "var(--header-button-hoverText)",
        
        headerBrandingBorder: "var(--header-branding-border)",
        headerBrandingCompanyBg: "var(--header-branding-companyBg)",
        headerBrandingCompanyBorder: "var(--header-branding-companyBorder)",
        headerBrandingTextPrimary: "var(--header-branding-textPrimary)",
        headerBrandingTextSecondary: "var(--header-branding-textSecondary)",
        
        headerStatusDotBg: "var(--header-status-dotBg)",
        headerStatusDotBorder: "var(--header-status-dotBorder)",
        
        headerRoleBadgeBg: "var(--header-roleBadge-bg)",
        headerRoleBadgeText: "var(--header-roleBadge-text)",
        headerRoleBadgeBorder: "var(--header-roleBadge-border)",
        
        headerDropdownBg: "var(--header-dropdown-bg)",
        headerDropdownBorder: "var(--header-dropdown-border)",
        headerDropdownHeaderBg: "var(--header-dropdown-headerBg)",
        headerDropdownItemHoverBg: "var(--header-dropdown-itemHoverBg)",
        headerDropdownItemHoverText: "var(--header-dropdown-itemHoverText)",
        headerDropdownDivider: "var(--header-dropdown-divider)",
        
        headerLanguageSelectorBg: "var(--header-languageSelector-bg)",
        headerLanguageSelectorHoverBg: "var(--header-languageSelector-hoverBg)",
        
        headerToggleBg: "var(--header-toggle-bg)",
        headerToggleHoverBg: "var(--header-toggle-hoverBg)",
        headerToggleText: "var(--header-toggle-text)",
        headerToggleActiveText: "var(--header-toggle-activeText)",
      },
      transitionProperty: {
        colors:
          "color, background-color, border-color, text-decoration-color, fill, stroke",
      },
      transitionDuration: {
        DEFAULT: "300ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
