import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import { logger } from "./logger";

export interface CostCalculationInput {
  weight: number;
  category: string;
  declaredValue: number;
  deliveryMethod: string;
  shippingMode?: string;
  isRegularTariff?: boolean;
  wantsDelivery?: boolean;
  wantsInsurance?: boolean;
}

export interface CostCalculationResult {
  chargeableWeight: number;
  freightCost: number;
  taxesCost: number;
  deliveryCost: number;
  totalCostUsd: number;
  totalCostCrc: number;
}

/**
 * Calculates flete and real Costa Rican customs taxes based on category and declared value.
 */
export function calculateRealCosts(input: CostCalculationInput): CostCalculationResult {
  const EXCHANGE_RATE = 500; // 1 USD = 500 CRC

  // Calculate weight in Lbs (ACS provides weight in Kgs)
  const actualWeight = Number((input.weight * 2.20462).toFixed(2)); // convert Kg to Lbs

  // Dimensions simulation (only for standard USA air if needed, otherwise ignore)
  let length = 10;
  let width = 8;
  let height = 6;
  if (actualWeight > 5) {
    length = 15;
    width = 12;
    height = 8;
  }
  if (actualWeight > 15) {
    length = 20;
    width = 18;
    height = 12;
  }

  const volumetricWeight = Number(((length * width * height) / 166).toFixed(2));
  const chargeableWeight = Math.max(actualWeight, volumetricWeight);

  const shippingMode = input.shippingMode || "air";

  let freightCost = 0;
  if (shippingMode === "air_colombia") {
    // Colombia Air rate per Kg: 6500 CRC (launch) or 7500 CRC (regular)
    const ratePerKgCrc = input.isRegularTariff ? 7500 : 6500;
    freightCost = Number(((input.weight * ratePerKgCrc) / EXCHANGE_RATE).toFixed(2));
  } else if (shippingMode === "air") {
    // USA Air rate per Kg: 6000 CRC (launch) or 7000 CRC (regular)
    const ratePerKgCrc = input.isRegularTariff ? 7000 : 6000;
    freightCost = Number(((input.weight * ratePerKgCrc) / EXCHANGE_RATE).toFixed(2));
  } else { // shippingMode === "sea"
    // Sea rate per CFT: $27 (launch) or $29 (regular). Input weight is interpreted directly as CFT volume
    const cft = input.weight;
    const ratePerCftUsd = input.isRegularTariff ? 29 : 27;
    freightCost = Number((cft * ratePerCftUsd).toFixed(2));
  }

  // 3. Insurance Fee (2% of value if wantsInsurance is true/undefined, 0 if false)
  const wantsInsurance = input.wantsInsurance !== false;
  const insuranceFee = wantsInsurance ? Number((input.declaredValue * 0.02).toFixed(2)) : 0.00;

  // 4. Base CIF Value (FOB + Flete + Seguro)
  const cifValue = Number((input.declaredValue + freightCost + insuranceFee).toFixed(2));

  // 5. Real Costa Rican Customs Tax Rates
  // Fixed 13% IVA on service cost (freight + insurance)
  let taxesCost = Number(((freightCost + insuranceFee) * 0.13).toFixed(2));

  // 6. Delivery Fee ($7 for GAM delivery, $10 for Rural delivery, $0 for Locker/no delivery)
  const wantsDelivery = input.wantsDelivery !== false;
  let deliveryCost = 0.00;
  if (wantsDelivery) {
    if (input.deliveryMethod === "gam") {
      deliveryCost = 7.00; // 3500 CRC / 500
    } else if (input.deliveryMethod === "rural") {
      deliveryCost = 10.00; // 5000 CRC / 500
    }
  }

  // 7. Total calculations
  const totalCostUsd = Number((freightCost + insuranceFee + taxesCost + deliveryCost).toFixed(2));
  const totalCostCrc = Number((totalCostUsd * EXCHANGE_RATE).toFixed(2));

  return {
    chargeableWeight,
    freightCost: Number((freightCost + insuranceFee).toFixed(2)), // combine freight + insurance for client transparency
    taxesCost,
    deliveryCost,
    totalCostUsd,
    totalCostCrc
  };
}

