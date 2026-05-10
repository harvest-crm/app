import type { Metadata } from "next"
export const metadata: Metadata = { title: "Contact" }

import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import {
  IconPhone,
  IconMessage,
  IconMail,
  IconCalendar,
  IconMapPin,
  IconSparkles,
  IconHistory,
  IconHome,
  IconMicrophone,
  IconMailOpened,
  IconNote,
  IconArrowRight,
  IconCheck,
  IconActivity,
} from "@tabler/icons-react"
import { Avatar } from "@/components/ui/avatar"
import { Pill } from "@/components/ui/pill"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { buildLookingForDisplay, formatCurrency } from "@/lib/format"
import { LifecycleStage } from "@/app/generated/prisma/client"
import { messageIsReady } from "@/lib/insights/constants"

// ── Types ──────────────────────────────────────────────────────────────────

type Stage = LifecycleStage

interface DisplayActivity {
  id: string
  type: string
  title: string
  body: string
  occurredAt: Date
}

// ── Helpers ────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<Stage, string> = {
  LEAD:          "Lead",
  WORKING:       "Working",
  ACTIVE_BUYER:  "Active buyer",
  ACTIVE_SELLER: "Active seller",
  PAST_CLIENT:   "Past client",
  SPHERE:        "Sphere",
  INACTIVE:      "Inactive",
  TRASH:         "Trash",
}

function pillVariantForStage(stage: Stage) {
  switch (stage) {
    case "LEAD":          return "info"
    case "WORKING":       return "info"
    case "ACTIVE_BUYER":  return "gold"
    case "ACTIVE_SELLER": return "gold"
    case "PAST_CLIENT":   return "purple"
    case "SPHERE":        return "pink"
    case "INACTIVE":      return "default"
    case "TRASH":         return "default"
    default: {
      const _exhaustive: never = stage
      void _exhaustive
      return "default"
    }
  }
}

function activityIconProps(type: string): {
  icon: React.ComponentType<{ size?: number; className?: string }>
  bg: string
  fg: string
} {
  switch (type) {
    case "voice_note":    return { icon: IconMicrophone,  bg: "bg-brand-gold-tint", fg: "text-brand-gold" }
    case "email":
    case "email_opened":  return { icon: IconMailOpened,  bg: "bg-ink-100", fg: "text-ink-500" }
    case "call":          return { icon: IconPhone,        bg: "bg-ink-100", fg: "text-ink-500" }
    case "sms":           return { icon: IconMessage,      bg: "bg-ink-100", fg: "text-ink-500" }
    case "note":          return { icon: IconNote,         bg: "bg-ink-100", fg: "text-ink-500" }
    case "stage_change":  return { icon: IconArrowRight,   bg: "bg-ink-100", fg: "text-ink-500" }
    case "task_completed":return { icon: IconCheck,        bg: "bg-ink-100", fg: "text-ink-500" }
    case "showing":       return { icon: IconHome,         bg: "bg-ink-100", fg: "text-ink-500" }
    default:              return { icon: IconActivity,     bg: "bg-ink-100", fg: "text-ink-500" }
  }
}

function activityTitle(type: string): string {
  switch (type) {
    case "voice_note":   return "Voice note"
    case "email":        return "Email sent"
    case "email_opened": return "Email opened"
    case "call":         return "Call"
    case "sms":          return "Text sent"
    case "note":         return "Note"
    case "showing":        return "Showing"
    case "stage_change":   return "Stage change"
    case "task_completed": return "Task completed"
    default:               return "Activity"
  }
}

