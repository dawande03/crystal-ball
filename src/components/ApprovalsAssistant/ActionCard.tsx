"use client";

type ActionCardProps = {
  title: string;
  subtitle: string;
  icon: string;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
};

export function ActionCard({
  title,
  subtitle,
  icon,
  disabled,
  active,
  onClick,
}: ActionCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition",
        active
          ? "border-cyan-400/60 bg-cyan-500/10"
          : "border-white/10 bg-white/5 hover:border-cyan-400/40 hover:bg-white/10",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        aria-hidden
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-semibold text-cyan-300"
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-50">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-slate-400">
          {subtitle}
        </span>
      </span>
    </button>
  );
}
