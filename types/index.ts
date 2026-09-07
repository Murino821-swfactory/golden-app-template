export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date | null;
}

export interface DemoConfig {
  slug: string;
  pattern: string;
  palette: string;
  style: string;
  sections: string[];
  locales: string[];
}
