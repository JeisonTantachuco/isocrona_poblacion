import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Función obtener-isocrona iniciada!")

// DEFINIMOS LOS ENCABEZADOS DE SEGURIDAD AQUÍ MISMO
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Manejar CORS (Para que el navegador no bloquee la petición)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Leer datos del frontend
    const { lat, lng, time_minutes } = await req.json()

    // 3. Obtener API Key (Asegúrate de haber ejecutado 'supabase secrets set' antes)
    const ORS_API_KEY = Deno.env.get('ORS_API_KEY')
    if (!ORS_API_KEY) throw new Error('Falta la API Key de ORS en los secretos')

    // 4. Llamar a OpenRouteService
    const orsResponse = await fetch('https://api.openrouteservice.org/v2/isochrones/driving-car', {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locations: [[lng, lat]],
        range: [time_minutes * 60],
        attributes: ["total_pop"]
      })
    })

    const orsData = await orsResponse.json()

    if (!orsData.features || orsData.features.length === 0) {
      throw new Error('OpenRouteService no devolvió isocronas. Verifica las coordenadas.')
    }

    const geometry = orsData.features[0].geometry

    // 5. Conectar con Supabase DB
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // 6. Ejecutar la función SQL
    const { data: dbData, error: dbError } = await supabase
      .rpc('calcular_poblacion_isocrona', { 
        isochrone_geojson: geometry 
      })

    if (dbError) {
        console.error("Error SQL:", dbError)
        throw new Error("Error calculando población en DB: " + dbError.message)
    }

    // 7. Responder con éxito
    return new Response(
      JSON.stringify({ 
        poblacion: dbData.poblacion_total, // Asegúrate que tu función SQL devuelve este campo
        geojson: geometry 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})