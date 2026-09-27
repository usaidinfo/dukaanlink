/**
 * Parse a spoken product + price transcript into { name, price, confidence }.
 * Never guess a price: unknown phrases return price: null and low confidence.
 *
 * Colloquial Hindi amount prefixes (easy to extend):
 *   dedh/dhedh = 1.5x   dhai = 2.5x   sava = +¼ of the unit   paune = −¼ of the unit
 */

import { fixSpokenProductName } from "./voice-name-fix";

const CURRENCY = new Set([
  "rupee",
  "rupees",
  "rupaye",
  "rupaiye",
  "rupiya",
  "rupiye",
  "rupay",
  "rupeya",
  "rs",
  "inr",
  "₹",
  "रुपये",
  "रुपए",
  "रुपया",
  "रुपय",
]);

const ONES = {
  zero: 0,
  sunya: 0,
  shunya: 0,
  ek: 1,
  eak: 1,
  aik: 1,
  one: 1,
  do: 2,
  doo: 2,
  two: 2,
  teen: 3,
  tin: 3,
  three: 3,
  char: 4,
  chaar: 4,
  four: 4,
  panch: 5,
  paanch: 5,
  five: 5,
  chhe: 6,
  che: 6,
  chhah: 6,
  chah: 6,
  six: 6,
  saat: 7,
  sat: 7,
  seven: 7,
  aath: 8,
  ath: 8,
  eight: 8,
  nau: 9,
  nao: 9,
  nine: 9,
  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पांच: 5,
  पाँच: 5,
  छह: 6,
  छे: 6,
  सात: 7,
  आठ: 8,
  नौ: 9,
};

const TEENS = {
  das: 10,
  dus: 10,
  ten: 10,
  gyarah: 11,
  gyaara: 11,
  gyaarah: 11,
  eleven: 11,
  barah: 12,
  baara: 12,
  twelve: 12,
  terah: 13,
  thirteen: 13,
  chaudah: 14,
  chauda: 14,
  fourteen: 14,
  pandrah: 15,
  pandra: 15,
  fifteen: 15,
  solah: 16,
  sola: 16,
  sixteen: 16,
  satrah: 17,
  seventeen: 17,
  atharah: 18,
  athara: 18,
  eighteen: 18,
  unnees: 19,
  unnis: 19,
  unneis: 19,
  nineteen: 19,
  दस: 10,
  ग्यारह: 11,
  बारह: 12,
  तेरह: 13,
  चौदह: 14,
  पंद्रह: 15,
  सोलह: 16,
  सत्रह: 17,
  अठारह: 18,
  उन्नीस: 19,
};

const TENS = {
  bees: 20,
  bis: 20,
  twenty: 20,
  tees: 30,
  thirty: 30,
  chaalis: 40,
  chalis: 40,
  forty: 40,
  pachaas: 50,
  pachas: 50,
  pachaash: 50,
  fifty: 50,
  saath: 60,
  sath: 60,
  sixty: 60,
  sattar: 70,
  seventy: 70,
  assi: 80,
  eighty: 80,
  nabbe: 90,
  navve: 90,
  ninety: 90,
  बीस: 20,
  तीस: 30,
  चालीस: 40,
  पचास: 50,
  साठ: 60,
  सत्तर: 70,
  अस्सी: 80,
  नब्बे: 90,
};

const UNITS = {
  sau: 100,
  so: 100,
  sao: 100,
  hundred: 100,
  hazar: 1000,
  hazaar: 1000,
  hajar: 1000,
  thousand: 1000,
  सौ: 100,
  सो: 100,
  हजार: 1000,
};

/** Prefix that modifies the following amount. */
const FRACTIONS = {
  dedh: 1.5,
  dhedh: 1.5,
  dehr: 1.5,
  derh: 1.5,
  dhai: 2.5,
  dhayi: 2.5,
  adhai: 2.5,
  sava: 1.25,
  sawa: 1.25,
  sawaa: 1.25,
  paune: 0.75,
  pauna: 0.75,
  डेढ़: 1.5,
  देढ़: 1.5,
  ढाई: 2.5,
  सवा: 1.25,
  पौने: 0.75,
  पौना: 0.75,
};

const SAVA_LIKE = new Set(["sava", "sawa", "sawaa", "सवा"]);
const PAUNE_LIKE = new Set(["paune", "pauna", "पौने", "पौना"]);

