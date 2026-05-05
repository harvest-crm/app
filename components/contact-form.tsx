"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import type { Contact } from "@/app/generated/prisma/client";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
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
};

export function ContactForm({ contact }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: contact?.firstName ?? "",
      lastName: contact?.lastName ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      source: contact?.source ?? "",
      sourceDetail: contact?.sourceDetail ?? "",
      temperature: (contact?.temperature as FormValues["temperature"]) ?? "warm",
      notes: contact?.notes ?? "",
      birthday: contact?.birthday ? new Date(contact.birthday).toISOString().split("T")[0] : "",
      homeAnniversary: contact?.homeAnniversary
        ? new Date(contact.homeAnniversary).toISOString().split("T")[0]
        : "",
    },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (v != null) fd.set(k, String(v));
      });

      if (contact) {
        const result = await updateContact(contact.id, fd);
        if (!result?.error) router.push(`/contacts/${contact.id}`);
      } else {
        await createContact(fd);
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
          <Input id="phone" type="tel" {...register("phone")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="source">Source</Label>
          <Input id="source" {...register("source")} placeholder="Referral, Website, etc." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sourceDetail">Source Detail</Label>
          <Input id="sourceDetail" {...register("sourceDetail")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="birthday">Birthday</Label>
          <Input id="birthday" type="date" {...register("birthday")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="homeAnniversary">Home Anniversary</Label>
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
