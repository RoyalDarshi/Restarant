// Helper function to format large numbers
export const formatNumericValue = (value: any) => {
  const num = parseFloat(value);
  if (isNaN(num)) return value;

  if (Math.abs(num) >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + "B";
  }
  if (Math.abs(num) >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + "M";
  }
  return num.toFixed(2);
};
