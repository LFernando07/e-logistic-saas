/**
 * @fileoverview order-receipt.template.ts
 * Plantilla HTML para correos de confirmación de pedido y recibo de compra.
 */

export interface OrderReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  image?: string;
}

export interface OrderReceiptParams {
  orderCode: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  carrierName: string;
  trackingNumber?: string;
  totalAmount: number;
  paymentMethod: string;
  items: OrderReceiptItem[];
  trackingUrl?: string;
}

/**
 * Genera el HTML responsive para el correo de recibo de compra.
 */
export function getOrderReceiptHtml(params: OrderReceiptParams): string {
  const {
    orderCode,
    customerName,
    shippingAddress,
    carrierName,
    trackingNumber,
    totalAmount,
    paymentMethod,
    items,
    trackingUrl,
  } = params;

  const formattedTotal = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(totalAmount);

  const itemsRows = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #1E293B;">
        <td style="padding: 12px 8px; color: #F8FAFC; font-weight: 600; font-size: 14px;">
          ${item.name}
        </td>
        <td style="padding: 12px 8px; color: #38BDF8; text-align: center; font-size: 14px;">
          ${item.quantity}x
        </td>
        <td style="padding: 12px 8px; color: #10B981; text-align: right; font-weight: 600; font-size: 14px;">
          ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.unitPrice)}
        </td>
      </tr>
    `,
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Recibo de Pedido #${orderCode} - Nova Logistics</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #F8FAFC;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #030712; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0F172A; border-radius: 20px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #4F46E5, #06B6D4); padding: 32px 24px; text-align: center;">
                  <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                    ¡Pago Confirmado y Orden Recibida!
                  </h1>
                  <p style="margin: 8px 0 0; color: #E0E7FF; font-size: 14px;">
                    Orden #${orderCode} • Nova Logistics SaaS
                  </p>
                </td>
              </tr>

              <!-- Greeting & Summary -->
              <tr>
                <td style="padding: 32px 24px 16px;">
                  <p style="font-size: 15px; color: #CBD5E1; margin: 0 0 16px;">
                    Hola <strong style="color: #FFFFFF;">${customerName}</strong>,
                  </p>
                  <p style="font-size: 14px; color: #94A3B8; margin: 0 0 24px; line-height: 1.6;">
                    Hemos procesado tu pago satisfactoriamente mediante <strong>${paymentMethod}</strong>. El almacén ha recibido tu pedido y los workers están empaquetando tus artículos.
                  </p>

                  <!-- Status Banner -->
                  <div style="background-color: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13px; color: #94A3B8;">Transportista Asignado:</td>
                        <td style="font-size: 13px; color: #F8FAFC; font-weight: bold; text-align: right;">${carrierName}</td>
                      </tr>
                      ${
                        trackingNumber
                          ? `
                      <tr>
                        <td style="font-size: 13px; color: #94A3B8; padding-top: 8px;">Número de Guía:</td>
                        <td style="font-size: 13px; color: #38BDF8; font-family: monospace; font-weight: bold; text-align: right; padding-top: 8px;">${trackingNumber}</td>
                      </tr>
                      `
                          : ''
                      }
                      <tr>
                        <td style="font-size: 13px; color: #94A3B8; padding-top: 8px;">Destino:</td>
                        <td style="font-size: 13px; color: #F8FAFC; text-align: right; padding-top: 8px;">${shippingAddress}</td>
                      </tr>
                    </table>
                  </div>

                  <!-- Items Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border-collapse: collapse;">
                    <thead>
                      <tr style="border-bottom: 2px solid #334155;">
                        <th style="padding: 8px; text-align: left; color: #94A3B8; font-size: 12px; text-transform: uppercase;">Producto</th>
                        <th style="padding: 8px; text-align: center; color: #94A3B8; font-size: 12px; text-transform: uppercase;">Cant.</th>
                        <th style="padding: 8px; text-align: right; color: #94A3B8; font-size: 12px; text-transform: uppercase;">Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsRows}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="2" style="padding: 16px 8px 8px; font-weight: bold; color: #FFFFFF; font-size: 16px;">Total Pagado</td>
                        <td style="padding: 16px 8px 8px; font-weight: 800; color: #10B981; font-size: 18px; text-align: right;">${formattedTotal}</td>
                      </tr>
                    </tfoot>
                  </table>

                  ${
                    trackingUrl
                      ? `
                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 32px 0 16px;">
                    <a href="${trackingUrl}" style="background: linear-gradient(135deg, #4F46E5, #6366F1); color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4);">
                      Rastrear mi Envío en Vivo &rarr;
                    </a>
                  </div>
                  `
                      : ''
                  }
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #030712; padding: 24px; text-align: center; border-top: 1px solid #1E293B;">
                  <p style="margin: 0; font-size: 12px; color: #64748B;">
                    Nova Logistics SaaS • Plataforma Multitransportista & E-Commerce
                  </p>
                  <p style="margin: 6px 0 0; font-size: 11px; color: #475569;">
                    Este correo confirma tu compra y el alta de servicio logístico.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
