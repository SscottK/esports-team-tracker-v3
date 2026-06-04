export function parseUsernameList(text) {
  const items = text.split(/[\n,;\t]+/).map((item) => item.trim()).filter(Boolean);
  const seen = new Map();
  items.forEach((item) => {
    seen.set(item.toLowerCase(), item);
  });
  return [...seen.values()];
}
