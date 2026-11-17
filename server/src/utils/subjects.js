export const SUBJECTS = [
  { title: "Cryptography", code: "CRYPTO" },
  { title: "Software Engineering", code: "SE" },
  { title: "Design and Analysis of Algorithms", code: "DAA" },
  { title: "AI for Cybersecurity", code: "AI-CS" },
];

export function findSubject(title, code) {
  const normalizedTitle = String(title || "").trim().toLowerCase();
  const normalizedCode = String(code || "").trim().toUpperCase();
  return SUBJECTS.find(
    (subject) => subject.title.toLowerCase() === normalizedTitle && subject.code === normalizedCode
  );
}
