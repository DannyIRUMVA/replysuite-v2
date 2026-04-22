export const whatsappConfig = {
  version: 'v21.0',
  endpoints: {
    messages: (phoneNumberId: string) => `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`
  }
}
