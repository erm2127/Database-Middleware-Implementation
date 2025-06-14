## Google Gemini AI chatbot v.2025 API
import google.generativeai as genai
import os

# Load API key from environment variable for security
API_KEY = os.getenv("GOOGLE_API_KEY", "AIzaSyBaDmWWU2wmm2w1h_PNSWDfX5AaOwtAz2E")

# Load API key from environment variable for security
API_KEY = os.getenv("GOOGLE_API_KEY")
# Ensure API key exists before running
if not API_KEY:
    raise ValueError("Missing API key! Set GOOGLE_API_KEY as an environment variable.")

# Configure the API key
genai.configure(api_key=API_KEY)

def main():
    # Create a GenerativeModel instance
    model = genai.GenerativeModel("gemini-1.5-flash")  # Use a valid model name

    print("Welcome to the Gemini AI Chatbot! Type 'exit' to quit.")

    while True:
        try:
        user_input = input("You: ")
        if user_input.lower() == "exit":
            print("AI chatbot: Goodbye")
            break
            # Store user input in history (Optional)
            conversation_history.append(f"You: {user_input}")

            # Generate content
            response = model.generate_content(user_input)

            # Added: Check if response exists before accessing `.text`
            if response and hasattr(response, "text"):
                print(f"\nAI chatbot: {response.text}")
                conversation_history.append(f"AI chatbot: {response.text}")  # Store response
            else:
                print("\nAI chatbot: Error: No response received.")

        except genai.exceptions.AuthenticationError:
            print("\nAI chatbot: Error: Invalid API Key!")
            break  # Exit loop on authentication failure
        except genai.exceptions.RateLimitError:
            print("\nAI chatbot: Error: Too many requests. Please wait.")
        except Exception as e:
            print(f"\nAI chatbot: Unexpected error: {str(e)}")
        try:
            # Generate content
            response = model.generate_content(user_input)
            print(f"\nAI chatbot: {response.text}")
        except Exception as e:
            print(f"\nAI chatbot: Error: {str(e)}")

if __name__ == "__main__":
    main()
