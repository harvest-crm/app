export type RenderContext = {
  contact?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    fullName?: string;
  };
  deal?: {
    title?: string;
    value?: number | null;
  };
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
};

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function renderTemplate(
  template: { subject: string; body: string },
  ctx: RenderContext,
): { subject: string; body: string } {
  const vars: Record<string, string> = {
    "contact.firstName": ctx.contact?.firstName ?? "",
    "contact.lastName":  ctx.contact?.lastName  ?? "",
    "contact.fullName":  ctx.contact?.fullName  ?? `${ctx.contact?.firstName ?? ""} ${ctx.contact?.lastName ?? ""}`.trim(),
    "contact.email":     ctx.contact?.email     ?? "",
    "contact.phone":     ctx.contact?.phone     ?? "",
    "deal.title":        ctx.deal?.title        ?? "",
    "deal.value":        ctx.deal?.value != null ? fmtCurrency(ctx.deal.value) : "",
    "user.firstName":    ctx.user?.firstName    ?? "",
    "user.lastName":     ctx.user?.lastName     ?? "",
    "user.email":        ctx.user?.email        ?? "",
    "user.phone":        ctx.user?.phone        ?? "",
  };

  function replace(text: string): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, key: string) => {
      const trimmed = key.trim();
      return trimmed in vars ? vars[trimmed] : match;
    });
  }

  return {
    subject: replace(template.subject),
    body:    replace(template.body),
  };
}

// Build a mock context for live preview in the editor
export function mockRenderContext(userFirstName?: string, userLastName?: string, userEmail?: string): RenderContext {
  return {
    contact: { firstName: "John", lastName: "Smith", email: "john@example.com", phone: "(555) 867-5309" },
    deal:    { title: "123 Oak Street", value: 485000 },
    user:    {
      firstName: userFirstName ?? "Agent",
      lastName:  userLastName  ?? "Name",
      email:     userEmail     ?? "agent@example.com",
      phone:     "(555) 555-0100",
    },
  };
}
