const numericDdcCodePattern = /^\d{3}(?:\.\d+)?$/;
const institutionalDdcCodePattern = /^[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*-\d+(?:\.\d+)?$/;

/** Accept standard numeric DDC codes and institution-specific codes such as Pra-04. */
export const isValidDdcCode = (value: string): boolean => {
  const code = value.trim();
  return numericDdcCodePattern.test(code) || institutionalDdcCodePattern.test(code);
};
