"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createContact, updateContact } from "@/app/actions/contacts";
import { formatPhone } from "@/lib/format";
import type { Contact, Workspace } from "@/app/generated/prisma/client";

const SOURCE_OPTIONS = [
  "Website",
  "Referral",
  "Open House",
  "Past Client",
  "Sphere",
  "Zillow",
  "Realtor.com",
  "HAR",
  "Cold Outreach",
  "Event",
  "Other",
] as const;


const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z
    .string()
    .refine(
      (v) => !v || v.replace(/\D/g, "").length === 10,
      "Phone must be 10 digits"
    )
    .optional()
    .or(z.literal("")),
  source: z.string().optional(),
  sourceDetail: z.string().optional(),
  temperature: z.enum(["hot", "warm", "cold"]),
  notes: z.string().optional(),
  birthday: z.string().optional(),
  homeAnniversary: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  contact?: Contact;
  workspaces?: Workspace[];
  defaultWorkspaceId?: string;
};

export function ContactForm({ contact, workspaces, defaultWorkspaceId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>(
    defaultWorkspaceId ? [defaultWorkspaceId] : []
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: contact?.firstName ?? "",
      lastName: contact?.lastName ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ? formatPhone(contact.phone) : "",
      source: contact?.source ?? "",
      sourceDetail: contact?.sourceDetail ?? "",
      temperature: (contact?.temperature as FormValues["temperature"]) ?? "warm",
      notes: contact?.notes ?? "",
      birthday: contact?.birthday
        ? new Date(contact.birthday).toISOString().split("T")[0]
        : "",
      homeAnniversary: contact?.homeAnniversary
        ? new Date(contact.homeAnniversary).toISOString().split("T")[0]
        : "",
    },
  });

  const sourceValue = watch("source") ?? "";

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (v != null) fd.set(k, String(v));
      });

      if (contact) {
        const result = await updateContact(contact.id, fd);
        if (result?.error) {
          toast.error("Failed to save contact");
        } else {
          toast.success("Contact saved");
          router.push(`/contacts/${contact.id}`);
        }
      } else {
        selectedWorkspaceIds.forEach((id) => fd.append("workspaceIds", id));
        const result = await createContact(fd);
        if (result && "id" in result) {
          toast.success("Contact created");
          router.push(`/contacts/${result.id}`);
        } else {
          toast.error("Failed to create contact");
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" {...register("firstName")} />
          {errors.firstName && (
            <p className="text-xs text-red-600">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" {...register("lastName")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && (
            <p className="text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="555-555-5555"
            value={watch("phone") ?? ""}
            onChange={(e) =>
              setValue("phone", formatPhone(e.target.value), { shouldValidate: true })
            }
          />
          {errors.phone && (
            <p className="text-xs text-red-600">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Source</Label>
        <Select
          value={sourceValue || undefined}
          onValueChange={(v) => {
            setValue("source", v ?? "");
            if (v !== "Other") setValue("sourceDetail", "");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a source..." />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sourceValue === "Other" && (
        <div className="space-y-1.5">
          <Label htmlFor="sourceDetail">Source Detail</Label>
          <Input
            id="sourceDetail"
            {...register("sourceDetail")}
            placeholder="Describe the source..."
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="birthday">Birthday</Label>
          <Input id="birthday" type="date" {...register("birthday")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="homeAnniversary">
            Home Anniversary{" "}
            <span className="font-normal text-[#3D5775]">(optional)</span>
          </Label>
          <Input id="homeAnniversary" type="date" {...register("homeAnniversary")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Temperature</Label>
        <Select
          value={watch("temperature")}
          onValueChange={(v) => setValue("temperature", v as FormValues["temperature"])}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={4} {...register("notes")} />
      </div>

      {!contact && workspaces && workspaces.length > 0 && (
        <div className="space-y-1.5">
          <Label>Assign to Workspaces</Label>
          <div className="space-y-2 rounded-md border border-[#E8DFC8] p-3">
            {workspaces.map((ws) => (
              <label
                key={ws.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedWorkspaceIds.includes(ws.id)}
                  onChange={(e) =>
                    setSelectedWorkspaceIds((prev) =>
                      e.target.checked
                        ? [...prev, ws.id]
                        : prev.filter((id) => id !== ws.id)
                    )
                  }
                  className="rounded border-[#E8DFC8]"
                />
                {ws.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : contact ? "Save Changes" : "Create Contact"}
        </Button>
        {contact && (
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
