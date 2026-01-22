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
 * Formats a number with English numerals and optional decimal places
 */
export const formatPrice = (price: number, decimals: number = 0): string => {
  const formatted = price.toFixed(decimals);
  return toEnglishNumbers(formatted);
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
 * Formats a number with commas (alias for formatNumberWithCommas)
 */
export const formatNumber = (num: number): string => {
  return formatNumberWithCommas(num);
};
