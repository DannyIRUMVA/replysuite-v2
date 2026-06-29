export type FreeToolTone = 'professional' | 'friendly' | 'empathetic' | 'concise'
export type FreeToolLength = 'short' | 'medium' | 'detailed'

export type FreeTool = {
  slug: string
  category: 'Reviews' | 'Support' | 'Messaging' | 'Bookings'
  title: string
  shortTitle: string
  description: string
  seoTitle: string
  seoDescription: string
  badge: string
  keyword: string
  inputLabel: string
  inputPlaceholder: string
  outputLabel: string
  businessTypes: string[]
  tones: Array<{ value: FreeToolTone, label: string }>
  lengths: Array<{ value: FreeToolLength, label: string }>
  systemFocus: string
  rules: string[]
  examples: Array<{ label: string, input: string, output: string }>
  faqs: Array<{ question: string, answer: string }>
  related: string[]
}

const standardTones: FreeTool['tones'] = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'empathetic', label: 'Empathetic' },
  { value: 'concise', label: 'Concise' },
]

const standardLengths: FreeTool['lengths'] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'detailed', label: 'Detailed' },
]

export const freeTools: FreeTool[] = [
  {
    slug: 'google-review-reply-generator',
    category: 'Reviews',
    title: 'Google Review Reply Generator',
    shortTitle: 'Google Review Reply',
    description: 'Generate calm, professional replies to positive, neutral, and negative Google reviews in seconds.',
    seoTitle: 'Free Google Review Reply Generator',
    seoDescription: 'Generate professional Google review replies for local businesses. Choose tone, length, and business type, then copy a ready-to-post response.',
    badge: 'Free review response tool',
    keyword: 'google review reply generator',
    inputLabel: 'Paste the Google review',
    inputPlaceholder: 'Example: The food was great, but service was slow and we waited too long for drinks.',
    outputLabel: 'Your Google review reply',
    businessTypes: ['Restaurant', 'Hotel', 'Clinic', 'Salon', 'Local service', 'E-commerce', 'Real estate', 'School'],
    tones: standardTones,
    lengths: standardLengths,
    systemFocus: 'Write a public Google review response from the business. Acknowledge feedback, stay calm, protect reputation, and invite the customer back or to contact the team when appropriate.',
    rules: [
      'Never attack, shame, or argue with the reviewer.',
      'Do not claim an investigation happened unless the user supplied that fact.',
      'Do not promise refunds, compensation, or policy exceptions.',
      'Keep the response suitable for a public Google Business Profile reply.',
    ],
    examples: [
      {
        label: 'Mixed restaurant review',
        input: 'The food was great, but service was slow.',
        output: 'Thank you for visiting us and for sharing your honest feedback. We’re glad you enjoyed the food, and we’re sorry the service felt slower than expected. We’ll use your comments to improve the guest experience and hope to welcome you again soon.',
      },
      {
        label: 'Positive review',
        input: 'Amazing staff and beautiful place. I will come back.',
        output: 'Thank you so much for the kind words. We’re happy you enjoyed the service and atmosphere, and we’d be delighted to welcome you back again soon.',
      },
    ],
    faqs: [
      { question: 'How should a business reply to a Google review?', answer: 'A good reply thanks the reviewer, acknowledges the specific feedback, stays professional, and gives a clear next step when needed.' },
      { question: 'Should I reply to negative Google reviews?', answer: 'Yes. A calm response shows future customers that your business listens, cares, and handles issues professionally.' },
      { question: 'Can ReplySuite automate review-style replies?', answer: 'ReplySuite can learn your business tone and support knowledge, then help you reply consistently across customer channels.' },
    ],
    related: ['negative-review-response-generator', 'customer-complaint-response-generator', 'whatsapp-business-reply-generator'],
  },
  {
    slug: 'negative-review-response-generator',
    category: 'Reviews',
    title: 'Negative Review Response Generator',
    shortTitle: 'Negative Review Response',
    description: 'Turn harsh or disappointed customer feedback into a professional, reputation-safe response.',
    seoTitle: 'Free Negative Review Response Generator',
    seoDescription: 'Write calm responses to bad reviews and angry customer feedback. Generate professional negative review replies for restaurants, hotels, clinics, and local businesses.',
    badge: 'Reputation-safe replies',
    keyword: 'negative review response generator',
    inputLabel: 'Paste the negative review or complaint',
    inputPlaceholder: 'Example: Terrible experience. Nobody helped us and the staff was rude.',
    outputLabel: 'Your negative review response',
    businessTypes: ['Restaurant', 'Hotel', 'Clinic', 'Local service', 'E-commerce', 'Travel', 'Education', 'Real estate'],
    tones: standardTones,
    lengths: standardLengths,
    systemFocus: 'Write a calm response to negative public feedback. De-escalate, acknowledge the concern, avoid defensiveness, and invite the customer to continue privately when needed.',
    rules: [
      'Do not blame the customer.',
      'Do not admit legal fault or make legal claims.',
      'Do not promise compensation unless explicitly provided by the user.',
      'Avoid generic corporate language; sound human and sincere.',
    ],
    examples: [
      {
        label: 'Angry service review',
        input: 'The staff ignored us and the whole experience was disappointing.',
        output: 'We’re sorry to hear that your visit felt disappointing. That is not the experience we want our customers to have. Thank you for bringing this to our attention — we’ll share your feedback with the team and would appreciate the chance to understand more so we can improve.',
      },
    ],
    faqs: [
      { question: 'What should I avoid when replying to a bad review?', answer: 'Avoid arguing, blaming, revealing private details, or promising things your team has not approved.' },
      { question: 'Should negative review replies be long?', answer: 'Usually no. Keep them calm, specific, and short enough for public readers to trust your response.' },
      { question: 'Can I use this for complaints outside Google?', answer: 'Yes. The response can be adapted for Facebook, TripAdvisor, Booking.com, Instagram, or email.' },
    ],
    related: ['google-review-reply-generator', 'customer-complaint-response-generator', 'refund-request-response-generator'],
  },
  {
    slug: 'customer-complaint-response-generator',
    category: 'Support',
    title: 'Customer Complaint Response Generator',
    shortTitle: 'Complaint Response',
    description: 'Write professional responses to upset customers without sounding robotic or defensive.',
    seoTitle: 'Free Customer Complaint Response Generator',
    seoDescription: 'Generate polite customer complaint responses for support teams. Reply to angry customers, service issues, delays, and poor experiences with a calm message.',
    badge: 'Customer support replies',
    keyword: 'customer complaint response generator',
    inputLabel: 'Paste the customer complaint',
    inputPlaceholder: 'Example: I messaged three times and nobody replied. This is very frustrating.',
    outputLabel: 'Your customer complaint response',
    businessTypes: ['SaaS', 'Restaurant', 'Hotel', 'Clinic', 'E-commerce', 'Local service', 'School', 'Agency'],
    tones: standardTones,
    lengths: standardLengths,
    systemFocus: 'Write a direct customer support response. Acknowledge frustration, apologize when appropriate, ask for missing details, and give a realistic next step.',
    rules: [
      'Do not invent account details, order details, dates, or internal actions.',
      'Ask for needed details instead of pretending to know them.',
      'Do not expose internal IDs or system references.',
      'Keep the reply useful for email, website chat, or WhatsApp.',
    ],
    examples: [
      {
        label: 'Delayed response complaint',
        input: 'I waited 3 days and nobody replied to my message.',
        output: 'Hi, thank you for letting us know. I’m sorry you had to wait that long for a response. That’s not the experience we want to provide. Please share the best contact details or reference information, and our team will review this and get back to you as quickly as possible.',
      },
    ],
    faqs: [
      { question: 'How do you respond to an angry customer professionally?', answer: 'Start by acknowledging the concern, apologize for the poor experience, avoid arguing, and give a clear next step.' },
      { question: 'Can I use this for WhatsApp support?', answer: 'Yes. Choose a shorter length if you want a WhatsApp-friendly reply.' },
      { question: 'How does this connect to ReplySuite?', answer: 'ReplySuite can learn your actual policies and FAQs so support replies become more accurate than a generic generator.' },
    ],
    related: ['negative-review-response-generator', 'refund-request-response-generator', 'whatsapp-business-reply-generator'],
  },
  {
    slug: 'refund-request-response-generator',
    category: 'Support',
    title: 'Refund Request Response Generator',
    shortTitle: 'Refund Response',
    description: 'Generate careful, policy-aware replies to customer refund requests without overpromising.',
    seoTitle: 'Free Refund Request Response Generator',
    seoDescription: 'Write professional refund request responses. Generate careful customer support replies for refund, cancellation, and payment concerns.',
    badge: 'Policy-aware support',
    keyword: 'refund request response generator',
    inputLabel: 'Paste the refund request',
    inputPlaceholder: 'Example: I want a refund because the service did not meet my expectations.',
    outputLabel: 'Your refund request response',
    businessTypes: ['SaaS', 'E-commerce', 'Restaurant', 'Hotel', 'Events', 'Education', 'Clinic', 'Agency'],
    tones: standardTones,
    lengths: standardLengths,
    systemFocus: 'Write a careful refund response. Be helpful and empathetic, but do not approve or deny a refund unless that decision is included in the user input.',
    rules: [
      'Do not approve a refund unless the user says it is approved.',
      'Do not deny a refund unless the user says policy requires denial.',
      'Ask for relevant details when needed.',
      'Do not invent payment, booking, order, or policy details.',
    ],
    examples: [
      {
        label: 'Refund review needed',
        input: 'I want a refund because I could not attend my appointment.',
        output: 'Hi, thank you for reaching out. I’m sorry you were not able to attend. Please share your booking details and the reason for the missed appointment, and our team will review the request based on our policy and get back to you with the next step.',
      },
    ],
    faqs: [
      { question: 'Should an AI tool approve refunds?', answer: 'No. A free generator should only draft message copy. Refund decisions must follow your business policy and be verified by your team.' },
      { question: 'Can this reply mention our refund policy?', answer: 'Yes, but only add policy details you know are correct.' },
      { question: 'Can ReplySuite handle payment-related messages?', answer: 'ReplySuite can guide booking or deposit conversations when configured, but payment amounts and actions must be verified server-side.' },
    ],
    related: ['customer-complaint-response-generator', 'negative-review-response-generator', 'booking-confirmation-message-generator'],
  },
  {
    slug: 'whatsapp-business-reply-generator',
    category: 'Messaging',
    title: 'WhatsApp Business Reply Generator',
    shortTitle: 'WhatsApp Business Reply',
    description: 'Create short, clear WhatsApp replies for customer questions, bookings, complaints, and follow-ups.',
    seoTitle: 'Free WhatsApp Business Reply Generator',
    seoDescription: 'Generate professional WhatsApp Business replies for customer inquiries, reservations, complaints, and follow-up messages.',
    badge: 'WhatsApp-ready messages',
    keyword: 'whatsapp business reply generator',
    inputLabel: 'Paste the customer WhatsApp message',
    inputPlaceholder: 'Example: Hi, do you have a table for 6 people tonight?',
    outputLabel: 'Your WhatsApp business reply',
    businessTypes: ['Restaurant', 'Hotel', 'Clinic', 'Salon', 'Real estate', 'School', 'Local service', 'E-commerce'],
    tones: standardTones,
    lengths: standardLengths,
    systemFocus: 'Write a concise WhatsApp Business reply. Keep it conversational, clear, and easy to send from a business account.',
    rules: [
      'Prefer short paragraphs and natural chat wording.',
      'Do not confirm bookings, payments, or availability unless the input explicitly says they are confirmed.',
      'Ask one clear follow-up question when details are missing.',
      'Do not add emojis unless the selected tone makes it appropriate; use at most one.',
    ],
    examples: [
      {
        label: 'Reservation question',
        input: 'Do you have tables for 6 people tonight?',
        output: 'Hi! Thanks for reaching out. Please share your preferred time and name for the booking, and our team will check availability and confirm shortly.',
      },
    ],
    faqs: [
      { question: 'What makes a good WhatsApp Business reply?', answer: 'It should be short, clear, friendly, and focused on the next action the customer should take.' },
      { question: 'Can this confirm appointments automatically?', answer: 'No. This free tool writes message copy only. ReplySuite’s booking system can handle validated appointment flows when configured.' },
      { question: 'Can ReplySuite reply on WhatsApp automatically?', answer: 'Yes. ReplySuite can connect WhatsApp for supported business accounts and answer with your trained business context.' },
    ],
    related: ['booking-confirmation-message-generator', 'customer-complaint-response-generator', 'google-review-reply-generator'],
  },
  {
    slug: 'booking-confirmation-message-generator',
    category: 'Bookings',
    title: 'Booking Confirmation Message Generator',
    shortTitle: 'Booking Confirmation',
    description: 'Write clear booking, appointment, and reservation confirmation messages for customers.',
    seoTitle: 'Free Booking Confirmation Message Generator',
    seoDescription: 'Generate professional booking confirmation messages for appointments, reservations, clinics, restaurants, hotels, and service businesses.',
    badge: 'Appointment reply tool',
    keyword: 'booking confirmation message generator',
    inputLabel: 'Describe the booking or customer request',
    inputPlaceholder: 'Example: Customer requested Friday at 7 PM for 4 guests. We still need to confirm availability.',
    outputLabel: 'Your booking message',
    businessTypes: ['Restaurant', 'Hotel', 'Clinic', 'Salon', 'Consultant', 'Events', 'Fitness', 'Local service'],
    tones: standardTones,
    lengths: standardLengths,
    systemFocus: 'Write a booking or appointment message. Make the status clear: requested, pending confirmation, or confirmed only if the input says confirmed.',
    rules: [
      'Do not say a booking is confirmed unless the input explicitly says it is confirmed.',
      'Do not invent dates, times, prices, deposits, staff names, or calendar availability.',
      'Ask for missing details such as name, phone, date, time, guest count, or service.',
      'Keep customer-facing replies free of internal IDs or calendar references.',
    ],
    examples: [
      {
        label: 'Pending restaurant booking',
        input: 'Customer requested Friday 7 PM for 4 guests. Not confirmed yet.',
        output: 'Hi, thanks for your booking request for Friday at 7:00 PM for 4 guests. We’ll check availability and confirm shortly. Please share the name and phone number you’d like us to use for the reservation.',
      },
    ],
    faqs: [
      { question: 'Can this tool create a real booking?', answer: 'No. It only writes the customer message. ReplySuite’s appointment tools can create validated bookings when connected to your business setup.' },
      { question: 'Should I say confirmed or pending?', answer: 'Only say confirmed if the slot is truly approved. Otherwise, say the request is pending confirmation.' },
      { question: 'Can ReplySuite connect bookings to Google Calendar?', answer: 'Yes. ReplySuite supports Google Calendar-backed booking flows when configured by the business owner.' },
    ],
    related: ['whatsapp-business-reply-generator', 'customer-complaint-response-generator', 'refund-request-response-generator'],
  },
]

export const freeToolMap = Object.fromEntries(
  freeTools.map((tool) => [tool.slug, tool])
) as Record<string, FreeTool>

export const getFreeTool = (slug?: string | string[] | null) => {
  const normalized = Array.isArray(slug) ? slug[0] : slug
  return normalized ? freeToolMap[normalized] : undefined
}

export const getRelatedFreeTools = (tool: FreeTool, limit = 3) => tool.related
  .map((slug) => freeToolMap[slug])
  .filter((item): item is FreeTool => Boolean(item))
  .slice(0, limit)

export const freeToolCategories = Array.from(new Set(freeTools.map((tool) => tool.category)))
