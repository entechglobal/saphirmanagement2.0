export const themes = {
  light: {
    // ===== GLOBAL TOKENS (used across entire app) =====
    bg: "#f8fafc",
    card: "#ffffff",
    textPrimary: "#0f172a",
    textSecondary: "#64748b",
    border: "#e2e8f0",
    primary: "#B12B89",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    purple: "#8B5CF6",
    
    // ===== SIDEBAR SPECIFIC TOKENS =====
    sidebar: {
      bg: "#ffffff",                    // Sidebar background
      border: "#e2e8f0",               // Sidebar borders
      logoBorder: "#f1f5f9",           // Logo bottom border
      textPrimary: "#0f172a",          // Primary text in sidebar
      textSecondary: "#64748b",        // Secondary text in sidebar
      
      // Menu item states
      menuItem: {
        activeText: "#B12B89",         // Active menu text color
        activeBg: "#eff6ff",           // Active menu background
        hoverBg: "#f3f4f6",            // Hover background
        hoverText: "#0f172a",          // Hover text color
      },
      
      // Submenu styles
      submenu: {
        border: "#e2e8f0",             // Submenu left border
        itemActiveBg: "#B12B89",       // Active submenu background
        itemActiveText: "#ffffff",     // Active submenu text
        itemHoverBg: "#f3f4f6",        // Submenu hover background
        itemHoverText: "#0f172a",      // Submenu hover text
      },
      
      // Mobile bottom navigation
      mobileNav: {
        bg: "rgba(255, 255, 255, 0.8)",  // Mobile nav background
        border: "#e2e8f0",               // Mobile nav border
        gradientFrom: "rgba(17, 24, 39, 0.05)", // Gradient overlay
        itemActiveBg: "#eff6ff",         // Active item background
        itemHoverBg: "#f3f4f6",          // Hover background
      },
      
      // Profile circle in mobile nav
      profileCircle: {
        bg: "#B12B89",                   // Profile circle background
        ringBg: "#ffffff",               // Ring background
      },
      
      // Scrollbar
      scrollbar: {
        thumb: "#cbd5e1",                // Scrollbar thumb color
        thumbHover: "#B12B89",           // Scrollbar thumb hover
      },
      
      // Loading states
      skeleton: {
        bg: "#e5e7eb",                   // Skeleton background
      },
      
      // Backdrop overlay
      overlay: "rgba(17, 24, 39, 0.6)",  // Mobile backdrop
    },
    
    // ===== HEADER SPECIFIC TOKENS =====
    header: {
      bg: "#ffffff",                    // Header background
      border: "#e2e8f0",               // Header bottom border
      
      // Button styles
      button: {
        bg: "#f8fafc",                 // Button background
        hoverBg: "#f1f5f9",            // Button hover background
        text: "#64748b",               // Button text color
        hoverText: "#B12B89",          // Button hover text
      },
      
      // Branding section
      branding: {
        border: "#e2e8f0",             // Branding border
        companyBg: "#ffffff",          // Company logo background
        companyBorder: "#e2e8f0",      // Company logo border
        textPrimary: "#0f172a",        // Primary branding text
        textSecondary: "#64748b",      // Secondary branding text
      },
      
      // Status indicators
      status: {
        dotBg: "#10B981",              // Online status dot
        dotBorder: "#ffffff",          // Status dot border
      },
      
      // Role badges
      roleBadge: {
        bg: "#eff6ff",                 // Role badge background
        text: "#B12B89",               // Role badge text
        border: "rgba(15, 131, 239, 0.2)", // Role badge border
      },
      
      // Profile dropdown
      dropdown: {
        bg: "#ffffff",                 // Dropdown background
        border: "#e2e8f0",            // Dropdown border
        headerBg: "#f8fafc",          // Dropdown header background
        itemHoverBg: "#f8fafc",       // Item hover background
        itemHoverText: "#B12B89",     // Item hover text
        divider: "#f1f5f9",           // Divider color
      },
      
      // Language selector
      languageSelector: {
        bg: "#f8fafc",                // Language selector background
        hoverBg: "#f1f5f9",           // Language hover background
      },
      
      // Fullscreen/Theme toggles
      toggle: {
        bg: "#f8fafc",                // Toggle group background
        hoverBg: "#ffffff",           // Toggle hover background
        text: "#64748b",              // Toggle text color
        activeText: "#F59E0B",        // Active toggle text (for sun icon)
      },
    },
  },
  
  dark: {
    // ===== GLOBAL TOKENS =====
    bg: "#161616",
    card: "#1c1c1c",
    textPrimary: "#f8fafc",
    textSecondary: "#a3a3a3",
    border: "#2e2e2e",
    primary: "#B12B89",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    purple: "#8B5CF6",
    
    // ===== SIDEBAR SPECIFIC TOKENS =====
    sidebar: {
      bg: "#161616",                    // Dark sidebar background
      border: "#2e2e2e",                // Sidebar borders
      logoBorder: "#111111",            // Logo bottom border
      textPrimary: "#f8fafc",           // Primary text in sidebar
      textSecondary: "#a3a3a3",         // Secondary text in sidebar
      
      menuItem: {
        activeText: "#B12B89",          // Active menu text
        activeBg: "rgba(177, 43, 137, 0.12)", // Active menu background
        hoverBg: "#222222",             // Hover background
        hoverText: "#f8fafc",           // Hover text
      },
      
      submenu: {
        border: "#2e2e2e",              // Submenu border
        itemActiveBg: "#B12B89",       // Active submenu background
        itemActiveText: "#ffffff",     // Active submenu text
        itemHoverBg: "#222222",        // Submenu hover background
        itemHoverText: "#f8fafc",      // Submenu hover text
      },
      
      mobileNav: {
        bg: "rgba(22, 22, 22, 0.92)",   // Mobile nav background
        border: "#2e2e2e",              // Mobile nav border
        gradientFrom: "rgba(0, 0, 0, 0.05)", // Gradient overlay
        itemActiveBg: "rgba(177, 43, 137, 0.12)", // Active background
        itemHoverBg: "#222222",         // Hover background
      },
      
      profileCircle: {
        bg: "#B12B89",                 // Profile circle background
        ringBg: "#1c1c1c",             // Ring background
      },
      
      scrollbar: {
        thumb: "#3a3a3a",              // Scrollbar thumb
        thumbHover: "#B12B89",         // Scrollbar thumb hover
      },
      
      skeleton: {
        bg: "#222222",                 // Skeleton background
      },
      
      overlay: "rgba(0, 0, 0, 0.6)",   // Mobile backdrop
    },
    
    // ===== HEADER SPECIFIC TOKENS =====
    header: {
      bg: "rgba(22, 22, 22, 0.92)",    // Header background with blur
      border: "#2e2e2e",               // Header bottom border
      
      button: {
        bg: "#222222",                 // Button background
        hoverBg: "#2e2e2e",            // Button hover background
        text: "#a3a3a3",               // Button text
        hoverText: "#B12B89",          // Button hover text
      },
      
      branding: {
        border: "#2e2e2e",             // Branding border
        companyBg: "#222222",          // Company logo background
        companyBorder: "#2e2e2e",      // Company logo border
        textPrimary: "#f8fafc",        // Primary branding text
        textSecondary: "#a3a3a3",      // Secondary branding text
      },
      
      status: {
        dotBg: "#10B981",              // Online status dot
        dotBorder: "#1c1c1c",          // Status dot border
      },
      
      roleBadge: {
        bg: "rgba(177, 43, 137, 0.12)", // Role badge background
        text: "#E879C0",               // Role badge text (lighter for dark mode)
        border: "rgba(177, 43, 137, 0.25)", // Role badge border
      },
      
      dropdown: {
        bg: "#1c1c1c",                 // Dropdown background
        border: "#2e2e2e",             // Dropdown border
        headerBg: "rgba(28, 28, 28, 0.8)", // Dropdown header
        itemHoverBg: "#222222",        // Item hover background
        itemHoverText: "#B12B89",      // Item hover text
        divider: "#2e2e2e",            // Divider color
      },
      
      languageSelector: {
        bg: "#222222",                 // Language selector background
        hoverBg: "#2e2e2e",            // Language hover background
      },
      
      toggle: {
        bg: "#222222",                 // Toggle group background
        hoverBg: "#222222",            // Toggle hover background
        text: "#a3a3a3",               // Toggle text
        activeText: "#F59E0B",         // Active toggle text
      },
    },
  },
};