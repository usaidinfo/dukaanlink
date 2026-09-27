/** Common Indian-English ASR mixups for grocery names. Price is left alone. */
const NAME_FIXES = [
  [/corn\s*flower/gi, "cornflour"],
  [/con\s*flour/gi, "cornflour"],
  [/corn\s*flour/gi, "cornflour"],
  [/\baata\b/gi, "aata"],
  [/\batta\b/gi, "atta"],
  [/aashirvaad|ashirwad|aasheervaad/gi, "aashirvaad"],
];

export function fixSpokenProductName(name) {
  let next = String(name || "").trim();
  for (const [pattern, value] of NAME_FIXES) {
    next = next.replace(pattern, value);
  }
  return next.replace(/\s+/g, " ").trim();
}
