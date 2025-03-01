# Metakit.ai

![Metakit.ai](https://i.imgur.com/placeholder.png)

## Overview

Metakit.ai is a powerful tool designed to optimize your website's meta titles and descriptions for better SEO performance. Built with React, TypeScript, and Supabase, this application helps content creators and SEO professionals enhance their metadata quickly and efficiently.

## Features

- **CSV Upload**: Easily upload your CSV files containing meta titles and descriptions
- **AI-Powered Enhancement**: Automatically optimize meta content for better SEO performance
- **Character Limit Detection**: Identify titles and descriptions that exceed recommended character limits
- **Missing Content Filling**: Generate appropriate content for missing meta fields
- **User Authentication**: Secure login and signup functionality
- **Subscription Management**: Free tier with basic features and premium subscription options
- **Usage Tracking**: Monitor your usage within the free tier limits
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Framer Motion
- **Backend**: Supabase (Authentication, Database)
- **Payment Processing**: Stripe
- **Build Tool**: Vite
- **Deployment**: Netlify/Vercel

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/LelantVaris/ai-meta-data-enhancer.git
   cd ai-meta-data-enhancer
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Usage

1. **Upload CSV**: Click on the upload area to select your CSV file containing meta titles and descriptions
2. **Select Columns**: Identify which columns contain your titles and descriptions
3. **Enhance**: Click the "Enhance" button to process your data
4. **Review Results**: View and edit the enhanced meta content
5. **Download**: Export the optimized data as a CSV file

## Subscription Plans

- **Free Tier**: Process up to 50 entries per use, with a limit of 2 uses per month
- **Premium**: $4.99/month for unlimited uses and up to 500 entries per use

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For any questions or support, please contact [juliankreth@karmastudio.co](mailto:juliankreth@karmastudio.co).

---

Built with ❤️ by [Karma Studio](https://karmastudio.co)
