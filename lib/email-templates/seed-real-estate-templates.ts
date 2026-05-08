import { db } from "@/lib/db";

export async function seedRealEstateEmailTemplates(params: {
  organizationId: string;
  workspaceId: string | null;
  userId: string;
}): Promise<{ templatesCreated: number }> {
  const { organizationId, workspaceId, userId } = params;

  const templates = [
    {
      name: "New Lead Welcome",
      description: "First-touch email for a fresh lead",
      appliesTo: "contact",
      sortOrder: 0,
      subject: "Great connecting, {{contact.firstName}}!",
      body: `Hi {{contact.firstName}},

Thanks for reaching out — I'm excited to help with your real estate journey.

A few things to get started:
- I'll be sending you a personalized market report for your area in the next day or two
- If you'd like to schedule a quick discovery call, just reply with a time that works
- Feel free to reach out anytime with questions: {{user.phone}} or {{user.email}}

Looking forward to working together.

{{user.firstName}}`,
    },
    {
      name: "Showing Follow-up",
      description: "Sent the same day after a property tour",
      appliesTo: "both",
      sortOrder: 1,
      subject: "Thanks for touring with me today",
      body: `Hi {{contact.firstName}},

Thank you for taking the time to view properties with me today. I hope the tour gave you a clearer sense of what you're looking for.

If you'd like to revisit any of the homes, schedule another showing, or talk through next steps, just let me know — I'm here whenever you're ready.

Talk soon,
{{user.firstName}}`,
    },
    {
      name: "Listing Just Hit Market",
      description: "Alert a buyer to a new listing matching their criteria",
      appliesTo: "contact",
      sortOrder: 2,
      subject: "New listing you might love",
      body: `Hi {{contact.firstName}},

A new property just came on the market that matches what you've been looking for. Wanted to send it over before it gets too much attention.

Would you like to schedule a showing this week? These move fast, so the sooner the better.

Reply or give me a call: {{user.phone}}

{{user.firstName}}`,
    },
    {
      name: "Price Reduction Alert",
      description: "Notify a buyer about a price drop on a watched property",
      appliesTo: "contact",
      sortOrder: 3,
      subject: "Price reduction on a property you were watching",
      body: `Hi {{contact.firstName}},

Quick heads up — one of the properties you were considering just had a price reduction. Worth taking a second look?

Happy to set up another showing or pull updated comps. Just say the word.

{{user.firstName}}`,
    },
    {
      name: "Closing Day Congratulations",
      description: "Sent on closing day to a buyer or seller",
      appliesTo: "deal",
      sortOrder: 4,
      subject: "Congratulations, {{contact.firstName}}!",
      body: `{{contact.firstName}},

Today is the day! Congratulations on closing — it's been a pleasure working with you through the entire process.

A few quick things:
- Save my number: {{user.phone}}. I'm here for any questions, recommendations, or future real estate needs
- I'll be checking in a few months to make sure everything is going smoothly
- If you know anyone else who could use my help, your referrals are the highest compliment

Wishing you all the best in your new chapter.

{{user.firstName}}`,
    },
    {
      name: "Anniversary Check-in",
      description: "Yearly anniversary email for past clients",
      appliesTo: "contact",
      sortOrder: 5,
      subject: "Happy anniversary in your home, {{contact.firstName}}!",
      body: `Hi {{contact.firstName}},

It's been a year since you closed on your home — hard to believe! I hope it's been a great chapter.

A few things I wanted to share:
- If you ever want an updated estimate of what your home is worth in today's market, I'm happy to put one together
- Know anyone thinking about buying or selling? Your referrals mean the world
- Just wanted to say thank you for trusting me with one of the biggest decisions of your life

Hope you and the family are doing well.

{{user.firstName}}`,
    },
  ];

  await db.emailTemplate.createMany({
    data: templates.map((t) => ({
      ...t,
      organizationId,
      workspaceId,
      createdBy: userId,
    })),
  });

  return { templatesCreated: templates.length };
}
