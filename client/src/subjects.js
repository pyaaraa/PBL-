export const SUBJECTS = [
  { title: "Cryptography", code: "CRYPTO" },
  { title: "Software Engineering", code: "SE" },
  { title: "Design and Analysis of Algorithms", code: "DAA" },
  { title: "AI for Cybersecurity", code: "AI-CS" },
];

export function subjectForTitle(title) {
  return SUBJECTS.find((subject) => subject.title === title);
}
