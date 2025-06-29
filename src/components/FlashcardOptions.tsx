import { useState } from "react";

interface Option {
  label: string;
  text: string;
  correct: boolean;
}

interface FlashcardOptionsProps {
  options: Option[];
  onSelect: (label: string, text: string) => void;
  sessionId: string;
}

export default function FlashcardOptions({ options, onSelect, sessionId }: FlashcardOptionsProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleCardClick = (option: Option) => {
    if (selected) return;
    setSelected(option.label);
    onSelect(option.label, option.text);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-4">
        {options.map((option) => (
          <button
            key={option.label}
            disabled={!!selected}
            onClick={() => handleCardClick(option)}
            className={`flex-1 rounded-2xl px-6 py-5 shadow-md border transition-all duration-200 text-left
              ${selected === option.label ?
                "bg-indigo-600 text-white border-indigo-700 scale-105" :
                "bg-white text-gray-900 border-gray-200 hover:bg-indigo-50 hover:scale-105"}
              ${selected && selected !== option.label ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <span className="block text-lg font-semibold mb-1">{option.label}</span>
            <span className="block text-base">{option.text}</span>
          </button>
        ))}
      </div>
      {selected && (
        <div className="w-full flex flex-col items-center mt-2">
          <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-indigo-600 text-white mb-2">
            <span className="font-semibold">You:</span> {options.find(o => o.label === selected)?.text}
          </div>
        </div>
      )}
    </div>
  );
} 