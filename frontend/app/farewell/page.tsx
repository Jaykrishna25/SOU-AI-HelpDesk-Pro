"use client";
import Link from "next/link";

export default function Farewell() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="panel-solid rounded-2xl p-10 max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold gradient-text">Signed out</h1>
        <p className="text-sm opacity-65 mt-3">
          Your session has ended. Thank you for using SOU AI HelpDesk Pro.
        </p>
        <Link href="/login"
          className="inline-block mt-8 px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm transition-colors">
          Sign in again
        </Link>
        <div className="mt-4">
          <Link href="/" className="text-xs opacity-55 hover:opacity-100 underline">Back to home</Link>
        </div>
      </div>
    </main>
  );
}
