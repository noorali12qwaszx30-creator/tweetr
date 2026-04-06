// Arabic text normalization and fuzzy matching utilities

export const ARABIC_TYPO_MAP: Record<string, string[]> = {
  'بركر': ['برجر', 'برقر'],
  'بيبسي': ['ببسي', 'بيبسى'],
  'لحم': ['لحمة', 'لحوم'],
  'دجاج': ['جاج', 'دياج', 'جكن'],
  'جكن': ['دجاج', 'تشكن'],
};

export function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .trim()
    .toLowerCase();
}

export function fuzzyMatch(text: string, query: string): boolean {
  const normText = normalizeArabic(text);
  const normQuery = normalizeArabic(query);
  if (normText.includes(normQuery)) return true;

  // Check typo map
  for (const [typo, corrections] of Object.entries(ARABIC_TYPO_MAP)) {
    if (normalizeArabic(typo).includes(normQuery) || normQuery.includes(normalizeArabic(typo))) {
      for (const c of corrections) {
        if (normText.includes(normalizeArabic(c))) return true;
      }
    }
    for (const c of corrections) {
      if (normalizeArabic(c).includes(normQuery) || normQuery.includes(normalizeArabic(c))) {
        if (normText.includes(normalizeArabic(typo))) return true;
      }
    }
  }

  // Simple character distance for short queries
  if (normQuery.length >= 3 && normQuery.length <= 6) {
    let matches = 0;
    for (const ch of normQuery) {
      if (normText.includes(ch)) matches++;
    }
    if (matches / normQuery.length >= 0.7) return true;
  }

  return false;
}
