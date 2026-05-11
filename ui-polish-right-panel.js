const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
let source = fs.readFileSync(serverPath, "utf8");
let next = source;

next = next.replace(
  /const BOT_VERSION = "[^"]*";/,
  'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-3-1-12-sidebar-bot-header-logo";'
);

const botHeaderUrl = 'https://iconichaircare.com/wp-content/uploads/2026/05/BE6F2E6E-357D-486A-ADC3-0A8F70D22A26.jpg';

const logoRuntimeMarker = "forceSidebarBotHeaderLogo";
const logoRuntimeJs = `

function forceSidebarBotHeaderLogo() {
  const botHeaderUrl = "${botHeaderUrl}";
  const sidebarLogoImg = document.querySelector(".sidebar-logo img");
  if (sidebarLogoImg) {
    sidebarLogoImg.src = botHeaderUrl;
    sidebarLogoImg.alt = "Iconic Hair Care";
  }

  let favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }
  favicon.href = botHeaderUrl;
}
forceSidebarBotHeaderLogo();
`;
if (!next.includes(logoRuntimeMarker)) {
  next = next.replace("\nloadMessages();", logoRuntimeJs + "\nloadMessages();");
}

const logoCssMarker = "V31.5.8.60.3.1.12 - Sidebar uses bot header logo";
const logoCss = `

    /* V31.5.8.60.3.1.12 - Sidebar uses bot header logo */
    .sidebar-brand {
      min-height: 116px !important;
      padding: 7px 0 18px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .sidebar-logo {
      width: 202px !important;
      height: 94px !important;
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 auto !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      overflow: visible !important;
    }
    .sidebar-logo img {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      object-position: center center !important;
      border-radius: 0 !important;
      filter: drop-shadow(0 8px 14px rgba(15,23,42,.10)) !important;
    }
`;
if (!next.includes(logoCssMarker)) {
  const styleEndIndex = next.lastIndexOf("</style>");
  if (styleEndIndex !== -1) {
    next = next.slice(0, styleEndIndex) + logoCss + "\n  " + next.slice(styleEndIndex);
  }
}

if (next !== source) {
  fs.writeFileSync(serverPath, next, "utf8");
  console.log("Sidebar logo replaced with bot header image.");
} else {
  console.log("Sidebar bot header logo already applied.");
}
