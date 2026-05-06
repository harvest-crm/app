"use client";

type Props = { name: string; pipelineSummary: string };

export function TodayGreeting({ name, pipelineSummary }: Props) {
  const now = new Date();
  const h = now.getHours();
  const greeting =
    h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
        {greeting}, {name}.
      </h1>
      <p className="mt-1 text-sm text-stone-400">{date}</p>
      {pipelineSummary && (
        <p className="mt-1 text-sm text-stone-500">{pipelineSummary}</p>
      )}
    </div>
  );
}
