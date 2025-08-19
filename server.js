import 'dotenv/config';
import express from "express";
const app = express();

const PORT = process.env.PORT || 3001;
const EMAIL = process.env.CONFLUENCE_EMAIL;
const API_TOKEN = process.env.CONFLUENCE_API_TOKEN;
const SPACE_KEY = process.env.CONFLUENCE_SPACE_KEY || "proxytest";

if (!EMAIL || !API_TOKEN) {
  console.error('Brak CONFLUENCE_EMAIL lub CONFLUENCE_API_TOKEN w zmiennych środowiskowych.');
  process.exit(1);
}

// Dodaj CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Udostępniaj pliki statyczne z bieżącego folderu
app.use(express.static("."));
app.get("/", (req, res) => res.redirect("/start.html"));

app.get("/pages", async (req, res) => {
  const url = `https://commhaven.atlassian.net/wiki/rest/api/space/${SPACE_KEY}/content/page?limit=50`;

  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": "Basic " + Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64"),
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Błąd odpowiedzi z Confluence:", response.status, text);
      return res.status(response.status).send({ error: "Błąd pobierania danych z Confluence", details: text });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Błąd połączenia z Confluence:", err);
    res.status(500).send({ error: "Błąd połączenia z Confluence", details: err.message });
  }
});

// Dodaj nowy endpoint do pobierania treści strony
app.get("/page/:id", async (req, res) => {
  const pageId = req.params.id;
  const url = `https://commhaven.atlassian.net/wiki/rest/api/content/${pageId}?expand=body.view`;
  
  console.log(`Pobieranie strony o ID: ${pageId}`);
  console.log(`URL: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": "Basic " + Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64"),
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Błąd odpowiedzi z Confluence: ${response.status} ${response.statusText}`);
      console.error(`Treść błędu: ${text}`);
      return res.status(response.status).send({ error: "Błąd pobierania danych z Confluence", details: text });
    }

    const data = await response.json();
    
    // Sprawdź, czy struktura danych jest prawidłowa
    if (!data.body || !data.body.view || !data.body.view.value) {
      console.error("Nieprawidłowa struktura danych:", JSON.stringify(data));
      return res.status(500).send({ 
        error: "Nieprawidłowa struktura danych z Confluence", 
        details: "Brak body.view.value w odpowiedzi"
      });
    }
    
    console.log("Strona pobrana pomyślnie");
    res.json(data);
  } catch (err) {
    console.error("Błąd połączenia z Confluence:", err);
    res.status(500).send({ error: "Błąd połączenia z Confluence", details: err.message });
  }
});

// Dodaj endpoint do pobierania CSS z Confluence (opcjonalnie)
app.get("/confluence-styles.css", async (req, res) => {
  const url = `https://commhaven.atlassian.net/wiki/s/d41d8cd98f00b204e9800998ecf8427e-CDN/en_GB/7901/5df78f394d050d6d162f939902a242799d42e5a9/_/download/resources/com.atlassian.confluence.themes.default:styles/site.css`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).send("/* Error fetching Confluence CSS */");
    }
    
    const cssText = await response.text();
    res.header('Content-Type', 'text/css');
    res.send(cssText);
  } catch (err) {
    console.error("Błąd pobierania CSS:", err);
    res.status(500).send("/* Error */");
  }
});

// Endpoint do sprawdzania stanu aplikacji
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});
app.get('/', (req, res) => {
  res.redirect('/start.html');
});  
app.listen(PORT, () => {
  console.log(`Server działa na http://localhost:${PORT}`);
});