function formatRelative(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7)  return `${days}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatDate(date: Date | null): string {
  if (!date) return "—"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}


// ── Mock data for fields not yet in schema ─────────────────────────────────

const MOCK_ACTIVITIES: DisplayActivity[] = [
  {
    id: "m1",
    type: "voice_note",
    title: "Voice note",
    body: "Focused on Memorial — large backyard, 3-car garage minimum. Approval through CrossCountry at $900K. Wants to see listings by end of month.",
    occurredAt: new Date("2026-04-27T14:22:00"),
  },
  {
    id: "m2",
    type: "email_opened",
    title: "Email opened",
    body: `Opened "New listings in Memorial — this week's picks"`,
    occurredAt: new Date("2026-04-22T09:14:00"),
  },
  {
    id: "m3",
    type: "call",
    title: "Outbound call · 4m 12s",
    body: "Discussed timeline, confirmed pre-approval is still active, scheduled Saturday showing.",
    occurredAt: new Date("2026-04-18T11:30:00"),
  },
]

// ── Page ───────────────────────────────────────────────────────────────────

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { orgId: clerkOrgId } = await auth()
  const { id } = await params
  if (!clerkOrgId) return null

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  })
  if (!org) return null

  const [contact, rawActivities, latestInsight] = await Promise.all([
    db.contact.findFirst({
      where: { id, organizationId: org.id },
      include: {
        contactTags: { include: { tag: true } },
        buyerProfile: true,
      },
    }),
    db.activity.findMany({
      where: { contactId: id, organizationId: org.id },
      orderBy: { occurredAt: "desc" },
      take: 5,
    }),
    db.aiInsight.findFirst({
      where: { contactId: id, organizationId: org.id, status: "PENDING" },
      orderBy: [{ priority: "asc" }, { generatedAt: "desc" }],
    }),
  ])

  if (!contact) notFound()

  const tags = contact.contactTags.map((ct) => ct.tag.name)
  const stage: Stage = contact.lifecycleStage
  const city = [contact.city, contact.state].filter(Boolean).join(", ") || null
  // Use DB-cached value first; fall back to most recent activity timestamp
  const lastContactAt = contact.lastContactAt ?? rawActivities[0]?.occurredAt ?? null
  const buyerProfile = contact.buyerProfile
  const aiInsight = latestInsight
  const pipelineEnteredAt = contact.pipelineEnteredAt
  const lifetimeVolumeCents = contact.lifetimeVolumeCents

  const displayActivities: DisplayActivity[] =
    rawActivities.length > 0
      ? rawActivities.map((a) => ({
          id: a.id,
          type: a.type,
          title: activityTitle(a.type),
          body: a.body,
          occurredAt: a.occurredAt,
        }))
      : MOCK_ACTIVITIES

  return (
    <div className="max-w-[720px] mx-auto p-6 space-y-4">

      {/* 3.1 Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <Avatar firstName={contact.firstName} lastName={contact.lastName} size="lg" />
        <div className="flex-1 min-w-0">
          <h2 className="text-[18px] font-medium text-ink-900 leading-snug">
            {contact.firstName} {contact.lastName}
          </h2>
          <div className="flex items-center flex-wrap gap-1.5 mt-2">
            <Pill variant={pillVariantForStage(stage)}>
              {STAGE_LABELS[stage]}
            </Pill>
            {tags.map((tag) => (
              <Pill key={tag}>{tag}</Pill>
            ))}
          </div>
          <div className="flex items-center gap-3.5 mt-2.5">
            {city && (
              <span className="flex items-center gap-1 text-[13px] text-ink-500">
                <IconMapPin size={14} />
                {city}
              </span>
            )}
            {contact.phone && (
              <span className="flex items-center gap-1 text-[13px] text-ink-500">
                <IconPhone size={14} />
                {contact.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3.2 Quick actions ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        <Button variant="primary" className="w-full justify-center gap-1.5 rounded-btn-lg text-xs h-8">
          <IconPhone size={16} />
          Call
        </Button>
        <Button variant="crm-secondary" className="w-full justify-center gap-1.5 rounded-btn-lg text-xs h-8">
          <IconMessage size={16} />
          Text
        </Button>
        <Button variant="crm-secondary" className="w-full justify-center gap-1.5 rounded-btn-lg text-xs h-8">
          <IconMail size={16} />
          Email
        </Button>
        <Button variant="crm-secondary" className="w-full justify-center gap-1.5 rounded-btn-lg text-xs h-8">
          <IconCalendar size={16} />
          Schedule
        </Button>
      </div>

      {/* 3.3 AI insight — only rendered when a PENDING insight exists */}
      {aiInsight && (
        <div className="bg-brand-gold-tint-light border border-brand-gold-border rounded-card p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <IconSparkles size={16} className="text-brand-gold shrink-0" />
            <span className="text-[12px] font-medium text-brand-gold">AI insight</span>
          </div>
          <p className="text-[14px] text-ink-900 leading-relaxed mb-3">
            {aiInsight.reason}
          </p>
          {messageIsReady(aiInsight.suggestedMessage) && (
            <div className="bg-white border border-brand-gold-border rounded-card-sm p-3 mb-3">
              <p className="text-[13px] text-ink-500 leading-relaxed">
                {aiInsight.suggestedMessage}
              </p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button variant="gold" className="rounded-btn h-7 px-3 text-xs gap-1.5">
              Send
            </Button>
            <Button variant="ghost" className="text-brand-gold hover:text-brand-gold hover:bg-transparent h-7 px-3 text-xs">
              Edit
            </Button>
          </div>
        </div>
      )}

      {/* 3.4 Stats grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          {
            label: "Last contact",
            value: lastContactAt ? formatRelative(lastContactAt) : "—",
          },
          {
            label: "Lead source",
            value: contact.source ?? "—",
          },
          {
            label: "Lifetime volume",
            value: formatCurrency(lifetimeVolumeCents ? Number(lifetimeVolumeCents) / 100 : null),
          },
          {
            label: "In pipeline",
            value: pipelineEnteredAt
              ? Math.floor((Date.now() - pipelineEnteredAt.getTime()) / 86_400_000) + " days"
              : "—",
          },
        ].map((stat) => (
          <Card key={stat.label} padding="p-3">
            <div className="text-[11px] text-ink-500 leading-none mb-1.5">{stat.label}</div>
            <div className="text-[16px] font-medium text-ink-900 leading-none">{stat.value}</div>
          </Card>
        ))}
      </div>

      {/* 3.5 Buyer profile — only rendered when profile exists */}
      {buyerProfile && (
        <Card>
          <div className="flex items-center gap-1.5 mb-3">
            <IconHome size={16} className="text-ink-500 shrink-0" />
            <span className="text-[12px] font-medium text-ink-500">Buyer profile</span>
          </div>
          <table className="w-full text-[13px]">
            <tbody>
              <tr className="border-t border-ink-100">
                <td className="w-[110px] py-[5px] text-ink-500 align-top">Looking for</td>
                <td className="py-[5px] text-ink-900">
                  {buildLookingForDisplay(buyerProfile) ?? "—"}
                </td>
              </tr>
              <tr className="border-t border-ink-100">
                <td className="w-[110px] py-[5px] text-ink-500 align-middle">Pre-approved</td>
                <td className="py-[5px] text-ink-900">
                  <span className="flex items-center gap-1.5">
                    {buyerProfile.preApproved && (
                      <span className="inline-block w-2 h-2 rounded-full bg-success shrink-0" />
                    )}
                    {buyerProfile.preApproved ? "Yes" : "No"}
                  </span>
                </td>
              </tr>
              <tr className="border-t border-ink-100">
                <td className="w-[110px] py-[5px] text-ink-500">Timeline</td>
                <td className="py-[5px] text-ink-900">{buyerProfile.timelineLabel ?? "—"}</td>
              </tr>
              <tr className="border-t border-ink-100">
                <td className="w-[110px] py-[5px] text-ink-500">Anniversary</td>
                <td className="py-[5px] text-ink-900">
                  {formatDate(buyerProfile.currentHomeClosingDate ?? null)}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {/* 3.6 Activity timeline ───────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center gap-1.5 mb-4">
          <IconHistory size={16} className="text-ink-500 shrink-0" />
          <span className="text-[12px] font-medium text-ink-500">Recent activity</span>
        </div>
        <div className="space-y-[14px]">
          {displayActivities.map((activity) => {
            const { icon: ActivityIcon, bg, fg } = activityIconProps(activity.type)
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
                  <ActivityIcon size={14} className={fg} />
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[13px] font-medium text-ink-900 truncate">
                      {activity.title}
                    </span>
                    <span className="text-[11px] text-ink-400 shrink-0">
                      {formatRelative(activity.occurredAt)}
                    </span>
                  </div>
                  <p className="text-[13px] text-ink-500 leading-relaxed">
                    {activity.body}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

    </div>
  )
}