/**
 * Generates a clean PDF invoice using pdfkit.
 */
export function generateInvoicePdf(invoice: any, pkg: any, client: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "LETTER" });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Draw Header Background
      doc.fillColor("#0b0f19").rect(0, 0, doc.page.width, 100).fill();

      // Brand Title
      doc.fillColor("#00f2fe").fontSize(22).font("Helvetica-Bold").text("BreezeGo", 50, 35);
      doc.fillColor("#ffffff").fontSize(8).font("Helvetica").text("Plataforma SaaS de Casillero & Logística Miami", 50, 62);

      // Invoice Details (Right Side)
      doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold").text(`FACTURA: #${invoice.id.substring(0, 8).toUpperCase()}`, 400, 35, { align: "right" });
      doc.font("Helvetica").fontSize(9).text(`Fecha: ${new Date(invoice.created_at).toLocaleDateString()}`, 400, 50, { align: "right" });
      doc.fillColor(invoice.is_paid ? "#00ff88" : "#ff8800").font("Helvetica-Bold").text(`Estado: ${invoice.is_paid ? "PAGADA" : "PENDIENTE"}`, 400, 65, { align: "right" });

      // Client Section Header
      doc.fillColor("#0f172a").fontSize(12).font("Helvetica-Bold").text("DATOS DEL CLIENTE", 50, 130);
      doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(50, 145).lineTo(562, 145).stroke();

      // Client Data (Left)
      doc.fillColor("#334155").fontSize(9).font("Helvetica").text(`Nombre: ${client?.fullName || client?.full_name || "Cliente BreezeGo"}`, 50, 160);
      doc.text(`Email: ${client?.email || "N/D"}`, 50, 175);
      doc.text(`Teléfono: ${client?.phone || "N/D"}`, 50, 190);
      doc.text(`Dirección: ${client?.address || "Locker BreezeGo"}`, 50, 205);

      // Package Data (Right)
      doc.text(`Tracking: ${pkg.tracking_number}`, 320, 160);
      doc.text(`Tienda: ${pkg.vendor}`, 320, 175);
      doc.text(`Descripción: ${pkg.description}`, 320, 190);
      if (pkg.shipping_mode === "sea") {
        doc.text(`Volumen: ${pkg.weight} CFT`, 320, 205);
      } else {
        doc.text(`Peso: ${pkg.weight} Kg (${(pkg.weight * 2.20462).toFixed(2)} Lbs)`, 320, 205);
      }

      // Items Table Headers
      doc.fillColor("#f1f5f9").rect(50, 240, 512, 25).fill();
      doc.fillColor("#0f172a").fontSize(9).font("Helvetica-Bold").text("Concepto / Servicio", 60, 248);
      doc.text("Total (USD)", 460, 248, { align: "right" });

      let currentY = 275;

      const fleteLabel = pkg.shipping_mode === "air_colombia"
        ? "Servicio de Flete Internacional & Seguro (Colombia a Costa Rica)"
        : pkg.shipping_mode === "sea"
          ? "Servicio de Flete Internacional Marítimo & Seguro (Miami a Costa Rica)"
          : "Servicio de Flete Internacional & Seguro (Miami a Costa Rica)";

      const items = [
        { label: fleteLabel, value: invoice.flete_cost },
        { label: `Impuestos de Importación SJO (Categoría: ${pkg.category.toUpperCase()})`, value: invoice.taxes_cost },
        { label: "Servicio de Entrega Local / Distribución", value: invoice.delivery_cost }
      ];

      items.forEach((item) => {
        doc.fillColor("#334155").font("Helvetica").fontSize(9).text(item.label, 60, currentY);
        doc.font("Helvetica-Bold").text(`$${item.value.toFixed(2)}`, 460, currentY, { align: "right" });
        doc.strokeColor("#e2e8f0").moveTo(50, currentY + 15).lineTo(562, currentY + 15).stroke();
        currentY += 30;
      });

      // Total block background
      doc.fillColor("#f8fafc").rect(320, currentY + 10, 242, 60).fill();
      doc.strokeColor("#cbd5e1").rect(320, currentY + 10, 242, 60).stroke();

      // Totals
      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text("TOTAL FACTURA (USD):", 330, currentY + 20);
      doc.text(`$${invoice.total_cost_usd.toFixed(2)}`, 460, currentY + 20, { align: "right" });

      doc.fillColor("#00f2fe").text("TOTAL FACTURA (CRC):", 330, currentY + 42);
      doc.fillColor("#0f172a").text(`₡${invoice.total_cost_crc.toLocaleString("es-CR")}`, 460, currentY + 42, { align: "right" });

      // Terms Note
      doc.fillColor("#64748b").fontSize(8).font("Helvetica").text("Este documento es un comprobante de cobro oficial generado por BreezeGo Costa Rica S.A.", 50, 480, { align: "center" });
      doc.text("Por favor realice su pago por medio de la pasarela Tilopay en su Command Center para autorizar la entrega de sus paquetes.", 50, 495, { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Sends the invoice email to the client with the PDF attached.
 */
export async function sendInvoiceEmail(
  toEmail: string,
  clientName: string,
  invoice: any,
  pdfBuffer: Buffer,
  pdfFilename: string,
  pkg?: any
): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"BreezeGo Logística" <noreply@breezego.net>`;

  if (!host || !user || !pass) {
    logger.warn("SMTP credentials not fully configured. Email sending skipped but PDF was generated.", {
      metadata: {
        toEmail,
        invoiceId: invoice.id
      }
    });
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      }
    });

    const mailOptions = {
      from,
      to: toEmail,
      subject: `Factura de Cobro #${invoice.id.substring(0, 8).toUpperCase()} - BreezeGo`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Factura de Cobro - BreezeGo</title>
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="font-family: 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; color: #334155; -webkit-font-smoothing: antialiased;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 0;">
            <tr>
              <td align="center">
                <!-- Outer Envelope Table -->
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                  
                  <!-- Dark Header -->
                  <tr>
                    <td style="padding: 24px 40px; text-align: center; background-color: #0b0f19; border-bottom: 2px solid #FC7C58;">
                      <img src="https://breezego.net/logo.png" alt="BreezeGo" style="height: 35px; width: auto; display: inline-block;" />
                      <p style="font-family: 'Montserrat', sans-serif; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: #FC7C58; margin: 6px 0 0 0;">— TUS PAQUETES EN MOVIMIENTO —</p>
                    </td>
                  </tr>
                  
                  <!-- Main Content Area -->
                  <tr>
                    <td style="padding: 35px 40px; background-color: #ffffff;">
                      <h2 style="font-family: 'Montserrat', sans-serif; color: #0b0f19; font-size: 18px; font-weight: 800; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.5px;">¡Hola, ${clientName}!</h2>
                      <p style="font-size: 13px; line-height: 1.5; color: #475569; margin-bottom: 24px; margin-top: 0;">
                        Te informamos que tu paquete ha sido procesado en nuestras bodegas y se ha generado la factura de cobro correspondiente por concepto de flete internacional e impuestos de nacionalización:
                      </p>
                      
                      <!-- Invoice Details Card (Digital Billing Ticket) -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 2px dashed #FC7C58; border-radius: 12px; margin-bottom: 24px; border-collapse: separate;">
                        <tr>
                          <td style="padding: 20px;">
                            
                            <!-- Card Header -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 15px;">
                              <tr>
                                <td valign="middle">
                                  <strong style="font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 800; color: #0b0f19; text-transform: uppercase; letter-spacing: 0.5px; display: block; line-height: 1.1;">BreezeGo Finance</strong>
                                  <span style="font-size: 8px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; display: block; margin-top: 2px;">FACTURA: #${invoice.id.substring(0, 8).toUpperCase()}</span>
                                </td>
                                <td align="right" valign="middle">
                                  <span style="background-color: #FC7C58; color: #ffffff; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 6px; display: inline-block;">
                                    Por Pagar
                                  </span>
                                </td>
                              </tr>
                            </table>

                            <!-- Billing Breakdown Table -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 12px; border-collapse: collapse; color: #334155; margin-bottom: 15px;">
                              <thead>
                                <tr style="background-color: #0b0f19; color: #ffffff; font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                                  <th align="left" style="padding: 10px 12px; border-radius: 6px 0 0 6px;">Concepto</th>
                                  <th align="right" style="padding: 10px 12px; border-radius: 0 6px 6px 0; width: 100px;">Monto (USD)</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                  <td style="padding: 10px 12px; font-weight: 600;">
                                    ${pkg?.shipping_mode === "air_colombia"
                                      ? "Flete Internacional & Seguro (Colombia a SJO)"
                                      : pkg?.shipping_mode === "sea"
                                        ? "Flete Internacional Marítimo & Seguro (Miami a SJO)"
                                        : "Flete Internacional & Seguro (Miami a SJO)"}
                                  </td>
                                  <td align="right" style="padding: 10px 12px; font-weight: bold; color: #0b0f19;">$${invoice.flete_cost.toFixed(2)}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                  <td style="padding: 10px 12px; font-weight: 600;">Impuestos de Aduana en Costa Rica (DAI + IVA)</td>
                                  <td align="right" style="padding: 10px 12px; font-weight: bold; color: #0b0f19;">$${invoice.taxes_cost.toFixed(2)}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                  <td style="padding: 10px 12px; font-weight: 600;">Servicio de Distribución Local</td>
                                  <td align="right" style="padding: 10px 12px; font-weight: bold; color: #0b0f19;">$${invoice.delivery_cost.toFixed(2)}</td>
                                </tr>
                                <tr style="background-color: #f1f5f9; font-weight: bold; font-family: 'Montserrat', sans-serif;">
                                  <td style="padding: 10px 12px; border-radius: 6px 0 0 6px; font-size: 11px; text-transform: uppercase; color: #0b0f19;">Total a Pagar (USD)</td>
                                  <td align="right" style="padding: 10px 12px; border-radius: 0 6px 6px 0; font-size: 13px; color: #0b0f19;">$${invoice.total_cost_usd.toFixed(2)}</td>
                                </tr>
                                <tr style="background-color: rgba(252, 124, 88, 0.08); font-weight: bold; color: #FC7C58;">
                                  <td style="padding: 10px 12px; border-radius: 6px 0 0 6px; font-size: 11px; text-transform: uppercase;">Equivalente en Colones (CRC)</td>
                                  <td align="right" style="padding: 10px 12px; border-radius: 0 6px 6px 0; font-size: 13px; color: #FC7C58;">₡${invoice.total_cost_crc.toLocaleString("es-CR")}</td>
                                </tr>
                              </tbody>
                            </table>

                            <p style="font-size: 10px; color: #64748b; line-height: 1.4; margin: 0; text-align: center;">
                              * Nota: El tipo de cambio de referencia para colones se calcula a la fecha de arribo del paquete.
                            </p>

                          </td>
                        </tr>
                      </table>
                      
                      <p style="font-size: 13px; line-height: 1.5; color: #475569; margin-bottom: 24px; margin-top: 0;">
                        Adjunto a este correo electrónico encontrarás el desglose oficial en formato PDF para tus registros. Para liberar y programar el reparto del paquete, realiza el pago en línea haciendo clic en el botón de abajo:
                      </p>

                      <!-- CTA Button -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 25px; margin-bottom: 25px;">
                        <tr>
                          <td align="center">
                            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://breezego.net'}/dashboard" target="_blank" style="background-color: #FC7C58; color: #ffffff; text-decoration: none; font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 14px 30px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(252, 124, 88, 0.25);">
                              Pagar Factura con Tilopay
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 25px; margin-bottom: 0; line-height: 1.4;">
                        Si tienes alguna duda sobre esta importación, puedes contactarnos respondiendo a este correo o mediante nuestro canal de WhatsApp.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Dark Footer -->
                  <tr>
                    <td style="padding: 24px 40px; background-color: #0b0f19; text-align: center; color: #64748b; font-size: 10px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                      <p style="margin: 0 0 6px 0; color: #cbd5e1;">© ${new Date().getFullYear()} BreezeGo S.A. Todos los derechos reservados.</p>
                      <p style="margin: 0; color: #64748b;">San José, Costa Rica • Miami Hub (Florida) • Doral USA</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    logger.info("Correo de factura enviado con éxito", {
      metadata: { toEmail, invoiceId: invoice.id }
    });
    return true;
  } catch (error) {
    logger.error("Error al enviar el correo de factura", error, {
      metadata: { toEmail, invoiceId: invoice.id }
    });
    return false;
  }
}

