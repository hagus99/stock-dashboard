# Stock Dashboard

This is a stock dashboard application that allows you to view stock data. It uses React for the frontend and Flask for the backend.

## How to Run

There are two parts to this application: the frontend and the backend. You need to run both for the application to work.

### Backend

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install the Python dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the backend server:**
    ```bash
    python app.py
    ```
    The backend server will start on `http://127.0.0.1:5001`.

### Frontend

1.  **Navigate to the project root directory.**

2.  **Install the JavaScript dependencies:**
    ```bash
    npm install
    ```

3.  **Run the frontend development server:**
    ```bash
    npm run dev
    ```
    The frontend will be available at `http://localhost:5173`.

## How it Works

- The frontend is a React application created with Vite.
- The backend is a Flask server that provides an API to fetch stock data.
- When you select a stock in the frontend, it makes an API call to the backend.
- The backend then uses the `pykrx` library to fetch the latest stock data and returns it to the frontend.
