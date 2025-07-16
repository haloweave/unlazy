import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full flex flex-col items-center justify-between pt-0 pb-2 px-4 bg-white">
      {/* Logo Row */}
      <div className="flex flex-row items-start justify-between w-full mb-4">
        <div className="mb-2 flex flex-col items-start justify-center w-1/3">
          <Image
            src="/assets/unlazy-logo.png"
            alt="Unlazy Logo"
            width={134}
            height={30}
          />
          <span className="text-xs text-gray-600">
            Built to Assist, Not to Write.
          </span>
        </div>
        {/* placeholder footer menu items */}
        {/* <div className="flex flex-row items-center justify-center w-1/3 gap-4">
          <span className="text-sm font-light text-black/80">How it works</span>
          <span className="text-sm font-light text-black/80">Features</span>
          <span className="text-sm font-base text-black/80">
            Start writing
          </span>
        </div> */}
        <div className="flex flex-row items-center justify-end w-1/3 gap-2">
          <span className="text-xs text-black/80">Connect with us:</span>
          <Image
            src="/assets/ph-logo.png"
            alt="product hunt logo"
            width={16}
            height={16}
          />
          <Image
            src="/assets/x-logo.png"
            alt="x logo"
            width={16}
            height={16}
          />
        </div>
      </div>

      {/* Copyright Row */}
      <div className="flex flex-row items-center justify-between w-full">
        <p className="text-xs text-gray-500 w-1/3"><span>Powered by </span><span className="font-semibold">Haloweave </span><span>- Your AI Product Partner</span></p>
        <div className="flex flex-row items-center justify-center w-1/3 gap-4">
            <span className="text-xs text-gray-500">Privacy Policy</span>
            <span className="text-xs text-gray-500">Terms of Service</span>
        </div>
        <span className="text-xs text-gray-500 w-1/3 flex justify-end">
          © 2025 unlazywritr. All Rights Reserved
        </span>
      </div>
    </footer>
  );
}
