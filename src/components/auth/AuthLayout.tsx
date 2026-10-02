import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="w-full max-w-5xl min-h-[580px] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto py-6">
      {/* Left Hero Panel */}
      <div className="lg:col-span-6 bg-[var(--hero)] text-[var(--hero-text)] rounded-[28px] p-8 lg:p-12 flex flex-col justify-between min-h-[360px] lg:min-h-[560px]">
        <div>
          {/* Logo Tile: 34px rounded square in lime */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-[34px] h-[34px] rounded-lg bg-[var(--lime)] text-[var(--on-lime)] flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              M
            </div>
            <span className="font-bold text-lg text-[var(--hero-text)] tracking-tight">MealPrep</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-semibold tracking-[-0.03em] leading-tight text-[var(--hero-text)]">
            Plan the week.
            <br />
            Eat on target.
          </h2>
          <p className="mt-3 text-sm text-[var(--hero-muted)] max-w-sm leading-relaxed">
            Personal meal planning with automated macro tracking, local AI recipe parsing, and smart grocery checklists.
          </p>
        </div>

        {/* 3 Lime-dot Feature Lines */}
        <div className="mt-8 pt-8 border-t border-[var(--hero-track)] space-y-3.5">
          <div className="flex items-center space-x-3 text-sm text-[var(--hero-text)]">
            <span className="w-2 h-2 rounded-full bg-[var(--lime)] shrink-0" />
            <span>Target daily calories, protein, carbs &amp; fat</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-[var(--hero-text)]">
            <span className="w-2 h-2 rounded-full bg-[var(--lime)] shrink-0" />
            <span>AI recipe extraction from links &amp; photos</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-[var(--hero-text)]">
            <span className="w-2 h-2 rounded-full bg-[var(--lime)] shrink-0" />
            <span>Batch cook prep workflows &amp; smart grocery lists</span>
          </div>
        </div>
      </div>

      {/* Right Form Area */}
      <div className="lg:col-span-6 w-full flex items-center justify-center">
        <div className="w-full max-w-[400px] mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
