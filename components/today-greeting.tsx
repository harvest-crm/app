"use client";

type Props = {
  name: string;
  openDealsCount: number;
  pipelineValueText: string;
  firstWorkspaceSlug?: string;
};

export function TodayGreeting({ name, openDealsCount, pipelineValueText, firstWorkspaceSlug }: Props) {
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
      <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "#0F2540" }}>
        {greeting}, {name}.
      </h1>
      <p className="mt-1 text-sm" style={{ color: "#3D5775" }}>{date}</p>

      {/* Pipeline summary / CTA */}
      <p className="mt-1 text-sm" style={{ color: "#3D5775" }}>
        {openDealsCount === 0 ? (
          <>
            No open deals yet
            {firstWorkspaceSlug && (
              <>
                {" — "}
                <a href={`/workspaces/${firstWorkspaceSlug}/deals`} style={{ color: "#1F8A8A" }}>
                  visit your workspace
                </a>
                {" to add one"}
              </>
            )}
            .
          </>
        ) : (
          pipelineValueText
        )}
      </p>
    </div>
  );
}
