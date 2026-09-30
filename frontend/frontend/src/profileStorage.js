const PROFILE_STORAGE_KEY = "attendance.studentProfile";

const DEFAULT_PROFILE = {
  campus: "",
  branch: "",
  section: "",
  registrationNumber: "",
  walletAddress: "",
};

export function loadStudentProfile() {
  if (typeof window === "undefined") {
    return DEFAULT_PROFILE;
  }

  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveStudentProfile(profile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    PROFILE_STORAGE_KEY,
    JSON.stringify({ ...DEFAULT_PROFILE, ...profile })
  );
}
