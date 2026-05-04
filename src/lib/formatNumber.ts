/**
 * Converts Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) to Western/English numerals (0123456789)
 * This ensures numbers are always displayed in English format regardless of system locale
 */
export const toEnglishNumbers = (value: string | number): string => {
  if (value === null || value === undefined) return '';
  
  const str = String(value);
  
  // Arabic-Indic numerals to Western numerals mapping
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  
  let result = str;
  
  // Replace Arabic-Indic numerals
  arabicNumerals.forEach((numeral, index) => {
    result = result.replace(new RegExp(numeral, 'g'), String(index));
  });
  
  // Replace Persian/Farsi numerals
  persianNumerals.forEach((numeral, index) => {
    result = result.replace(new RegExp(numeral, 'g'), String(index));
  });
  
  return result;
};

/**
 * Formats a number with commas for thousands and English numerals
 */
export const formatNumberWithCommas = (num: number): string => {
  const formatted = num.toLocaleString('en-US');
  return toEnglishNumbers(formatted);
};

/**
 * Formats a date/time string ensuring English numerals
 */
export const formatTimeEnglish = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'م' : 'ص';
  
  // تحويل لنظام 12 ساعة
  hours = hours % 12;
  hours = hours ? hours : 12; // الساعة 0 تصبح 12
  
  return `${hours}:${minutes} ${period}`;
};

/**
 * Formats a full date ensuring English numerals
 */
export const formatDateEnglish = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
};

/**
 * Converts a number (0-9999) into Arabic words for proper TTS pronunciation.
 * Example: 168 -> "مئة وثمانية وستون"
 */
export const numberToArabicWords = (num: number): string => {
  if (num === 0) return 'صفر';
  if (num < 0) return 'سالب ' + numberToArabicWords(-num);

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];

  const parts: string[] = [];

  if (num >= 1000) {
    const th = Math.floor(num / 1000);
    if (th === 1) parts.push('ألف');
    else if (th === 2) parts.push('ألفان');
    else if (th >= 3 && th <= 10) parts.push(ones[th] + ' آلاف');
    else parts.push(numberToArabicWords(th) + ' ألف');
    num %= 1000;
  }

  if (num >= 100) {
    parts.push(hundreds[Math.floor(num / 100)]);
    num %= 100;
  }

  if (num >= 20) {
    const t = Math.floor(num / 10);
    const o = num % 10;
    if (o === 0) parts.push(tens[t]);
    else parts.push(ones[o] + ' و' + tens[t]);
  } else if (num >= 10) {
    parts.push(teens[num - 10]);
  } else if (num > 0) {
    parts.push(ones[num]);
  }

  return parts.join(' و');
};
