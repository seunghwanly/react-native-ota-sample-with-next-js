import { NextResponse } from "next/server";

export async function GET() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            background: #000000;
            font-family: sans-serif;
            padding: 24px;
          }

          h1 {
            color: #635bff;
          }
        </style>
      </head>
      <body>
        <h1 id="title">Loading...</h1>

        <script>
          document.getElementById('title').textContent =
            'Hello from Next.js Bundle! This is the home screen.';
        </script>
      </body>
    </html>
  `;

  return NextResponse.json({
    version: "1.0.0",
    html,
  });
}