function normalizeToken(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/[.,!?।"'`]/g, "")
    .replace(/₹/g, "")
    .trim();
}

function tokenize(text) {
  return String(text || "")
    .replace(/₹/g, " ₹ ")
    .replace(/(\d)([a-zA-Z\u0900-\u097F])/g, "$1 $2")
    .replace(/([a-zA-Z\u0900-\u097F])(\d)/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function isCurrency(token) {
  const n = normalizeToken(token);
  return CURRENCY.has(n) || n === "₹";
}

function isNumberWord(token) {
  const n = normalizeToken(token);
  if (!n) return false;
  if (/^\d+([.,]\d+)?$/.test(n)) return true;
  return Boolean(ONES[n] ?? TEENS[n] ?? TENS[n] ?? UNITS[n] ?? FRACTIONS[n]);
}

function parseDigitPhrase(tokens) {
  if (tokens.length !== 1) return null;
  const n = normalizeToken(tokens[0]).replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(n)) return null;
  const value = Number(n);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

function findLargestUnit(tokens) {
  let unit = 0;
  for (const token of tokens) {
    const value = UNITS[normalizeToken(token)];
    if (value && value > unit) unit = value;
  }
  return unit || 0;
}

function parseStandardAmount(tokens) {
  if (!tokens.length) return null;
  const digits = parseDigitPhrase(tokens);
  if (digits != null) return digits;

  let total = 0;
  let current = 0;
  let used = false;

  for (const token of tokens) {
    const n = normalizeToken(token);
    if (FRACTIONS[n]) return null;

    if (ONES[n] != null) {
      current += ONES[n];
      used = true;
      continue;
    }
    if (TEENS[n] != null) {
      current += TEENS[n];
      used = true;
      continue;
    }
    if (TENS[n] != null) {
      current += TENS[n];
      used = true;
      continue;
    }
    if (UNITS[n] != null) {
      const count = current || 1;
      total += count * UNITS[n];
      current = 0;
      used = true;
      continue;
    }
    return null;
  }

  if (!used) return null;
  const value = total + current;
  return Number.isFinite(value) ? Math.round(value) : null;
}

function parseHindiAmount(tokens) {
  if (!tokens.length) return null;
  if (tokens.some((token) => !isNumberWord(token))) return null;

  const first = normalizeToken(tokens[0]);
  const factor = FRACTIONS[first];
  if (factor) {
    const rest = tokens.slice(1);
    if (!rest.length) return null;
    const restValue = parseStandardAmount(rest);
    if (restValue == null) return null;
    const unit = findLargestUnit(rest);

    if (SAVA_LIKE.has(first)) {
      if (rest.length === 1 && unit) return Math.round(factor * unit);
      if (unit) return Math.round(restValue + unit / 4);
      return Math.round(factor * restValue);
    }
    if (PAUNE_LIKE.has(first)) {
      if (rest.length === 1 && unit) return Math.round(factor * unit);
      if (unit) return Math.round(restValue - unit / 4);
      return Math.round(factor * restValue);
    }
    return Math.round(factor * restValue);
  }

  return parseStandardAmount(tokens);
}

function findPriceSpan(tokens) {
  const currencyAt = tokens.findLastIndex((token) => isCurrency(token));
  if (currencyAt > 0) {
    let start = currencyAt;
    while (start > 0 && isNumberWord(tokens[start - 1])) start -= 1;
    return { start, end: currencyAt, fallback: start === currencyAt };
  }

  let end = tokens.length;
  while (end > 0 && isCurrency(tokens[end - 1])) end -= 1;
  let start = end;
  while (start > 0 && isNumberWord(tokens[start - 1])) start -= 1;
  if (start < end && start > 0) {
    return { start, end, fallback: true };
  }
  if (start === 0 && end > 0 && tokens.slice(0, end).every((token) => isNumberWord(token) || isCurrency(token))) {
    return { start: 0, end, fallback: true };
  }
  return null;
}

function toTitleCase(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function parseVoiceItem(transcript) {
  const raw = String(transcript || "").trim();
  if (!raw) {
    return { name: "", price: null, confidence: 0 };
  }

  const tokens = tokenize(raw);
  const span = findPriceSpan(tokens);

  if (!span) {
    return {
      name: toTitleCase(fixSpokenProductName(raw)),
      price: null,
      confidence: 0.25,
    };
  }

  const priceTokens = tokens.slice(span.start, span.end);
  const price = parseHindiAmount(priceTokens);
  const name = toTitleCase(
    fixSpokenProductName(
      tokens
        .slice(0, span.start)
        .filter((token) => !isCurrency(token))
        .join(" ")
    )
  );

  if (price == null) {
    return {
      name,
      price: null,
      confidence: 0.3,
    };
  }

  return {
    name,
    price,
    confidence: span.fallback ? 0.7 : 0.92,
  };
}

export function isLowParseConfidence(result) {
  return !result || result.confidence < 0.6 || result.price == null;
}
