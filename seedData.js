// Synthetic demo dataset for the PA Desk prototype.
// Every person, company, email address and message below is fictional,
// invented only to demonstrate the product. No real data is used.

export const DEMO_USERS = [
  { name: 'Riya Sharma (Demo Assistant)', email: 'assistant@padesk.demo', password: 'demo1234', role: 'assistant' }
];

export const DEMO_CONNECTIONS = [
  { provider: 'gmail', email: 'arjun.mehta.demo@gmail.com', clientName: 'Arjun Mehta', status: 'connected', simulated: true },
  { provider: 'outlook', email: 'sara.kapoor.demo@outlook.com', clientName: 'Sara Kapoor', status: 'connected', simulated: true }
];

const M = (from, fromName, body, daysAgo, hour = 10) => ({
  from, fromName, body,
  at: new Date(Date.now() - daysAgo * 86400000 - (24 - hour) * 3600000).toISOString()
});

// direction is derived: messages from the client's own connected address count as outbound.
export const SEED_CONVERSATIONS = [
  // ---- Client: Arjun Mehta (Gmail, simulated) ----
  {
    key: 'a01', client: 'Arjun Mehta', accountEmail: 'arjun.mehta.demo@gmail.com',
    from: { name: 'Priya Nair', email: 'priya@brightlinestudio.example' },
    subject: "Rescheduling Thursday's brand review",
    messages: [
      M('priya@brightlinestudio.example', 'Priya Nair', "Hi Riya, could we move Thursday's brand review to early next week? Our designer is out on Thursday and I'd rather have her in the room. Any 45-minute slot Monday or Tuesday works for us.", 1, 9),
      M('assistant@padesk.demo', 'Riya Sharma (Demo Assistant)', "Hi Priya, thanks for the heads up. Let me check Arjun's calendar and come back with a slot.", 1, 11),
      M('priya@brightlinestudio.example', 'Priya Nair', "Perfect, thank you! Monday afternoon would be ideal if that's possible.", 0, 8)
    ]
  },
  {
    key: 'a02', client: 'Arjun Mehta', accountEmail: 'arjun.mehta.demo@gmail.com',
    from: { name: 'Rohan Verma', email: 'rohan@northwindcap.example' },
    subject: 'Term sheet - your sign-off needed',
    messages: [
      M('rohan@northwindcap.example', 'Rohan Verma', "Hi Arjun, attaching the revised term sheet for the seed round. The valuation is unchanged but we've added a pro-rata clause in section 5. This needs your personal sign-off before Friday 20 November so we can circulate to the other investors. Happy to walk you through the changes on a call if useful.", 2, 14),
      M('rohan@northwindcap.example', 'Rohan Verma', "Gentle nudge - the other funds are holding their allocations until you approve. Let me know your decision.", 0, 9)
    ]
  },
  {
    key: 'a03', client: 'Arjun Mehta', accountEmail: 'arjun.mehta.demo@gmail.com',
    from: { name: 'Product Weekly', email: 'digest@productweekly.example' },
    subject: 'Product Weekly Digest #214: onboarding teardowns',
    messages: [
      M('digest@productweekly.example', 'Product Weekly', "Your weekly roundup of product thinking. This week: onboarding teardowns, pricing page patterns and an interview with a growth lead. View in browser | Unsubscribe", 1, 6)
    ]
  },
  {
    key: 'a04', client: 'Arjun Mehta', accountEmail: 'arjun.mehta.demo@gmail.com',
    from: { name: 'Kavya Iyer', email: 'kavya@evently.example' },
    subject: 'Speaker slot confirmation - Demo Day, 3 December',
    messages: [
      M('kavya@evently.example', 'Kavya Iyer', "Hello! We're thrilled to confirm Arjun for a 12-minute keynote slot at Demo Day on 3 December at 4:30 PM, followed by a short Q&A. Could you confirm AV requirements and whether he'll join the speaker dinner the evening before? Please also send a high-res headshot by 25 November.", 3, 12),
      M('assistant@padesk.demo', 'Riya Sharma (Demo Assistant)', "Hi Kavya, confirming receipt - I'll get the AV details and headshot over to you well before 25 November.", 3, 15),
      M('kavya@evently.example', 'Kavya Iyer', "Wonderful, thank you! One more thing - we can hold a rehearsal slot on 1 December at 11:00 AM if he'd like a run-through.", 0, 7)
    ]
  },
  {
    key: 'a05', client: 'Arjun Mehta', accountEmail: 'arjun.mehta.demo@gmail.com',
    from: { name: 'Vikram Sethi', email: 'vikram@sethilaw.example' },
    subject: 'Consulting agreement - clause 4.2 needs your decision',
    messages: [
      M('vikram@sethilaw.example', 'Vikram Sethi', "Arjun, the counterparty has pushed back on the liability cap in clause 4.2 of the consulting agreement. There are two workable options and the trade-off is a business decision, not a legal one, so I need your call before I respond. I've summarised both options in two bullet points. This is sensitive - please review personally.", 1, 16)
    ]
  },
  {
    key: 'a06', client: 'Arjun Mehta', accountEmail: 'arjun.mehta.demo@gmail.com',
    from: { name: 'MakeFly Travel', email: 'bookings@makefly.example' },
    subject: 'Booking confirmation - BLR to BOM, 24 November',
    messages: [
      M('bookings@makefly.example', 'MakeFly Travel', "Your booking is confirmed. Flight MF 204, Bengaluru (BLR) to Mumbai (BOM), departing 24 November at 07:40, arriving 09:25. Booking reference MF92XK. This is an automated confirmation, please do not reply.", 2, 18)
    ]
  },
  {
    key: 'a07', client: 'Arjun Mehta', accountEmail: 'arjun.mehta.demo@gmail.com',
    from: { name: 'Karan Malhotra', email: 'karan@bluepeak.example' },
    subject: 'Re: Investor intro - next steps',
    messages: [
      M('arjun.mehta.demo@gmail.com', 'Arjun Mehta', "Hi Karan, thanks for the intro last week. Sharing our deck and a short metrics summary. Would love to find 30 minutes to walk you through the roadmap.", 6, 10),
      M('karan@bluepeak.example', 'Karan Malhotra', "Thanks Arjun - deck received. I'm travelling this week; will revert with times early next week.", 5, 13),
      M('arjun.mehta.demo@gmail.com', 'Arjun Mehta', "Sounds good, Karan. I'll wait to hear from you.", 5, 14)
    ]
  },
  {
    key: 'a08', client: 'Arjun Mehta', accountEmail: 'arjun.mehta.demo@gmail.com',
    from: { name: 'Neha Gupta', email: 'neha@talentbridge.example' },
    subject: 'Shortlist ready - ops lead interviews',
    messages: [
      M('neha@talentbridge.example', 'Neha Gupta', "Hi Riya, we've shortlisted four candidates for the operations lead role. Could you coordinate first-round interviews next week? Each candidate has shared their availability in the attached sheet - we just need 40-minute slots booked against Arjun's calendar and calendar invites sent out.", 1, 10)
    ]
  },
  {
    key: 'a09', client: 'Arjun Mehta', accountEmail: 'arjun.mehta.demo@gmail.com',
    from: { name: 'Amit Shah', email: 'amit@cloudkitchenpartners.example' },
    subject: 'Partnership proposal - scheduling and equity question',
    messages: [
      M('amit@cloudkitchenpartners.example', 'Amit Shah', "Hi Arjun, two things. First, the easy one: your team can pick any slot for the ops walkthrough, my calendar is open all week. Second, the equity split in the partnership draft - 70/30 versus 75/25 - is something I'd only like to discuss with you personally before our boards meet. No rush on the visit, but the split decision is time-sensitive.", 0, 13)
    ]
  },
  {
    key: 'a10', client: 'Arjun Mehta', accountEmail: 'arjun.mehta.demo@gmail.com',
    from: { name: 'Axis Bank Alerts', email: 'alerts@axisbank.example' },
    subject: 'Your October account statement is ready',
    messages: [
      M('alerts@axisbank.example', 'Axis Bank Alerts', "Dear customer, your account statement for October is now available in internet banking. This is an auto-generated alert. Please do not reply to this email.", 4, 5)
    ]
  },
  {
    key: 'a11', client: 'Arjun Mehta', accountEmail: 'arjun.mehta.demo@gmail.com',
    from: { name: 'Deepak Rao', email: 'deepak@raoaccounting.example' },
    subject: 'GST filing - documents checklist',
    messages: [
      M('deepak@raoaccounting.example', 'Deepak Rao', "Hi Riya, for this quarter's GST filing could you pull together the September and October sales registers and the vendor invoices folder? Routine filing, due 20 November. Once you share the documents I'll take it from there.", 2, 11)
    ]
  },
  {
    key: 'a12', client: 'Arjun Mehta', accountEmail: 'arjun.mehta.demo@gmail.com',
    from: { name: 'Ananya Iyer', email: 'ananya@mehtaventures.example' },
    subject: 'Q4 budget draft - waiting on vendor numbers',
    messages: [
      M('ananya@mehtaventures.example', 'Ananya Iyer', "Hi Arjun, the Q4 budget draft is ready for review. I'm still waiting on the revised quote from the infra vendor, which you said you'd chase. Once that lands I can close the draft.", 3, 9),
      M('arjun.mehta.demo@gmail.com', 'Arjun Mehta', "Thanks Ananya. I've asked the vendor again today and will forward the quote as soon as it arrives.", 3, 10)
    ]
  },
  // ---- Client: Sara Kapoor (Outlook, simulated) ----
  {
    key: 's01', client: 'Sara Kapoor', accountEmail: 'sara.kapoor.demo@outlook.com',
    from: { name: 'Meera Joshi', email: 'meera@joshimedia.example' },
    subject: 'Final invoice for October retainer - approval needed',
    messages: [
      M('meera@joshimedia.example', 'Meera Joshi', "Hi Sara, attaching the final invoice for the October retainer - it includes the two extra revisions we agreed on 28 October, so the total is higher than the standard month. Could you review and approve it personally before I submit to your accounts team? Payment terms are 15 days.", 1, 15)
    ]
  },
  {
    key: 's02', client: 'Sara Kapoor', accountEmail: 'sara.kapoor.demo@outlook.com',
    from: { name: 'Tarun Bhalla', email: 'tarun@bhallaconsulting.example' },
    subject: 'Move our weekly sync to Tuesday 3 PM?',
    messages: [
      M('tarun@bhallaconsulting.example', 'Tarun Bhalla', "Hi, my Thursday mornings have become impossible. Could we move our weekly sync to Tuesday at 3 PM starting next week? If Tuesday is bad, any afternoon midweek works.", 1, 8)
    ]
  },
  {
    key: 's03', client: 'Sara Kapoor', accountEmail: 'sara.kapoor.demo@outlook.com',
    from: { name: 'Webinarly', email: 'events@webinarly.example' },
    subject: 'Reminder: your webinar registration for 19 November',
    messages: [
      M('events@webinarly.example', 'Webinarly', "You're registered for 'Pricing Strategies for Independent Consultants' on 19 November at 6:00 PM IST. Add to calendar | This is an automated reminder, please do not reply. Unsubscribe", 2, 7)
    ]
  },
  {
    key: 's04', client: 'Sara Kapoor', accountEmail: 'sara.kapoor.demo@outlook.com',
    from: { name: 'Farah Khan', email: 'farah@studiofk.example' },
    subject: 'Contract renewal - signature required by 21 November',
    messages: [
      M('farah@studiofk.example', 'Farah Khan', "Dear Sara, your studio retainer contract renews on 1 December. The renewal documents require your personal signature by 21 November to avoid a lapse. The terms are unchanged from last year except the 6% fee revision we discussed. Please review the renewal clause before signing.", 2, 16)
    ]
  },
  {
    key: 's05', client: 'Sara Kapoor', accountEmail: 'sara.kapoor.demo@outlook.com',
    from: { name: 'Nikhil Anand', email: 'nikhil@anandlogistics.example' },
    subject: 'Re: Revised quote for December distribution',
    messages: [
      M('sara.kapoor.demo@outlook.com', 'Sara Kapoor', "Hi Nikhil, the first quote came in above budget. Could you send a revised version with the two-drop option priced separately?", 5, 11),
      M('nikhil@anandlogistics.example', 'Nikhil Anand', "Will do - give me a couple of days.", 5, 12),
      M('sara.kapoor.demo@outlook.com', 'Sara Kapoor', "Thanks Nikhil, I'll wait for the revised quote.", 5, 12)
    ]
  },
  {
    key: 's06', client: 'Sara Kapoor', accountEmail: 'sara.kapoor.demo@outlook.com',
    from: { name: 'Design Systems Weekly', email: 'hello@dsweekly.example' },
    subject: 'DSW #88: tokens, theming and a Figma library audit',
    messages: [
      M('hello@dsweekly.example', 'Design Systems Weekly', "This week in design systems: a practical guide to tokens, theming at scale and auditing a messy Figma library. Read online | Unsubscribe", 1, 6)
    ]
  },
  {
    key: 's07', client: 'Sara Kapoor', accountEmail: 'sara.kapoor.demo@outlook.com',
    from: { name: 'Colaba Venues', email: 'bookings@colabavenues.example' },
    subject: 'Venue shortlist + a question only you can answer',
    messages: [
      M('bookings@colabavenues.example', 'Colaba Venues', "Hi Sara, your assistant can pick any of the three shortlisted venues for the December workshop - they're all within budget and available on your dates. But the deposit terms differ: one needs a non-refundable 25% deposit, and our team will only take that call with you personally. Let us know your preference.", 0, 12)
    ]
  },
  {
    key: 's08', client: 'Sara Kapoor', accountEmail: 'sara.kapoor.demo@outlook.com',
    from: { name: 'Finance Team', email: 'finance@kapoorconsulting.example' },
    subject: 'Submit October expense receipts',
    messages: [
      M('finance@kapoorconsulting.example', 'Finance Team', "Hi, routine monthly ask: please submit October expense receipts by 18 November so we can close the books. Scans are fine, just reply to this thread with the files attached.", 2, 9)
    ]
  },
  {
    key: 's09', client: 'Sara Kapoor', accountEmail: 'sara.kapoor.demo@outlook.com',
    from: { name: 'HDFC Bank', email: 'alerts@hdfcbank.example' },
    subject: 'Important: KYC update completed',
    messages: [
      M('alerts@hdfcbank.example', 'HDFC Bank', "Dear customer, your KYC details were successfully updated on 12 November. No further action is required. This is an automated message - please do not reply.", 3, 4)
    ]
  },
  {
    key: 's10', client: 'Sara Kapoor', accountEmail: 'sara.kapoor.demo@outlook.com',
    from: { name: 'Asha Kapoor', email: 'asha.kapoor.example@gmail.com' },
    subject: "Mom's 60th birthday dinner - date vote",
    messages: [
      M('asha.kapoor.example@gmail.com', 'Asha Kapoor', "Sara! We're finalising Mom's 60th dinner. The family is split between 28 November and 5 December - you haven't voted yet and you know she'll want you there. Also, are you giving the speech or should I? Tell me directly, not through your assistant for this one!", 1, 19)
    ]
  },
  {
    key: 's11', client: 'Sara Kapoor', accountEmail: 'sara.kapoor.demo@outlook.com',
    from: { name: 'Palm Retreat', email: 'reservations@palmretreat.example' },
    subject: 'Reservation confirmed - 27 to 29 November, Alibaug',
    messages: [
      M('reservations@palmretreat.example', 'Palm Retreat', "Your reservation is confirmed: Deluxe Villa, checking in 27 November, checking out 29 November. Confirmation PR-88171. This is an automated confirmation, please do not reply.", 4, 15)
    ]
  },
  {
    key: 's12', client: 'Sara Kapoor', accountEmail: 'sara.kapoor.demo@outlook.com',
    from: { name: 'Lavanya Menon', email: 'lavanya@menonpr.example' },
    subject: 'Press quote for the founder story piece',
    messages: [
      M('lavanya@menonpr.example', 'Lavanya Menon', "Hi Riya, the journalist needs a short quote from Sara about the consulting report by Thursday. Draft options attached, but the final wording has to be Sara's - it's going out under her name. Could she pick a version or send her own?", 1, 14)
    ]
  }
];

