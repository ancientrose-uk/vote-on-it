export function shaEncryptPassword(password: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  return crypto.subtle.digest("SHA-256", data).then((hash) => {
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  });
}
