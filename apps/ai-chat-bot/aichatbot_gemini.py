# google Gemini AI chatbot v.2025 API
from google import genai

API_KEY = "AIzaSyBaDmWWU2wmm2w1h_PNSWDfX5AaOwtAz2E"

client = genai.client(api_key=API_KEY)

while True:
    userInput = input("you: ")
    if userInput.lower() == "exit":
        print("Ai chatbot : Goodbye")
        break
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=userInput
    )
    print(f"\nAI chatbot: {response.text}")
