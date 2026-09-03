// Correr con: deno test supabase/functions/_shared/whatsapp/getWhatsAppProvider.test.ts
import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getWhatsAppProvider } from "./getWhatsAppProvider.ts";
import { MockWhatsAppProvider } from "./MockWhatsAppProvider.ts";

Deno.test("mock (default) devuelve MockWhatsAppProvider", () => {
  Deno.env.delete("WHATSAPP_PROVIDER");
  assertEquals(getWhatsAppProvider(), MockWhatsAppProvider);
});

Deno.test("meta/twilio/ultramsg lanzan 'aun no implementado'", () => {
  for (const provider of ["meta", "twilio", "ultramsg"]) {
    Deno.env.set("WHATSAPP_PROVIDER", provider);
    assertThrows(() => getWhatsAppProvider(), Error, "aun no implementado");
  }
  Deno.env.delete("WHATSAPP_PROVIDER");
});

Deno.test("provider desconocido lanza error", () => {
  Deno.env.set("WHATSAPP_PROVIDER", "carrier-pigeon");
  assertThrows(() => getWhatsAppProvider(), Error, "desconocido");
  Deno.env.delete("WHATSAPP_PROVIDER");
});

Deno.test("MockWhatsAppProvider.sendMessage siempre success:true", async () => {
  const result = await MockWhatsAppProvider.sendMessage({
    to: "+525500000000",
    templateName: "class_reminder",
    variables: { className: "Pilates" },
  });
  assertEquals(result.success, true);
});
