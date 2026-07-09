// app/print/layout.tsx
// V5.3 — print/PDF views deliberately use a clean LIGHT theme, independent of the app's
// persistent dark theme (better for actual printing/ink, and reads better as an offline
// document). The root layout's globals.css sets a dark body background; this wrapper
// overrides it for everything under /print.

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-white text-neutral-900" style={{ colorScheme: "light" }}>
      {children}
    </div>
  );
}
