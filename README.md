# Stock Dashboard

This is a stock dashboard application that allows you to view stock data. It uses React for the frontend and a Python serverless function for the backend, designed for deployment on Vercel.

## How to Run Locally

### Backend

The backend is a serverless function and will be served by the Vercel CLI during local development.

### Frontend

1.  **Install the Vercel CLI:**
    ```bash
    npm i -g vercel
    ```

2.  **Install the project dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    vercel dev
    ```
    This command will start both the frontend and the backend serverless function. The application will be available at `http://localhost:3000`.

## Deployment to Vercel

To deploy the application to Vercel, follow these steps:

1.  **Push your code to a Git repository** (e.g., GitHub, GitLab, Bitbucket).

2.  **Import your project into Vercel.**
    - Sign up for a Vercel account and connect it to your Git provider.
    - From the Vercel dashboard, click "Add New... > Project" and select your repository.

3.  **Configure the project.**
    - Vercel should automatically detect that you are using Vite.
    - The build command and output directory will be configured automatically.
    - The serverless function in the `api` directory will also be detected and deployed.

4.  **Deploy.**
    - Click the "Deploy" button. Vercel will build and deploy your application.

## How it Works

- The frontend is a React application created with Vite.
- The backend is a Python serverless function that uses Flask and `pykrx` to fetch stock data.
- The `vercel.json` file configures the build and routing for the project on Vercel.
- When you select a stock in the frontend, it makes an API call to the serverless function.
- The serverless function then fetches the latest stock data and returns it to the frontend.
