/**
 * @fileoverview abandoned-cart.template.ts
 * Plantilla HTML para recuperación de carritos abandonados con cupón y enlace directo.
 */

export interface AbandonedCartItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface AbandonedCartParams {
  customerName: string;
  items: AbandonedCartItem[];
  totalAmount: number;
  recoveryUrl: string;
  discountCode?: string;
}

export function getAbandonedCartHtml(params: AbandonedCartParams): string {
  const { customerName, items, totalAmount, recoveryUrl, discountCode = 'NOVA10' } = params;

  const formattedTotal = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(totalAmount);

  const itemsHtml = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #1E293B;">
        <td style="padding: 10px 8px; color: #F8FAFC; font-size: 13px;">${item.name}</td>
        <td style="padding: 10px 8px; color: #38BDF8; text-align: center; font-size: 13px;">${item.quantity}x</td>
        <td style="padding: 10px 8px; color: #F59E0B; text-align: right; font-size: 13px;">
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
      <title>¡Tus artículos te están esperando! - Nova Logistics</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #F8FAFC;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #030712; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0F172A; border-radius: 20px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
              
              <tr>
                <td style="background: linear-gradient(135deg, #F59E0B, #EA580C); padding: 32px 24px; text-align: center;">
                  <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 800;">
                    ¡Olvidaste algo en tu carrito!
                  </h1>
                  <p style="margin: 8px 0 0; color: #FEF3C7; font-size: 14px;">
                    Guardamos tus artículos para que no pierdas tu selección
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding: 32px 24px;">
                  <p style="font-size: 15px; color: #CBD5E1; margin: 0 0 16px;">
                    Hola <strong style="color: #FFFFFF;">${customerName}</strong>,
                  </p>
                  <p style="font-size: 14px; color: #94A3B8; margin: 0 0 20px; line-height: 1.6;">
                    Notamos que dejaste productos en tu carrito. Si completas tu pedido hoy, puedes utilizar el cupón especial <strong style="color: #F59E0B; background-color: #78350F; padding: 2px 6px; border-radius: 4px;">${discountCode}</strong> para un 10% de descuento.
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; border-collapse: collapse;">
                    <thead>
                      <tr style="border-bottom: 2px solid #334155;">
                        <th style="padding: 8px; text-align: left; color: #94A3B8; font-size: 11px;">PRODUCTO</th>
                        <th style="padding: 8px; text-align: center; color: #94A3B8; font-size: 11px;">CANT.</th>
                        <th style="padding: 8px; text-align: right; color: #94A3B8; font-size: 11px;">PRECIO</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="2" style="padding: 12px 8px; font-weight: bold; color: #FFFFFF;">Subtotal</td>
                        <td style="padding: 12px 8px; font-weight: bold; color: #10B981; text-align: right;">${formattedTotal}</td>
                      </tr>
                    </tfoot>
                  </table>

                  <div style="text-align: center; margin: 32px 0 16px;">
                    <a href="${recoveryUrl}" style="background: linear-gradient(135deg, #F59E0B, #D97706); color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(245, 158, 11, 0.4);">
                      Recuperar mi Carrito &rarr;
                    </a>
                  </div>
                </td>
              </tr>

              <tr>
                <td style="background-color: #030712; padding: 20px; text-align: center; border-top: 1px solid #1E293B;">
                  <p style="margin: 0; font-size: 12px; color: #64748B;">
                    Nova Logistics SaaS &copy; 2026.
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
