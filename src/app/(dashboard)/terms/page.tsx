"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Shield, AlertOctagon, Scale, DollarSign, FileText, BadgeHelp } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-brand-teal/20 bg-brand-teal/5 text-brand-cyan text-[10px] font-heading font-extrabold uppercase tracking-widest mb-3">
          <FileText className="h-3 w-3" />
          Contrato de Servicio de Courier
        </div>
        <h1 className="font-heading text-3xl font-extrabold text-white">Términos y Condiciones</h1>
        <p className="text-slate-400 text-xs mt-1">
          Última actualización: 4 de junio, 2026. Conozca las regulaciones de la Dirección General de Aduanas de Costa Rica y normativas de carga aérea.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Mercancías Restringidas */}
        <Card className="border-white/5">
          <CardHeader className="bg-brand-orange/5 border-b border-white/5 rounded-t-2xl">
            <div className="flex items-center space-x-2 text-brand-orange">
              <AlertOctagon className="h-5 w-5" />
              <CardTitle className="text-sm">Mercancías Restringidas (TSA / Aduanas)</CardTitle>
            </div>
            <CardDescription className="text-[11px] text-slate-400">
              Artículos prohibidos por regulaciones aéreas e importación.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3 text-[11px] text-slate-300 leading-relaxed">
            <p>
              De conformidad con las regulaciones de la <strong>TSA (Transportation Security Administration)</strong> y el Ministerio de Hacienda de Costa Rica, se prohíbe terminantemente el transporte de:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-1">
              <li>Materiales explosivos, inflamables, gases o combustibles.</li>
              <li>Armas de fuego, municiones, armas blancas y réplicas de aire.</li>
              <li>Sustancias psicotrópicas o estupefacientes de cualquier índole.</li>
              <li>Cosméticos sin pre-permiso del Ministerio de Salud.</li>
              <li>Suplementos, vitaminas o medicamentos de consumo humano directo sin registro sanitario local previo.</li>
            </ul>
            <p className="text-brand-orange/90 font-semibold bg-brand-orange/5 p-2.5 rounded-xl border border-brand-orange/10 mt-2">
              ⚠️ La retención de carga por aduana debido a productos restringidos incurre en costos de abandono fiscal asumidos en su totalidad por el cliente.
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Fórmulas Volumétricas e IATA */}
        <Card className="border-white/5">
          <CardHeader className="bg-brand-cyan/5 border-b border-white/5 rounded-t-2xl">
            <div className="flex items-center space-x-2 text-brand-cyan">
              <Scale className="h-5 w-5" />
              <CardTitle className="text-sm">Estándar Volumétrico IATA</CardTitle>
            </div>
            <CardDescription className="text-[11px] text-slate-400">
              Fórmula de facturación dimensional de carga aérea internacional.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3 text-[11px] text-slate-300 leading-relaxed">
            <p>
              El flete aéreo se cobra con base en el <strong>peso chargeable</strong>, que es el valor mayor entre el peso físico neto y el peso volumétrico del paquete.
            </p>
            <div className="bg-[#0b0f19] p-3 rounded-xl border border-white/5 font-mono text-center text-xs text-white">
              Peso Volumétrico (Kg) = (Largo &times; Ancho &times; Alto in) / 366
            </div>
            <p className="text-slate-400">
              Para fletes marítimos, la tasa volumétrica se calcula según el pie cúbico (CFT) de almacenamiento consolidado.
            </p>
            <p className="text-slate-400">
              Cualquier discrepancia de peso físico declarada por el proveedor en el origen versus el aforo en la bodega de Miami será reportada para su ajuste antes del despacho.
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Impuestos y Aforos de Aduana CR */}
        <Card className="border-white/5">
          <CardHeader className="bg-brand-cyan/5 border-b border-white/5 rounded-t-2xl">
            <div className="flex items-center space-x-2 text-brand-cyan">
              <Shield className="h-5 w-5" />
              <CardTitle className="text-sm">Procedimiento Aduanero e IVA (Hacienda CR)</CardTitle>
            </div>
            <CardDescription className="text-[11px] text-slate-400">
              Aforo tributario bajo aranceles de importación formal y Courier.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3 text-[11px] text-slate-300 leading-relaxed">
            <p>
              Todo artículo importado a Costa Rica está sujeto a aforos arancelarios calculados sobre el valor <strong>CIF (Cost, Insurance & Freight)</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-1">
              <li><strong>FOB (Free On Board):</strong> Valor comercial neto del producto.</li>
              <li><strong>CIF Base:</strong> FOB + Seguro Obligatorio (1.5%) + Flete Internacional.</li>
              <li><strong>Impuesto DAI:</strong> Derecho Arancelario a la Importación variable (0% a 36.77% por categoría).</li>
              <li><strong>IVA:</strong> Impuesto al Valor Agregado del 13% (o 1% en libros) aplicable sobre la sumatoria de <code className="text-brand-cyan">CIF + DAI</code>.</li>
            </ul>
            <p className="text-slate-400">
              BreezeGo realiza el pago directo de aranceles al fisco para agilizar el levante de carga y emite la respectiva factura fiscal desglosada.
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Personal Shopper & Comisiones */}
        <Card className="border-white/5">
          <CardHeader className="bg-brand-teal/5 border-b border-white/5 rounded-t-2xl">
            <div className="flex items-center space-x-2 text-brand-teal">
              <DollarSign className="h-5 w-5" />
              <CardTitle className="text-sm">Servicio de Personal Shopper</CardTitle>
            </div>
            <CardDescription className="text-[11px] text-slate-400">
              Términos de compra por comisión para resguardo de identidad.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3 text-[11px] text-slate-300 leading-relaxed">
            <p>
              Al activar la opción de <strong>Personal Shopper</strong>, BreezeGo realiza la transacción comercial directa en tiendas norteamericanas o asiáticas a nombre del cliente:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-1">
              <li>Se aplica una comisión del <strong>5% del valor FOB de compra</strong> con un cobro mínimo fijo de <strong>$5.00 USD</strong>.</li>
              <li>El cliente proporciona el link del artículo y especificaciones (color, talla).</li>
              <li>BreezeGo no asume responsabilidad por garantías del fabricante ni devoluciones de mercadería errónea enviada por el vendedor externo.</li>
              <li>El pago del valor FOB + comisión de compra debe realizarse previo al pedido en Miami mediante transferencia bancaria autorizada.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Card 5: Pre-alerta obligatoria */}
        <Card className="border-white/5">
          <CardHeader className="bg-brand-orange/5 border-b border-white/5 rounded-t-2xl">
            <div className="flex items-center space-x-2 text-brand-orange">
              <FileText className="h-5 w-5" />
              <CardTitle className="text-sm">Pre-alerta Obligatoria</CardTitle>
            </div>
            <CardDescription className="text-[11px] text-slate-400">
              Requisitos de pre-alerta para envíos y productos regulados.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3 text-[11px] text-slate-300 leading-relaxed">
            <p>
              Todo envío que contenga productos regulados deberá ser pre-alertado correctamente, incluyendo de forma obligatoria:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-1">
              <li>Descripción detallada del contenido.</li>
              <li>Factura comercial de compra original.</li>
              <li>Indicación clara de la presencia de baterías o químicos.</li>
              <li>Hoja de seguridad <strong>SDS (Safety Data Sheet)</strong> cuando aplique.</li>
            </ul>
            <p className="text-brand-orange/90 font-semibold bg-brand-orange/5 p-2.5 rounded-xl border border-brand-orange/10 mt-2">
              ⚠️ El incumplimiento de la pre-alerta correcta puede generar retrasos significativos, cargos administrativos adicionales o la retención definitiva del envío por las autoridades competentes.
            </p>
          </CardContent>
        </Card>

        {/* Card 6: Exoneración de responsabilidad */}
        <Card className="border-white/5 md:col-span-2">
          <CardHeader className="bg-brand-orange/5 border-b border-white/5 rounded-t-2xl">
            <div className="flex items-center space-x-2 text-brand-orange">
              <Scale className="h-5 w-5" />
              <CardTitle className="text-sm">Exoneración de Responsabilidad</CardTitle>
            </div>
            <CardDescription className="text-[11px] text-slate-400">
              Límites de responsabilidad civil y fiscal del servicio de Courier.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3 text-[11px] text-slate-300 leading-relaxed">
            <p>
              BreezeGo opera estrictamente como transportista logístico y consolidador de carga. Por consiguiente, se exonera de toda responsabilidad por:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-1">
              <li>Retenciones, demoras o decomisos de mercancías en las aduanas de Costa Rica derivados de información incorrecta, incompleta o inexacta provista por el cliente.</li>
              <li>Multas, penalidades o sanciones fiscales dictadas por el Ministerio de Hacienda debido a facturas comerciales subvaloradas, adulteradas o descripciones de mercadería incorrectas suministradas por el importador.</li>
              <li>Daños, perjuicios o pérdidas de cualquier índole derivados de la importación de carga peligrosa, restringida o prohibida sin la debida declaración o permisos locales correspondientes.</li>
            </ul>
            <p className="text-slate-400">
              Es deber exclusivo de cada cliente verificar que sus proveedores envíen mercancía declarada correctamente y con documentación verídica.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SLA Accordion / Standard warning note */}
      <div className="p-5 rounded-2xl border border-white/5 bg-[#090d16] flex gap-4 text-xs leading-normal">
        <BadgeHelp className="h-6 w-6 text-brand-cyan shrink-0" />
        <div>
          <strong className="text-white block font-bold mb-1">¿Necesita asistencia especial con sus trámites aduanales?</strong>
          <p className="text-slate-400">
            Nuestros agentes de aforo están disponibles para cotizar exenciones arancelarias especiales (por ejemplo para diplomáticos, cooperativas, o bajo el régimen de importación temporal). Póngase en contacto a través del panel de notificaciones o enviando un pre-alerta formal indicando su necesidad.
          </p>
        </div>
      </div>
    </div>
  );
}
