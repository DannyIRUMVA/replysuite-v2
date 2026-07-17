import * as handlers from "./handlers";

export const TOOLS = [
  {
    function_declarations: [
      {
        name: "list_appointment_services",
        description:
          "List appointment services this business offers. Use before asking the customer to pick a service.",
        parameters: { type: "OBJECT", properties: {} },
      },
      {
        name: "check_appointment_availability",
        description:
          "Check if a requested appointment date/time appears available.",
        parameters: {
          type: "OBJECT",
          properties: {
            date: { type: "STRING", description: "YYYY-MM-DD" },
            time: {
              type: "STRING",
              description: "HH:mm, optional when only checking the day.",
            },
            service_id: { type: "STRING", description: "Optional service ID." },
          },
          required: ["date"],
        },
      },
      {
        name: "request_appointment",
        description:
          "Create an appointment request for any office or service business. It may require staff approval or a deposit depending on settings.",
        parameters: {
          type: "OBJECT",
          properties: {
            service_id: {
              type: "STRING",
              description: "Selected service ID if available.",
            },
            date: { type: "STRING", description: "YYYY-MM-DD" },
            time: { type: "STRING", description: "HH:mm" },
            name: { type: "STRING", description: "Customer name." },
            phone: { type: "STRING", description: "Customer phone." },
            email: {
              type: "STRING",
              description: "Customer email if provided.",
            },
            notes: {
              type: "STRING",
              description: "Reason or extra details for the appointment.",
            },
          },
          required: ["date", "time", "name", "phone"],
        },
      },
      {
        name: "reschedule_appointment",
        description:
          "Reschedule an existing appointment when the customer gives a new date and time.",
        parameters: {
          type: "OBJECT",
          properties: {
            appointment_id: { type: "STRING" },
            date: { type: "STRING", description: "YYYY-MM-DD" },
            time: { type: "STRING", description: "HH:mm" },
            reason: { type: "STRING" },
          },
          required: ["appointment_id", "date", "time"],
        },
      },
      {
        name: "cancel_appointment",
        description:
          "Cancel an existing appointment when the customer asks to cancel it.",
        parameters: {
          type: "OBJECT",
          properties: {
            appointment_id: { type: "STRING" },
            reason: { type: "STRING" },
          },
          required: ["appointment_id"],
        },
      },
      {
        name: "get_business_products",
        description:
          "List business digital products this assistant can sell. Use this before recommending a product or discussing price. Never reveal raw file URLs.",
        parameters: {
          type: "OBJECT",
          properties: {
            category: {
              type: "STRING",
              description: "Optional product category filter.",
            },
          },
        },
      },
      {
        name: "get_products",
        description:
          "Legacy product listing fallback. Prefer get_business_products for digital product sales.",
        parameters: {
          type: "OBJECT",
          properties: {
            category: {
              type: "STRING",
              description: "Optional product category filter.",
            },
          },
        },
      },
      {
        name: "create_business_order",
        description:
          "Create a verified business order for one or more digital products after the customer chooses what they want. For paid products, request MTN/Airtel mobile payment after the order is created. This creates records in business tables.",
        parameters: {
          type: "OBJECT",
          properties: {
            items: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  product_name_or_id: { type: "STRING" },
                  quantity: { type: "NUMBER" },
                  notes: { type: "STRING" },
                },
                required: ["product_name_or_id"],
              },
            },
            name: { type: "STRING", description: "Customer name if known." },
            phone: { type: "STRING", description: "Customer phone if known." },
            email: { type: "STRING", description: "Customer email if known." },
          },
          required: ["items"],
        },
      },
      {
        name: "create_order",
        description:
          "Legacy order creation fallback. Prefer create_business_order for digital product sales.",
        parameters: {
          type: "OBJECT",
          properties: {
            items: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  product_name_or_id: { type: "STRING" },
                  quantity: { type: "NUMBER" },
                  notes: { type: "STRING" },
                },
                required: ["product_name_or_id"],
              },
            },
            name: { type: "STRING", description: "Customer name if known." },
            phone: { type: "STRING", description: "Customer phone if known." },
            email: { type: "STRING", description: "Customer email if known." },
          },
          required: ["items"],
        },
      },
      {
        name: "request_business_payment",
        description:
          "Initiate an MTN/Airtel mobile payment prompt for an existing business order. Server validates the order amount; do not invent payment amounts.",
        parameters: {
          type: "OBJECT",
          properties: {
            order_id: { type: "STRING", description: "Business order ID." },
            phone: {
              type: "STRING",
              description:
                "Phone number to receive the MTN/Airtel mobile payment prompt.",
            },
          },
          required: ["order_id", "phone"],
        },
      },
      {
        name: "check_business_payment",
        description:
          "Check a business order payment. If paid, this returns a short protected /d delivery link instead of the raw file URL.",
        parameters: {
          type: "OBJECT",
          properties: {
            payment_id: { type: "STRING" },
            order_id: { type: "STRING" },
          },
        },
      },
      {
        name: "list_school_tutor_plans",
        description:
          "List paid school AI tutor session plans for this assistant. Sessions happen inside the same chat, with no external school links.",
        parameters: { type: "OBJECT", properties: {} },
      },
      {
        name: "create_school_tutor_session",
        description:
          "Create a pending paid school AI tutor chat session. Use before requesting payment for tutoring.",
        parameters: {
          type: "OBJECT",
          properties: {
            plan_id: { type: "STRING" },
            student_name: { type: "STRING" },
            student_phone: { type: "STRING" },
            student_email: { type: "STRING" },
          },
        },
      },
      {
        name: "request_school_tutor_payment",
        description:
          "Initiate MTN/Airtel mobile payment for a pending school tutor session. Time starts when payment is confirmed.",
        parameters: {
          type: "OBJECT",
          properties: {
            school_session_id: { type: "STRING" },
            phone: { type: "STRING" },
          },
          required: ["school_session_id", "phone"],
        },
      },
      {
        name: "check_school_tutor_payment",
        description:
          "Check school tutor payment. If paid, activate the chat-only tutor session and return remaining time/session expiry. Do not send external links.",
        parameters: {
          type: "OBJECT",
          properties: {
            payment_id: { type: "STRING" },
            school_session_id: { type: "STRING" },
          },
        },
      },
      {
        name: "request_payment",
        description:
          "Initiate an MTN/Airtel mobile payment prompt for an existing appointment/booking or legacy order record. Server validates the target and amount; do not invent payment amounts.",
        parameters: {
          type: "OBJECT",
          properties: {
            target_type: {
              type: "STRING",
              description: "appointment or order.",
            },
            target_id: {
              type: "STRING",
              description: "Appointment or order ID.",
            },
            appointment_id: {
              type: "STRING",
              description: "Appointment ID alternative.",
            },
            order_id: { type: "STRING", description: "Order ID alternative." },
            phone: {
              type: "STRING",
              description:
                "Phone number to receive the MTN/Airtel mobile payment prompt.",
            },
          },
          required: ["phone"],
        },
      },
      {
        name: "check_payment_status",
        description:
          "Check the saved payment status for an appointment/booking or order payment. This does not force a provider update yet.",
        parameters: {
          type: "OBJECT",
          properties: {
            payment_id: { type: "STRING" },
            target_type: {
              type: "STRING",
              description: "appointment or order.",
            },
            target_id: { type: "STRING" },
            appointment_id: { type: "STRING" },
            order_id: { type: "STRING" },
          },
        },
      },
      {
        name: "send_whatsapp_menu",
        description:
          "Send a native WhatsApp interactive list menu to the customer. Use this for structured WhatsApp choices.",
        parameters: {
          type: "OBJECT",
          properties: {
            header: {
              type: "STRING",
              description: "Title of the menu, e.g. 'Our Services'.",
            },
            body: { type: "STRING", description: "Main message body." },
            button_text: {
              type: "STRING",
              description: "Text on the list button, e.g. 'View Menu'.",
            },
            section_title: {
              type: "STRING",
              description: "Title for the options section.",
            },
            options: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  id: { type: "STRING", description: "Machine-readable ID." },
                  title: {
                    type: "STRING",
                    description: "Short title, max 24 chars.",
                  },
                  description: {
                    type: "STRING",
                    description: "Optional subtitle, max 72 chars.",
                  },
                },
                required: ["id", "title"],
              },
            },
          },
          required: ["options"],
        },
      },
    ],
  },
];

