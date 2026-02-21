const PREFIX = 'endfield-tools';

export function save(tool, key, data) {
  try {
    localStorage.setItem(`${PREFIX}:${tool}:${key}`, JSON.stringify(data));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

export function load(tool, key, fallback = null) {
  try {
    const raw = localStorage.getItem(`${PREFIX}:${tool}:${key}`);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function remove(tool, key) {
  try {
    localStorage.removeItem(`${PREFIX}:${tool}:${key}`);
  } catch {
    // Silently fail
  }
}
