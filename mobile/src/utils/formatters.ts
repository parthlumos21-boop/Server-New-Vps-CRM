export const formatDealNo = (num: any): string => {
  if (!num) return '-';
  const str = String(num).trim();
  if (str === '-' || str === '') return '-';
  if (str.startsWith('DL')) return str;
  const match = str.match(/\d+/);
  if (match) {
    const digits = match[0].padStart(5, '0');
    return `DL${digits}`;
  }
  return `DL${str.padStart(5, '0')}`;
};