// Simulated "incoming mail" used by the Sync button to demonstrate live
// reclassification. Applied in order, one per sync, then repeats.
export const INCOMING_POOL = [
  {
    op: 'reply', matchSubject: 'Term sheet - your sign-off needed',
    message: { from: 'rohan@northwindcap.example', fromName: 'Rohan Verma', body: "One more addition - section 7 now includes a board observer seat. That genuinely needs your personal approval; I can't take it from anyone else. Still holding to Friday 20 November." }
  },
  {
    op: 'reply', matchSubject: 'Re: Investor intro - next steps',
    message: { from: 'karan@bluepeak.example', fromName: 'Karan Malhotra', body: "Back from travel. Thanks for your patience - let's pause the roadmap discussion until December. Nothing needed from you right now, I'll reach out when I'm ready." }
  },
  {
    op: 'reply', matchSubject: "Rescheduling Thursday's brand review",
    message: { from: 'priya@brightlinestudio.example', fromName: 'Priya Nair', body: "Quick update - Monday 2:30 PM has just opened up on our side if that suits Arjun better." }
  },
  {
    op: 'new', client: 'Arjun Mehta', accountEmail: 'arjun.mehta.demo@gmail.com',
    from: { name: 'Ishaan Kapoor', email: 'ishaan@kapoorlegal.example' },
    subject: 'Urgent: vendor dispute letter - please review personally',
    message: { from: 'ishaan@kapoorlegal.example', fromName: 'Ishaan Kapoor', body: "Arjun, we've received a demand letter from the packaging vendor. It's sensitive and the response strategy is your call - I need your personal review before we reply. Draft response attached for your decision." }
  },
  {
    op: 'new', client: 'Sara Kapoor', accountEmail: 'sara.kapoor.demo@outlook.com',
    from: { name: 'Workshop Platform', email: 'noreply@skillbuilder.example' },
    subject: 'Your course completion certificate is ready',
    message: { from: 'noreply@skillbuilder.example', fromName: 'Workshop Platform', body: "Congratulations! Your certificate for 'Advanced Facilitation' is ready to download. This is an automated notification. Unsubscribe" }
  }
];
