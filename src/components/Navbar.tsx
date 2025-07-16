import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <nav className="w-full flex items-center justify-between pt-[32px] pb-2 px-6 bg-white">
      {/* Logo */}
      <Link href="/">
        <Image
          src="/assets/unlazy-logomark.png" 
          alt="Unlazy Logo"
          width={30}
          height={30}
        />
      </Link>
      {/* CTA Button */}
      <Button
        asChild
        size="sm"
        className="rounded-full bg-[var(--brand-green)] hover:bg-[color-mix(in_srgb,var(--brand-green),#000_15%)] text-white px-4 py-3 text-sm font-normal shadow group transition-all duration-200"
      >
        <Link href="/write">
          <span>Start Writing</span>
        </Link>
      </Button>
    </nav>
  );
} 