const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
const faviconUrl = "https://iconichaircare.com/wp-content/uploads/2026/05/BE6F2E6E-357D-486A-ADC3-0A8F70D22A26.jpg";

let source = fs.readFileSync(serverPath, "utf8");
let next = source;

const marker = "V31.5.8.60.3.1.11-favicon-bot-header-only";

if (!next.includes(marker)) {
  const faviconLinks = `
    <!-- ${marker}: browser tab icon only -->
    <link rel="icon" type="image/jpeg" href="${faviconUrl}">
    <link rel="shortcut icon" type="image/jpeg" href="${faviconUrl}">
`;

  if (next.includes("</head>")) {
    next = next.replace("</head>", `${faviconLinks}\n  </head>`);
  } else {
    next = next.replace("<title>", `${faviconLinks}\n    <title>`);
  }

  const runtimeJs = `

(function applyBotHeaderFaviconOnly() {
  var faviconUrl = "${faviconUrl}";
  var marker = "${marker}";
  if (window.__iconicFaviconApplied === marker) return;
  window.__iconicFaviconApplied = marker;

  var links = [
    document.querySelector('link[rel="icon"]'),
    document.querySelector('link[rel="shortcut icon"]')
  ];

  links.forEach(function(link, index) {
    if (!link) {
      link = document.createElement("link");
      link.rel = index === 0 ? "icon" : "shortcut icon";
      document.head.appendChild(link);
    }
    link.type = "image/jpeg";
    link.href = faviconUrl;
  });
})();
`;

  if (next.includes("</script>")) {
    const lastScript = next.lastIndexOf("</script>");
    next = next.slice(0, lastScript) + runtimeJs + "\n" + next.slice(lastScript);
  }
}

if (next !== source) {
  fs.writeFileSync(serverPath, next, "utf8");
  console.log("Browser favicon updated to bot header image only.");
} else {
  console.log("Browser favicon already uses bot header image.");
}
