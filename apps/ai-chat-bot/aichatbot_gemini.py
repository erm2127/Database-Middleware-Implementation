## Google Gemini AI chatbot v.2025 API
import google.generativeai as genai
import os

# Load API key from environment variable for security
API_KEY = os.getenv("GOOGLE_API_KEY", "AIzaSyBaDmWWU2wmm2w1h_PNSWDfX5AaOwtAz2E") 

# Configure the API key
genai.configure(api_key=API_KEY)

def main():
    # Create a GenerativeModel instance
    model = genai.GenerativeModel("gemini-1.5-flash")  # Use a valid model name

    print("Welcome to the Gemini AI Chatbot! Type 'exit' to quit.")

    while True:
        user_input = input("You: ")
        if user_input.lower() == "exit":
            print("AI chatbot: Goodbye")
            break
        try:
            # Generate content
            response = model.generate_content(user_input)
            print(f"\nAI chatbot: {response.text}")
        except Exception as e:
            print(f"\nAI chatbot: Error: {str(e)}")

if __name__ == "__main__":
    main()
