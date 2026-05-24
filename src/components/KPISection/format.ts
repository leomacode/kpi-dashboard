// Number formatting shared by row + modal: en-US locale with grouping,
// 1 fractional digit only when the value is non-integer.
export const formatValue = (val: number): string =>
  val.toLocaleString("en-US", {
    minimumFractionDigits: val % 1 === 0 ? 0 : 1,
    maximumFractionDigits: val % 1 === 0 ? 0 : 1,
  });