export const TOOL_HANDLERS: Record<string, any> = {
  list_appointment_services: handlers.listAppointmentServicesHandler,
  check_appointment_availability: handlers.checkAppointmentAvailabilityHandler,
  request_appointment: handlers.requestAppointmentHandler,
  book_appointment: handlers.appointmentHandler,
  reschedule_appointment: handlers.rescheduleAppointmentHandler,
  cancel_appointment: handlers.cancelAppointmentHandler,
  get_business_products: handlers.getBusinessProductsHandler,
  get_products: handlers.getMenuHandler,
  get_menu: handlers.getMenuHandler,
  create_business_order: handlers.createBusinessOrderHandler,
  create_order: handlers.createOrderHandler,
  place_order: handlers.createOrderHandler,
  request_business_payment: handlers.requestBusinessPaymentHandler,
  check_business_payment: handlers.checkBusinessPaymentHandler,
  list_school_tutor_plans: handlers.listSchoolTutorPlansHandler,
  create_school_tutor_session: handlers.createSchoolTutorSessionHandler,
  request_school_tutor_payment: handlers.requestSchoolTutorPaymentHandler,
  check_school_tutor_payment: handlers.checkSchoolTutorPaymentHandler,
  request_payment: handlers.paypackHandler,
  check_payment_status: handlers.checkPaymentStatusHandler,
  send_whatsapp_menu: handlers.sendWhatsAppMenuHandler,
};
