// Convert Image file to ObjecUrl
export const imageFileToObjectUrl = (file: File) => {
  if (file) {
    const objectUrl = URL.createObjectURL(file);
    return objectUrl;
  }
  return "https://placehold.co/120"; // Return placeholder by default
};
