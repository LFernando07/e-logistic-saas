/**
 * @fileoverview welcome.template.ts
 * Plantilla HTML para correos de bienvenida tras registro exitoso.
 */

export interface WelcomeEmailParams {
  name: string;
  email: string;
  role: string;
  portalUrl?: string;
}

export function getWelcomeEmailHtml(params: WelcomeEmailParams): string {
  const { name, role, portalUrl = 'http://localhost:3001/dashboard' } = params;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Bienvenido a Nova Logistics</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #F8FAFC;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #030712; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0F172A; border-radius: 20px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
              
              <tr>
                <td style="background: linear-gradient(135deg, #4F46E5, #06B6D4); padding: 32px 24px; text-align: center;">
                  <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 800;">
                    ¡Bienvenido a Nova Logistics!
                  </h1>
                  <p style="margin: 8px 0 0; color: #E0E7FF; font-size: 14px;">
                    Tu cuenta ha sido creada exitosamente
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding: 32px 24px;">
                  <p style="font-size: 15px; color: #CBD5E1; margin: 0 0 16px;">
                    Hola <strong style="color: #FFFFFF;">${name}</strong>,
                  </p>
                  <p style="font-size: 14px; color: #94A3B8; margin: 0 0 20px; line-height: 1.6;">
                    Te damos la bienvenida a la plataforma integral de logística multitransportista y e-commerce. Tu cuenta ha sido activada con el rol: <strong style="color: #38BDF8;">${role}</strong>.
                  </p>

                  <div style="background-color: #1E293B; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                    <h4 style="margin: 0 0 8px; color: #FFFFFF; font-size: 14px;">¿Qué puedes hacer ahora?</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #94A3B8; font-size: 13px; line-height: 1.8;">
                      <li>Explorar el catálogo y realizar compras con tarifas de envío dinámicas.</li>
                      <li>Consultar el estado de tus órdenes y rastrear guías en tiempo real.</li>
                      <li>Gestionar despachos con Skydropx, FedEx, DHL y Estafeta.</li>
                    </ul>
                  </div>

                  <div style="text-align: center; margin: 32px 0 16px;">
                    <a href="${portalUrl}" style="background: linear-gradient(135deg, #4F46E5, #6366F1); color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block;">
                      Ir a mi Portal &rarr;
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
