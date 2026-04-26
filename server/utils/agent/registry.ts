import * as handlers from './handlers'

export const TOOLS = [
  {
    function_declarations: [
      {
        name: "get_menu",
        description: "Fetch the restaurant menu or product catalog. Use this to show customers what is available for order.",
        parameters: {
          type: "OBJECT",
          properties: {
            category: { type: "STRING", description: "Filter by category (e.g., 'Drinks', 'Main Course')." }
          }
        }
      },
      {
        name: "place_order",
        description: "Create a new order for items from the catalog. This should be called after a customer decides what to buy.",
        parameters: {
          type: "OBJECT",
          properties: {
            items: { 
              type: "ARRAY", 
              items: { 
                type: "OBJECT", 
                properties: { 
                  product_name_or_id: { type: "STRING", description: "The exact name of the product from the menu, or its ID" }, 
                  qty: { type: "NUMBER", description: "Quantity to order" } 
                },
                required: ["product_name_or_id", "qty"]
              } 
            },
            customer_phone: { type: "STRING", description: "Phone number in international format" },
            customer_name: { type: "STRING", description: "Name of the customer" }
          },
          required: ["items", "customer_phone"]
        }
      },
      {
        name: "request_payment",
        description: "Initiate a Paypack.rw MoMo payment prompt (USSD Push) for an order. Call this after placing an order.",
        parameters: {
          type: "OBJECT",
          properties: {
            order_id: { type: "STRING", description: "The ID returned by place_order" },
            phone: { type: "STRING", description: "The phone number to receive the prompt" },
            amount: { type: "NUMBER", description: "Total amount to pay" }
          },
          required: ["order_id", "phone", "amount"]
        }
      },
      {
        name: "book_appointment",
        description: "Schedule a clinic or law firm appointment.",
        parameters: {
          type: "OBJECT",
          properties: {
            date: { type: "STRING", description: "YYYY-MM-DD" },
            time: { type: "STRING", description: "HH:mm" },
            name: { type: "STRING" },
            phone: { type: "STRING" }
          },
          required: ["date", "time", "name", "phone"]
        }
      },
      {
        name: "generate_invoice",
        description: "Generate a formal invoice link for a specific order. This can be sent to the customer for their records.",
        parameters: {
          type: "OBJECT",
          properties: {
            order_id: { type: "STRING" }
          },
          required: ["order_id"]
        }
      },
      {
        name: "send_whatsapp_menu",
        description: "Send a native WhatsApp interactive list menu to the customer. Use this for structured options like services, categories, or choices.",
        parameters: {
          type: "OBJECT",
          properties: {
            header: { type: "STRING", description: "Title of the menu (e.g. 'Our Services')" },
            body: { type: "STRING", description: "Main message body" },
            button_text: { type: "STRING", description: "Text on the list button (e.g. 'View Menu')" },
            section_title: { type: "STRING", description: "Title for the options section" },
            options: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  id: { type: "STRING", description: "Machine-readable ID" },
                  title: { type: "STRING", description: "Short title (max 24 chars)" },
                  description: { type: "STRING", description: "Optional subtitle (max 72 chars)" }
                },
                required: ["id", "title"]
              }
            }
          },
          required: ["options"]
        }
      }
    ]
  }
]

export const TOOL_HANDLERS: Record<string, any> = {
  get_menu: handlers.getMenuHandler,
  place_order: handlers.placeOrderHandler,
  request_payment: handlers.paypackHandler,
  book_appointment: handlers.appointmentHandler,
  generate_invoice: handlers.invoiceHandler,
  send_whatsapp_menu: handlers.sendWhatsAppMenuHandler
}
