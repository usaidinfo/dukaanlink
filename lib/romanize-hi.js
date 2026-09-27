
const INDEPENDENT = {
  अ: "a",
  आ: "aa",
  इ: "i",
  ई: "ee",
  उ: "u",
  ऊ: "oo",
  ऋ: "ri",
  ऍ: "e",
  ए: "e",
  ऐ: "ai",
  ऑ: "o",
  ओ: "o",
  औ: "au",
};

const MATRA = {
  "ा": "aa",
  "ि": "i",
  "ी": "ee",
  "ु": "u",
  "ू": "oo",
  "ृ": "ri",
  "ॅ": "e",
  "े": "e",
  "ै": "ai",
  "ॉ": "o",
  "ो": "o",
  "ौ": "au",
};

const CONSONANT = {
  क: "k",
  ख: "kh",
  ग: "g",
  घ: "gh",
  ङ: "n",
  च: "ch",
  छ: "chh",
  ज: "j",
  झ: "jh",
  ञ: "n",
  ट: "t",
  ठ: "th",
  ड: "d",
  ढ: "dh",
  ण: "n",
  त: "t",
  थ: "th",
  द: "d",
  ध: "dh",
  न: "n",
  प: "p",
  फ: "ph",
  ब: "b",
  भ: "bh",
  म: "m",
  य: "y",
  र: "r",
  ल: "l",
  व: "v",
  श: "sh",
  ष: "sh",
  स: "s",
  ह: "h",
  ळ: "l",
  क्ष: "ksh",
  ज्ञ: "gy",
};

const VIRAMA = "्";
const HAS_DEVANAGARI = /[\u0900-\u097F]/;

function isMatraOrVirama(ch) {
  return Boolean(MATRA[ch] || ch === VIRAMA || ch === "़");
}

function romanizeWord(word) {
  let out = "";
  let pendingA = false;

  function flushA() {
    if (pendingA) {
      out += "a";
      pendingA = false;
    }
  }

  for (let i = 0; i < word.length; i += 1) {
    const ch = word[i];
    const next = word[i + 1];

    if (INDEPENDENT[ch]) {
      flushA();
      out += INDEPENDENT[ch];
      continue;
    }
    if (CONSONANT[ch]) {
      flushA();
      out += CONSONANT[ch];
      pendingA = true;
      continue;
    }
    if (ch === VIRAMA) {
      pendingA = false;
      continue;
    }
    if (MATRA[ch]) {
      pendingA = false;
      const atEnd = !next || (!CONSONANT[next] && !INDEPENDENT[next] && !isMatraOrVirama(next));
      out += ch === "ा" && atEnd ? "a" : MATRA[ch];
      continue;
    }
    if (ch === "ं" || ch === "ँ") {
      flushA();
      out += "n";
      continue;
    }
    if (ch === "ः") {
      flushA();
      out += "h";
      continue;
    }
    if (ch === "़") {
      continue;
    }
    flushA();
    out += ch;
  }
  return out;
}

export function romanizeHinglish(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  if (!HAS_DEVANAGARI.test(raw)) return raw;

  return raw
    .split(/(\s+)/)
    .map((part) => (HAS_DEVANAGARI.test(part) ? romanizeWord(part) : part))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
