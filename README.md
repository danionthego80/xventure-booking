# XVenture Booking Form

A customer-facing session booking form for XVenture that allows clients to:
- Select a session title, company name, date/time, and theme
- - Pay securely via Stripe (AUD, incl. GST)
  - - Have their session automatically created in the XVenture admin backend
    - - Receive automated confirmation and reminder emails
      -
      - ## Tech Stack
      - - **Next.js** — front-end form + serverless API functions
        - - **Supabase** — theme configuration store + bookings log
          - - **Stripe** — payment processing
            - - **Vercel** — hosting and deployment
              - - **Resend** — transactional emails
                -
                - ## Project Structure
                - ```
                  xventure-booking/
                  ├── app/                  # Next.js front-end (customer form)
                  ├── api/                  # Serverless bridge functions
                  │   ├── get-themes.ts     # Returns active themes from Supabase
                  │   ├── validate-slug.ts  # Checks dynamic URL uniqueness
                  │   ├── create-payment-intent.ts  # Creates Stripe PaymentIntent
                  │   ├── create-session.ts # Creates session in XVenture backend
                  │   └── stripe-webhook.ts # Handles Stripe payment confirmation
                  ├── lib/                  # Shared utilities
                  │   ├── supabase.ts
                  │   ├── xventure.ts
                  │   └── utils.ts
                  ├── .env.example          # Environment variable template
                  └── README.md
                  ```

                  ## Setup
                  1. Clone this repository
                  2. 2. Copy `.env.example` to `.env.local` and fill in your values
                     3. 3. Run `npm install`
                        4. 4. Run `npm run dev` to start locally
                           5.
                           6. > **Never commit `.env.local` to GitHub.**
                              >
                              > ## Environment Variables
                              > See `.env.example` for the full list. Values are entered directly
                              > into the Vercel dashboard — never stored in code.
                              >
                              > ## Build Sessions
                              > This project was built across 6 development sessions:
                              > 1. Infrastructure setup (GitHub, Supabase, Vercel)
                              > 2. 2. Bridge server API functions
                              >    3. 3. Customer-facing form
                              >       4. 4. Stripe webhooks and payment security
                              >          5. 5. Email automation
                              >             6. 6. Testing and go-livexventure-booking
Customer-facing session booking form for XVenture — connects to Supabase, Stripe, and the XVenture admin backend.
