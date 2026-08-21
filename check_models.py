from google import genai

client = genai.Client(api_key="AIzaSyB3_JLB52FCY4P6YWe4Pprq0ycTq-6SARg")

response = client.models.generate_content(
    model="gemini-2.5-flash-lite",
    contents="Explain AI in one sentence."
)

print(response.text)