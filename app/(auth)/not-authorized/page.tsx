export default function NotAuthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 text-center">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Not authorized</h1>
        <p className="text-zinc-600">This deploy is restricted to the owner.</p>
      </div>
    </main>
  );
}
