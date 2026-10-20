# Extrator de Pernoite & Telemetria

Aplicação para extração automática de dados de pernoite e monitoramento de frota a partir de capturas de tela (prints) ou texto bruto de telemetria, com normalização de placas (ex: `5A80-HBG` para `HBG-5A80`), detecção visual de status de carga e exportação formatada para o Excel.

## 🚀 Como Publicar na Vercel (Passo a Passo)

### 1. Requisitos
- Uma conta no [GitHub](https://github.com)
- Uma conta na [Vercel](https://vercel.com) (login gratuito com GitHub)
- Uma chave de API do Google Gemini (gratuita no [Google AI Studio](https://aistudio.google.com/app/apikey))

### 2. Subir o Código para o GitHub
Se você ainda não enviou os arquivos para um repositório no seu GitHub:
```bash
git init
git add .
git commit -m "feat: extrator de telemetria e pernoite pronto para vercel"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

*(Ou você pode simplesmente clicar no botão de exportar/sincronizar com GitHub no AI Studio).*

### 3. Importar na Vercel
1. Acesse o painel da [Vercel](https://vercel.com/new).
2. Clique em **"Add New..."** > **"Project"**.
3. Selecione o repositório que você criou no GitHub.
4. As configurações padrão já estão pré-configuradas pelo arquivo `vercel.json`:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `vite build`
   - **Output Directory**: `dist`
5. Na seção **"Environment Variables"** (Variáveis de Ambiente), adicione:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Cole a sua chave gerada no Google AI Studio (ex: `AIzaSy...`).
6. Clique no botão azul **"Deploy"**.

---

## 💻 Como Rodar Localmente

1. Clone o repositório:
```bash
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
cd seu-repositorio
```

2. Instale as dependências:
```bash
npm install
```

3. Crie um arquivo `.env` na raiz:
```env
GEMINI_API_KEY="sua_chave_aqui"
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```
Acesse no navegador: `http://localhost:3000`

---

## 📁 Estrutura do Projeto
- `/src`: Interface em React 19 + Tailwind CSS + Lucide Icons.
- `/api/extract.ts`: Serverless Function da Vercel para processar imagens e texto com Gemini AI.
- `server.ts`: Servidor Node Express local para desenvolvimento e testes.
- `vercel.json`: Configurações de build e roteamento para deploy na Vercel.
