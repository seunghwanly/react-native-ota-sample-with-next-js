// 앱이 WebView로 렌더링할 화면 HTML을 버전과 함께 내려준다.
// 화면 내용을 바꿀 땐 version을 올려야 앱이 새로 저장한다.
const screens: Record<string, { version: string; html: string }> = {
  home: {
    version: "1.0.0",
    html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: -apple-system, sans-serif; margin: 0; padding: 24px; }
      h1 { font-size: 24px; }
    </style>
  </head>
  <body>
    <h1>Home v1.0.0</h1>
    <p>OTA로 내려받은 화면이에요.</p>
  </body>
</html>`,
  },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ screen: string }> },
) {
  const { screen } = await params;
  const data = screens[screen];

  if (!data) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(data);
}
