const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/consulta', async (req, res) => {
  const { documento } = req.body;

  if (!documento) {
    return res.status(400).json({ error: 'Documento não fornecido' });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://processual.trf1.jus.br/consultaProcessual/cpfCnpjParte.php?secao=GO');

    await page.type('input[name="txPesquisaDocumento"]', documento);
    await Promise.all([
      page.click('input[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    const processos = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.tabela-processos tbody tr')];
      return rows.map(row => {
        const cols = row.querySelectorAll('td');
        return {
          processo: cols[0]?.innerText.trim(),
          classe: cols[1]?.innerText.trim(),
          dataDistribuicao: cols[2]?.innerText.trim()
        };
      });
    });

    await browser.close();

    if (!processos.length) {
      return res.status(200).json({ status: 'sem_resultado' });
    }

    return res.status(200).json({
      status: 'encontrado',
      total: processos.length,
      processos
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao consultar TRF1' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
