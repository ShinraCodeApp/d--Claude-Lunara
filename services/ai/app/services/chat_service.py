"""Lunara AI Health Chat Service — GPT-4o powered women's health assistant"""
import json
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

client = AsyncOpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """Eres Luna, la asistente de salud femenina de Lunara by ShinraCode.

Tu especialidad es la salud femenina: ciclos menstruales, ovulación, fertilidad, síntomas hormonales, bienestar femenino y salud reproductiva general.

REGLAS ABSOLUTAS:
1. SIEMPRE incluye al final de cada respuesta relacionada con salud:
   "⚕️ Esta información es educativa y no reemplaza la consulta médica profesional. Consulta a tu ginecóloga o médica de confianza."
2. NUNCA diagnostiques enfermedades específicas.
3. NUNCA recetes medicamentos ni suplementos específicos.
4. Responde en español con tono cercano, empático y profesional.
5. Si preguntan sobre embarazo de riesgo, sangrado severo, dolor intenso o emergencias, recomienda atención médica inmediata.
6. Mantén la privacidad — nunca pidas datos innecesarios.

PERSONALIDAD:
- Cálida y empática
- Profesional pero accesible
- Usa lenguaje inclusivo y respetuoso
- Celebra los logros de salud de la usuaria
- Ofrece información basada en evidencia científica

CONTEXTO DEL CICLO:
Si la usuaria comparte datos de su ciclo, úsalos para dar respuestas más personalizadas sobre:
- En qué fase se encuentra
- Síntomas esperados para esa fase
- Consejos de bienestar específicos a la fase
- Predicciones sobre cómo puede sentirse próximamente
"""

CYCLE_CONTEXT_TEMPLATE = """
DATOS DEL CICLO DE LA USUARIA (contexto para personalizar respuestas):
- Día del ciclo actual: {day_of_cycle}
- Fase actual: {phase}
- Duración promedio del ciclo: {avg_cycle_length} días
- Próxima menstruación predicha: {next_period}
- Próxima ovulación predicha: {next_ovulation}
"""


class ChatService:
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def generate_response(
        self,
        messages: list[dict],
        cycle_context: dict | None = None,
        is_premium: bool = False,
    ) -> dict:
        """Generate AI response for women's health chat"""

        system_message = SYSTEM_PROMPT
        if cycle_context:
            system_message += CYCLE_CONTEXT_TEMPLATE.format(**cycle_context)

        openai_messages = [
            {"role": "system", "content": system_message},
            *messages,
        ]

        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=openai_messages,
            max_tokens=800 if not is_premium else 1500,
            temperature=0.7,
            presence_penalty=0.3,
            frequency_penalty=0.3,
        )

        content = response.choices[0].message.content
        tokens_used = response.usage.total_tokens if response.usage else 0

        # Ensure disclaimer is always present
        if "no reemplaza la consulta médica" not in (content or ""):
            content = (content or "") + "\n\n⚕️ Esta información es educativa y no reemplaza la consulta médica profesional."

        return {
            "content": content,
            "tokens": tokens_used,
            "model": settings.openai_model,
        }

    async def analyze_cycle_patterns(self, cycles_data: list[dict]) -> dict:
        """Analyze cycle patterns and generate insights"""

        if len(cycles_data) < 2:
            return {
                "insight": "Necesitamos al menos 2 ciclos registrados para generar análisis de patrones.",
                "recommendations": [],
            }

        prompt = f"""Analiza los siguientes datos de ciclos menstruales y genera insights personalizados:

Datos de ciclos: {json.dumps(cycles_data, ensure_ascii=False, default=str)}

Genera:
1. Un insight principal sobre los patrones del ciclo (máximo 2 oraciones)
2. 3 recomendaciones personalizadas de bienestar
3. Indicadores de regularidad

Responde en JSON con la estructura:
{{
  "insight": "...",
  "regularityScore": 0-100,
  "recommendations": ["rec1", "rec2", "rec3"],
  "flags": [] // Menciona si hay algo que consultar con un médico
}}"""

        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=600,
            temperature=0.5,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content
        result = json.loads(content or "{}")

        # Always append disclaimer
        if result.get("recommendations"):
            result["disclaimer"] = "Esta información es educativa. Consulta a tu médica para orientación personalizada."

        return result

    async def generate_monthly_insight(self, monthly_data: dict) -> str:
        """Generate natural language monthly summary"""

        prompt = f"""Genera un resumen mensual amigable para una app de salud femenina basado en:
{json.dumps(monthly_data, ensure_ascii=False, default=str)}

El resumen debe ser:
- 3-4 oraciones
- Tono positivo y empático
- Mencionar logros (racha, registros completados)
- Dar un consejo para el próximo mes
- En español"""

        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=250,
            temperature=0.8,
        )

        return response.choices[0].message.content or ""


chat_service = ChatService()
