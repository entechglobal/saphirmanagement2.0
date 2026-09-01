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
    bg: "#0f172a",
    card: "#1e293b",
    textPrimary: "#f8fafc",
    textSecondary: "#94a3b8",
    border: "#334155",
    primary: "#B12B89",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    purple: "#8B5CF6",
    
    // ===== SIDEBAR SPECIFIC TOKENS =====
    sidebar: {
      bg: "#1e293b",                    // Dark sidebar background
      border: "#334155",                // Sidebar borders
      logoBorder: "#0f172a",            // Logo bottom border
      textPrimary: "#f8fafc",           // Primary text in sidebar
      textSecondary: "#94a3b8",         // Secondary text in sidebar
      
      menuItem: {
        activeText: "#B12B89",          // Active menu text
        activeBg: "rgba(15, 131, 239, 0.1)", // Active menu background
        hoverBg: "#1f2937",             // Hover background
        hoverText: "#f8fafc",           // Hover text
      },
      
      submenu: {
        border: "#334155",              // Submenu border
        itemActiveBg: "#B12B89",       // Active submenu background
        itemActiveText: "#ffffff",     // Active submenu text
        itemHoverBg: "#1f2937",        // Submenu hover background
        itemHoverText: "#f8fafc",      // Submenu hover text
      },
      
      mobileNav: {
        bg: "rgba(30, 41, 59, 0.8)",   // Mobile nav background
        border: "#334155",              // Mobile nav border
        gradientFrom: "rgba(0, 0, 0, 0.05)", // Gradient overlay
        itemActiveBg: "rgba(15, 131, 239, 0.1)", // Active background
        itemHoverBg: "#1f2937",         // Hover background
      },
      
      profileCircle: {
        bg: "#B12B89",                 // Profile circle background
        ringBg: "#1e293b",             // Ring background
      },
      
      scrollbar: {
        thumb: "#475569",              // Scrollbar thumb
        thumbHover: "#B12B89",         // Scrollbar thumb hover
      },
      
      skeleton: {
        bg: "#1f2937",                 // Skeleton background
      },
      
      overlay: "rgba(0, 0, 0, 0.6)",   // Mobile backdrop
    },
    
    // ===== HEADER SPECIFIC TOKENS =====
    header: {
      bg: "rgba(30, 41, 59, 0.85)",    // Header background with blur
      border: "#334155",               // Header bottom border
      
      button: {
        bg: "#1e293b",                 // Button background
        hoverBg: "#334155",            // Button hover background
        text: "#94a3b8",               // Button text
        hoverText: "#B12B89",          // Button hover text
      },
      
      branding: {
        border: "#334155",             // Branding border
        companyBg: "#1e293b",          // Company logo background
        companyBorder: "#334155",      // Company logo border
        textPrimary: "#f8fafc",        // Primary branding text
        textSecondary: "#94a3b8",      // Secondary branding text
      },
      
      status: {
        dotBg: "#10B981",              // Online status dot
        dotBorder: "#1e293b",          // Status dot border
      },
      
      roleBadge: {
        bg: "rgba(15, 131, 239, 0.1)", // Role badge background
        text: "#60a5fa",               // Role badge text (lighter for dark mode)
        border: "rgba(15, 131, 239, 0.2)", // Role badge border
      },
      
      dropdown: {
        bg: "#1e293b",                 // Dropdown background
        border: "#334155",             // Dropdown border
        headerBg: "rgba(30, 41, 59, 0.5)", // Dropdown header
        itemHoverBg: "#1e293b",        // Item hover background
        itemHoverText: "#B12B89",      // Item hover text
        divider: "#334155",            // Divider color
      },
      
      languageSelector: {
        bg: "#1e293b",                 // Language selector background
        hoverBg: "#334155",            // Language hover background
      },
      
      toggle: {
        bg: "#1e293b",                 // Toggle group background
        hoverBg: "#1e293b",            // Toggle hover background
        text: "#94a3b8",               // Toggle text
        activeText: "#F59E0B",         // Active toggle text
      },
    },
  },
};