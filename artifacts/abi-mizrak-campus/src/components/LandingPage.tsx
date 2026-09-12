export default function LandingPage() {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-[#F5F0E6]">
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold text-[#25423A]">
          Lycée Abi Mizrak
        </h1>
        <p className="mt-4 text-[#59706A]">Welcome to the digital campus.</p>
        <div className="mt-8">
          <a
            href="/sign-in"
            className="rounded-xl bg-[#216F58] px-6 py-3 font-bold text-white transition-colors hover:bg-[#1B5D4A]"
          >
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
