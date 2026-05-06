"use client";

import { useState } from "react";
import { QuickLogActivity } from "@/components/quick-log-activity";
import { ActivityTimeline } from "@/components/activity-timeline";
import type { SerializedActivity } from "@/app/actions/activities";

type Props = {
  initialActivities: SerializedActivity[];
  contactId?: string;
  dealId?: string;
  workspaceId?: string;
};

export function ActivityFeed({
  initialActivities,
  contactId,
  dealId,
  workspaceId,
}: Props) {
  const [activities, setActivities] = useState<SerializedActivity[]>(initialActivities);

  return (
    <div className="space-y-4">
      <QuickLogActivity
        contactId={contactId}
        dealId={dealId}
        workspaceId={workspaceId}
        onCreated={(a) => setActivities((prev) => [a, ...prev])}
      />
      <ActivityTimeline
        activities={activities}
        onUpdated={(updated) =>
          setActivities((prev) =>
            prev.map((a) => (a.id === updated.id ? updated : a)),
          )
        }
        onDeleted={(id) =>
          setActivities((prev) => prev.filter((a) => a.id !== id))
        }
      />
    </div>
  );
}
