import google.generativeai as genai
import os

# Load API key from environment variable
API_KEY = os.getenv("GOOGLE_API_KEY")
if not API_KEY:
    raise ValueError("Missing API key! Set GOOGLE_API_KEY as an environment variable.")

# Configure the API key
genai.configure(api_key=API_KEY)

def main():
    model = genai.GenerativeModel("gemini-1.5-flash")
    print("Welcome to the Gemini AI Chatbot! Type 'exit' to quit.\n")

    conversation_history = []

    while True:
        try:
            user_input = input("You: ")
            if user_input.lower() == "exit":
                print("AI chatbot: Goodbye!")
                break

            conversation_history.append(f"You: {user_input}")

            response = model.generate_content(user_input)
            if response and hasattr(response, "text"):
                print(f"\nAI chatbot: {response.text}\n")
                conversation_history.append(f"AI chatbot: {response.text}")
            else:
                print("\nAI chatbot: Error: No response received.\n")

        except genai.exceptions.AuthenticationError:
            print("\nAI chatbot: Error: Invalid API Key!\n")
            break
        except genai.exceptions.RateLimitError:
            print("\nAI chatbot: Error: Too many requests. Please wait.\n")
        except Exception as e:
            print(f"\nAI chatbot: Unexpected error: {str(e)}\n")

if __name__ == "__main__":
    main()

