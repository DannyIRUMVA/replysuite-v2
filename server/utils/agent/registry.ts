import * as handlers from './handlers'

export const TOOLS = [
  {
    function_declarations: [
      {
        name: 'list_appointment_services',
        description: 'List appointment services this business offers. Use before asking the customer to pick a service.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'check_appointment_availability',
        description: 'Check if a requested appointment date/time appears available.',
        parameters: {
          type: 'OBJECT',
          properties: {
            date: { type: 'STRING', description: 'YYYY-MM-DD' },
            time: { type: 'STRING', description: 'HH:mm, optional when only checking the day.' },
            service_id: { type: 'STRING', description: 'Optional service ID.' },
          },
          required: ['date'],
        },
      },
      {
        name: 'request_appointment',
        description: 'Create an appointment request for any office or service business. It may require staff approval or a deposit depending on settings.',
        parameters: {
          type: 'OBJECT',
          properties: {
            service_id: { type: 'STRING', description: 'Selected service ID if available.' },
            date: { type: 'STRING', description: 'YYYY-MM-DD' },
            time: { type: 'STRING', description: 'HH:mm' },
            name: { type: 'STRING', description: 'Customer name.' },
            phone: { type: 'STRING', description: 'Customer phone.' },
            email: { type: 'STRING', description: 'Customer email if provided.' },
            notes: { type: 'STRING', description: 'Reason or extra details for the appointment.' },
          },
          required: ['date', 'time', 'name', 'phone'],
        },
      },
      {
        name: 'reschedule_appointment',
        description: 'Reschedule an existing appointment when the customer gives a new date and time.',
        parameters: {
          type: 'OBJECT',
          properties: {
            appointment_id: { type: 'STRING' },
            date: { type: 'STRING', description: 'YYYY-MM-DD' },
            time: { type: 'STRING', description: 'HH:mm' },
            reason: { type: 'STRING' },
          },
          required: ['appointment_id', 'date', 'time'],
        },
      },
      {
        name: 'cancel_appointment',
        description: 'Cancel an existing appointment when the customer asks to cancel it.',
        parameters: {
          type: 'OBJECT',
          properties: {
            appointment_id: { type: 'STRING' },
            reason: { type: 'STRING' },
          },
          required: ['appointment_id'],
        },
      },
      {
        name: 'request_payment',
        description: 'Initiate a Paypack payment prompt for an existing appointment or booking deposit. Server validates the target and amount; do not invent payment amounts.',
        parameters: {
          type: 'OBJECT',
          properties: {
            target_type: { type: 'STRING', description: 'appointment.' },
            target_id: { type: 'STRING', description: 'Appointment ID.' },
            appointment_id: { type: 'STRING', description: 'Appointment ID alternative.' },
            phone: { type: 'STRING', description: 'Phone number to receive the Paypack prompt.' },
          },
          required: ['phone'],
        },
      },
      {
        name: 'check_payment_status',
        description: 'Check the saved payment status for an appointment or booking deposit. This does not force a provider update yet.',
        parameters: {
          type: 'OBJECT',
          properties: {
            payment_id: { type: 'STRING' },
            target_type: { type: 'STRING', description: 'appointment.' },
            target_id: { type: 'STRING' },
            appointment_id: { type: 'STRING' },
          },
        },
      },
      {
        name: 'send_whatsapp_menu',
        description: 'Send a native WhatsApp interactive list menu to the customer. Use this for structured WhatsApp choices.',
        parameters: {
          type: 'OBJECT',
          properties: {
            header: { type: 'STRING', description: "Title of the menu, e.g. 'Our Services'." },
            body: { type: 'STRING', description: 'Main message body.' },
            button_text: { type: 'STRING', description: "Text on the list button, e.g. 'View Menu'." },
            section_title: { type: 'STRING', description: 'Title for the options section.' },
            options: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  id: { type: 'STRING', description: 'Machine-readable ID.' },
                  title: { type: 'STRING', description: 'Short title, max 24 chars.' },
                  description: { type: 'STRING', description: 'Optional subtitle, max 72 chars.' },
                },
                required: ['id', 'title'],
              },
            },
          },
          required: ['options'],
        },
      },
    ],
  },
]

export const TOOL_HANDLERS: Record<string, any> = {
  list_appointment_services: handlers.listAppointmentServicesHandler,
  check_appointment_availability: handlers.checkAppointmentAvailabilityHandler,
  request_appointment: handlers.requestAppointmentHandler,
  book_appointment: handlers.appointmentHandler,
  reschedule_appointment: handlers.rescheduleAppointmentHandler,
  cancel_appointment: handlers.cancelAppointmentHandler,
  request_payment: handlers.paypackHandler,
  check_payment_status: handlers.checkPaymentStatusHandler,
  send_whatsapp_menu: handlers.sendWhatsAppMenuHandler,
}
