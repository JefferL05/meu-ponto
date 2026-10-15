export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s).replace(/[&<>"\x27]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "\x27": "&#39;" })[c]);