/**
 * Sends the PAID receipt email to the client after a successful Tilopay payment.
 * Attaches the same invoice PDF (which now renders the "PAGADA" status).
 */
export async function sendPaymentReceiptEmail(
  toEmail: string,
  clientName: string,
  invoice: any,
  pdfBuffer: Buffer,
  pdfFilename: string,
  pkg?: any,
  transactionId?: string
): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"BreezeGo Logística" <noreply@breezego.net>`;

  if (!host || !user || !pass) {
    logger.warn("SMTP credentials not fully configured. Payment receipt email skipped but PDF was generated.", {
      metadata: { toEmail, invoiceId: invoice.id }
    });
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    const paidDate = invoice.paid_at || new Date().toISOString();

    const mailOptions = {
      from,
      to: toEmail,
      subject: `✅ Pago Confirmado - Comprobante #${invoice.id.substring(0, 8).toUpperCase()} - BreezeGo`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Comprobante de Pago - BreezeGo</title>
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="font-family: 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; color: #334155; -webkit-font-smoothing: antialiased;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 0;">
            <tr>
              <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">

                  <!-- Dark Header -->
                  <tr>
                    <td style="padding: 24px 40px; text-align: center; background-color: #0b0f19; border-bottom: 2px solid #00ff88;">
                      <img src="https://breezego.net/logo.png" alt="BreezeGo" style="height: 35px; width: auto; display: inline-block;" />
                      <p style="font-family: 'Montserrat', sans-serif; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: #00ff88; margin: 6px 0 0 0;">— TUS PAQUETES EN MOVIMIENTO —</p>
                    </td>
                  </tr>

                  <!-- Main Content Area -->
                  <tr>
                    <td style="padding: 35px 40px; background-color: #ffffff;">

                      <!-- Success Badge -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                        <tr>
                          <td align="center">
                            <span style="background-color: rgba(0, 255, 136, 0.12); color: #059669; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 8px 18px; border-radius: 999px; display: inline-block;">
                              ✓ Pago Confirmado
                            </span>
                          </td>
                        </tr>
                      </table>

                      <h2 style="font-family: 'Montserrat', sans-serif; color: #0b0f19; font-size: 18px; font-weight: 800; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.5px; text-align: center;">¡Gracias por tu pago, ${clientName}!</h2>
                      <p style="font-size: 13px; line-height: 1.5; color: #475569; margin-bottom: 24px; margin-top: 0; text-align: center;">
                        Hemos recibido tu pago correctamente. Tu paquete ya está autorizado para su procesamiento y entrega. Este es tu comprobante oficial:
                      </p>

                      <!-- Receipt Card -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 2px solid #00ff88; border-radius: 12px; margin-bottom: 24px; border-collapse: separate;">
                        <tr>
                          <td style="padding: 20px;">

                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 15px;">
                              <tr>
                                <td valign="middle">
                                  <strong style="font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 800; color: #0b0f19; text-transform: uppercase; letter-spacing: 0.5px; display: block; line-height: 1.1;">BreezeGo Finance</strong>
                                  <span style="font-size: 8px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; display: block; margin-top: 2px;">COMPROBANTE: #${invoice.id.substring(0, 8).toUpperCase()}</span>
                                </td>
                                <td align="right" valign="middle">
                                  <span style="background-color: #00ff88; color: #064e3b; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 6px; display: inline-block;">
                                    Pagada
                                  </span>
                                </td>
                              </tr>
                            </table>

                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 12px; border-collapse: collapse; color: #334155; margin-bottom: 15px;">
                              <tbody>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                  <td style="padding: 8px 12px; color: #64748b;">Fecha de pago</td>
                                  <td align="right" style="padding: 8px 12px; font-weight: 600; color: #0b0f19;">${new Date(paidDate).toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" })}</td>
                                </tr>
                                ${transactionId ? `<tr style="border-bottom: 1px solid #e2e8f0;">
                                  <td style="padding: 8px 12px; color: #64748b;">Referencia de transacción</td>
                                  <td align="right" style="padding: 8px 12px; font-weight: 600; color: #0b0f19;">${transactionId}</td>
                                </tr>` : ""}
                                ${pkg?.tracking_number ? `<tr style="border-bottom: 1px solid #e2e8f0;">
                                  <td style="padding: 8px 12px; color: #64748b;">Tracking</td>
                                  <td align="right" style="padding: 8px 12px; font-weight: 600; color: #0b0f19;">${pkg.tracking_number}</td>
                                </tr>` : ""}
                                <tr style="background-color: rgba(0, 255, 136, 0.10); font-weight: bold; font-family: 'Montserrat', sans-serif;">
                                  <td style="padding: 12px; border-radius: 6px 0 0 6px; font-size: 11px; text-transform: uppercase; color: #0b0f19;">Total Pagado (USD)</td>
                                  <td align="right" style="padding: 12px; border-radius: 0 6px 6px 0; font-size: 15px; color: #059669;">$${invoice.total_cost_usd.toFixed(2)}</td>
                                </tr>
                                <tr style="background-color: #f1f5f9; font-weight: bold; color: #0b0f19;">
                                  <td style="padding: 10px 12px; border-radius: 6px 0 0 6px; font-size: 11px; text-transform: uppercase;">Equivalente en Colones (CRC)</td>
                                  <td align="right" style="padding: 10px 12px; border-radius: 0 6px 6px 0; font-size: 13px;">₡${invoice.total_cost_crc.toLocaleString("es-CR")}</td>
                                </tr>
                              </tbody>
                            </table>

                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 13px; line-height: 1.5; color: #475569; margin-bottom: 24px; margin-top: 0; text-align: center;">
                        Adjunto encontrarás el comprobante oficial en formato PDF para tus registros. Puedes seguir el estado de tu envío en tu Command Center:
                      </p>

                      <!-- CTA Button -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 25px; margin-bottom: 25px;">
                        <tr>
                          <td align="center">
                            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://breezego.net'}/dashboard" target="_blank" style="background-color: #0b0f19; color: #ffffff; text-decoration: none; font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 14px 30px; border-radius: 10px; display: inline-block;">
                              Ver mi Command Center
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 25px; margin-bottom: 0; line-height: 1.4;">
                        ¿Dudas sobre tu envío? Responde a este correo o escríbenos por WhatsApp.
                      </p>
                    </td>
                  </tr>

                  <!-- Dark Footer -->
                  <tr>
                    <td style="padding: 24px 40px; background-color: #0b0f19; text-align: center; color: #64748b; font-size: 10px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                      <p style="margin: 0 0 6px 0; color: #cbd5e1;">© ${new Date().getFullYear()} BreezeGo S.A. Todos los derechos reservados.</p>
                      <p style="margin: 0; color: #64748b;">San José, Costa Rica • Miami Hub (Florida) • Doral USA</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    logger.info("Comprobante de pago enviado con éxito", {
      metadata: { toEmail, invoiceId: invoice.id }
    });
    return true;
  } catch (error) {
    logger.error("Error al enviar el comprobante de pago", error, {
      metadata: { toEmail, invoiceId: invoice.id }
    });
    return false;
  }
}
