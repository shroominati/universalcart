import http from "node:http";

const port = parseInt(process.env.EXTENSION_FIXTURE_PORT || "4173", 10);

function pageTemplate({ title, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin: 0;
        background: #111827;
        color: #f9fafb;
      }
      main {
        max-width: 1100px;
        margin: 0 auto;
        padding: 32px;
      }
      .hero {
        display: grid;
        grid-template-columns: 1fr 420px;
        gap: 24px;
      }
      .card,
      .dialog {
        background: #1f2937;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        padding: 24px;
      }
      .gallery {
        width: 100%;
        height: 280px;
        object-fit: cover;
        border-radius: 16px;
        background: #374151;
      }
      .merchant-link {
        display: inline-flex;
        margin-top: 16px;
        color: #93c5fd;
        font-weight: 600;
        text-decoration: none;
      }
      .price {
        font-size: 32px;
        font-weight: 800;
        color: #c4b5fd;
        margin-top: 12px;
      }
      .chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 24px;
      }
      .chip {
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        padding: 6px 10px;
        font-size: 12px;
      }
      .visually-noisy {
        font-size: 34px;
        font-weight: 700;
        margin-bottom: 16px;
      }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

function renderGoogleShoppingPage({ productName, price, merchantName, merchantHost, imageUrl }) {
  return pageTemplate({
    title: `${productName} - Google Shopping`,
    body: `
      <main>
        <div class="chips">
          <span class="chip">Google Shopping</span>
          <span class="chip">Deals</span>
          <span class="chip">In stock</span>
        </div>
        <h1 class="visually-noisy">Accessibility Links</h1>
        <div class="hero">
          <section class="card">
            <h2>Browse products</h2>
            <p>Shopping results for ${productName}</p>
          </section>
          <div class="dialog" role="dialog" aria-label="product quick view">
            <img class="gallery" src="${imageUrl}" alt="${productName}">
            <div role="heading" aria-level="2">${productName}</div>
            <span class="price">$${price.toFixed(2)}</span>
            <p>Top rated offer and fast shipping.</p>
            <a class="merchant-link" href="http://${merchantHost}:${port}/merchant/product">
              ${merchantName}
            </a>
          </div>
        </div>
      </main>`,
  });
}

const routes = {
  "/health": () => ({ status: 200, contentType: "text/plain", body: "ok" }),
  "/google-shopping-switch.html": () => ({
    status: 200,
    contentType: "text/html",
    body: renderGoogleShoppingPage({
      productName: "Nintendo Switch 2 Mario Kart Bundle",
      price: 499.99,
      merchantName: "Target",
      merchantHost: "target.com",
      imageUrl: "https://picsum.photos/seed/switch/720/540",
    }),
  }),
  "/google-shopping-monitor.html": () => ({
    status: 200,
    contentType: "text/html",
    body: renderGoogleShoppingPage({
      productName: "Portable Gaming Monitor 15.6",
      price: 159.99,
      merchantName: "Target",
      merchantHost: "target.com",
      imageUrl: "https://picsum.photos/seed/monitor/720/540",
    }),
  }),
  "/merchant/product": () => ({
    status: 200,
    contentType: "text/html",
    body: pageTemplate({
      title: "Merchant product",
      body: `
        <main>
          <section class="card">
            <h1>Merchant Product</h1>
            <p>This route exists so merchant links resolve during tests.</p>
          </section>
        </main>`,
    }),
  }),
};

const server = http.createServer((req, res) => {
  const route = routes[req.url];
  if (!route) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
    return;
  }

  const { status, contentType, body } = route();
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`extension fixture server listening on ${port}`);
});
