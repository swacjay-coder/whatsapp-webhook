const express = require("express");

const UI_POLISH_STYLE_ID = "iconic-v315851-ui-polish";
const originalSend = express.response.send;

const inboxUiPolishCss = `
<style id="${UI_POLISH_STYLE_ID}">
  :root {
    --ic-bg: #f4f7f3;
    --ic-surface: rgba(255, 255, 255, 0.94);
    --ic-surface-strong: #ffffff;
    --ic-border: rgba(24, 53, 43, 0.10);
    --ic-border-strong: rgba(24, 53, 43, 0.16);
    --ic-text: #182b24;
    --ic-muted: #65736d;
    --ic-green: #78b83e;
    --ic-green-dark: #355f2a;
    --ic-shadow: 0 18px 45px rgba(20, 48, 38, 0.08);
    --ic-radius-lg: 24px;
    --ic-radius-md: 18px;
    --ic-radius-sm: 12px;
    --ic-font: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  }

  html {
    width: 100%;
    height: 100%;
    font-size: 14px;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  body {
    min-width: 1180px;
    min-height: 100vh;
    margin: 0;
    font-family: var(--ic-font) !important;
    color: var(--ic-text);
    background:
      radial-gradient(circle at top left, rgba(120, 184, 62, 0.14), transparent 34%),
      radial-gradient(circle at bottom right, rgba(22, 53, 43, 0.10), transparent 32%),
      var(--ic-bg) !important;
    line-height: 1.38;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  body, button, input, textarea, select {
    font-family: var(--ic-font) !important;
  }

  h1, h2, h3, h4, h5, h6, p {
    margin-top: 0;
  }

  h1, h2, h3 {
    letter-spacing: -0.035em;
    line-height: 1.08;
  }

  h1 {
    font-size: clamp(24px, 1.9vw, 32px) !important;
  }

  h2 {
    font-size: clamp(18px, 1.35vw, 24px) !important;
  }

  h3 {
    font-size: clamp(15px, 1.02vw, 18px) !important;
  }

  p, label, span, div, td, th, input, textarea, select, button {
    font-size: 13px;
  }

  small, .small, .meta, .muted, [class*="meta"], [class*="muted"], [class*="time"], [class*="timestamp"] {
    font-size: 11px !important;
    color: var(--ic-muted) !important;
  }

  button, .btn, [class*="button"], [role="button"], input[type="button"], input[type="submit"] {
    min-height: 36px;
    border-radius: 12px !important;
    font-weight: 700 !important;
    letter-spacing: -0.01em;
    line-height: 1.1 !important;
    padding: 9px 13px !important;
    box-shadow: none !important;
  }

  input, textarea, select {
    border-radius: 14px !important;
    border: 1px solid var(--ic-border-strong) !important;
    background: rgba(255,255,255,0.96) !important;
    color: var(--ic-text) !important;
    outline: none !important;
  }

  input:focus, textarea:focus, select:focus {
    border-color: rgba(120,184,62,0.75) !important;
    box-shadow: 0 0 0 4px rgba(120,184,62,0.12) !important;
  }

  textarea {
    min-height: 74px !important;
    max-height: 160px !important;
    resize: vertical;
    line-height: 1.45 !important;
  }

  img, svg, video, canvas {
    max-width: 100%;
    height: auto;
  }

  body > * {
    max-width: 100%;
  }

  main, .app, .container, .dashboard, .layout, .shell, [class*="app"], [class*="container"], [class*="dashboard"], [class*="layout"], [class*="shell"] {
    max-width: 1520px !important;
  }

  .app, .dashboard, .layout, .shell, [class*="dashboard"], [class*="layout"], [class*="shell"] {
    gap: 14px !important;
  }

  .card, .panel, .box, .widget, .section, [class*="card"], [class*="panel"], [class*="widget"], [class*="section"] {
    border-radius: var(--ic-radius-lg) !important;
    border: 1px solid var(--ic-border) !important;
    background-color: var(--ic-surface) !important;
    box-shadow: var(--ic-shadow) !important;
  }

  [class*="sidebar"], [class*="conversation"], [class*="customer"], [class*="thread"], [class*="chat"], [class*="booking"], [class*="update"] {
    scrollbar-width: thin;
    scrollbar-color: rgba(120,184,62,0.55) transparent;
  }

  [class*="sidebar"]::-webkit-scrollbar,
  [class*="conversation"]::-webkit-scrollbar,
  [class*="customer"]::-webkit-scrollbar,
  [class*="thread"]::-webkit-scrollbar,
  [class*="chat"]::-webkit-scrollbar,
  [class*="booking"]::-webkit-scrollbar,
  [class*="update"]::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  [class*="sidebar"]::-webkit-scrollbar-thumb,
  [class*="conversation"]::-webkit-scrollbar-thumb,
  [class*="customer"]::-webkit-scrollbar-thumb,
  [class*="thread"]::-webkit-scrollbar-thumb,
  [class*="chat"]::-webkit-scrollbar-thumb,
  [class*="booking"]::-webkit-scrollbar-thumb,
  [class*="update"]::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(120,184,62,0.45);
  }

  [class*="sidebar"], [class*="conversation-list"], [class*="customer-list"] {
    min-width: 300px !important;
    max-width: 390px !important;
  }

  [class*="chat"], [class*="thread"], [class*="messages"] {
    min-width: 0 !important;
  }

  [class*="message"], [class*="bubble"] {
    max-width: min(76%, 720px) !important;
    border-radius: 18px !important;
    line-height: 1.45 !important;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  [class*="message"] p, [class*="bubble"] p {
    margin-bottom: 6px !important;
  }

  [class*="composer"], [class*="reply"], form {
    gap: 10px !important;
  }

  table {
    width: 100%;
    border-collapse: separate !important;
    border-spacing: 0 8px !important;
    font-size: 12px !important;
  }

  th {
    font-size: 11px !important;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ic-muted) !important;
  }

  td {
    font-size: 12px !important;
    vertical-align: middle;
  }

  .badge, [class*="badge"], [class*="tag"], [class*="status"] {
    border-radius: 999px !important;
    font-size: 11px !important;
    font-weight: 800 !important;
    padding: 5px 9px !important;
    line-height: 1 !important;
    white-space: nowrap;
  }

  header, .header, [class*="header"], [class*="topbar"], [class*="toolbar"] {
    min-height: 54px;
  }

  header img, .header img, [class*="header"] img, [class*="logo"] img, img[class*="logo"] {
    max-height: 42px !important;
    width: auto !important;
    object-fit: contain !important;
  }

  [class*="avatar"], .avatar {
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;
    border-radius: 50% !important;
  }

  [class*="icon"], svg {
    flex: 0 0 auto;
  }

  [class*="stat"], [class*="metric"] {
    min-height: 74px !important;
  }

  @media (min-width: 1180px) {
    body {
      overflow: hidden;
    }

    main, .app, .dashboard, .layout, .shell, [class*="app"], [class*="dashboard"], [class*="layout"], [class*="shell"] {
      height: calc(100vh - 24px) !important;
      margin: 12px auto !important;
    }

    [class*="messages"], [class*="thread"], [class*="chat-body"], [class*="conversation-body"] {
      max-height: calc(100vh - 245px) !important;
      overflow-y: auto !important;
    }
  }

  @media (max-width: 1280px) {
    html {
      font-size: 13px;
    }

    body {
      min-width: 1080px;
    }

    [class*="sidebar"], [class*="conversation-list"], [class*="customer-list"] {
      min-width: 280px !important;
      max-width: 350px !important;
    }

    .card, .panel, .box, .widget, .section, [class*="card"], [class*="panel"], [class*="widget"], [class*="section"] {
      border-radius: var(--ic-radius-md) !important;
    }
  }

  @media (max-width: 900px) {
    body {
      min-width: 0;
      overflow: auto;
    }

    main, .app, .dashboard, .layout, .shell, [class*="app"], [class*="dashboard"], [class*="layout"], [class*="shell"] {
      height: auto !important;
      margin: 8px !important;
    }

    [class*="sidebar"], [class*="conversation-list"], [class*="customer-list"] {
      min-width: 0 !important;
      max-width: none !important;
    }

    [class*="message"], [class*="bubble"] {
      max-width: 88% !important;
    }
  }
</style>`;

express.response.send = function patchedSend(body) {
  try {
    const requestPath = this?.req?.path || this?.req?.originalUrl || "";
    const isInboxPage = requestPath === "/inbox" || requestPath.startsWith("/inbox?");

    if (
      isInboxPage &&
      typeof body === "string" &&
      body.includes("</head>") &&
      !body.includes(UI_POLISH_STYLE_ID)
    ) {
      body = body.replace("</head>", `${inboxUiPolishCss}\n</head>`);
    }
  } catch (error) {
    console.error("Inbox UI polish injection skipped:", error);
  }

  return originalSend.call(this, body);
};

require("./server.js");
